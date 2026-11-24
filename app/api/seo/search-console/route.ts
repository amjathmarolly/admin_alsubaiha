// Google Search Console performance data (admin only).
// Needs a service account that has been added as a user on the property in Search Console:
//   GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, GSC_SITE_URL (e.g. "sc-domain:alsubaiha.ae" or "https://alsubaiha.ae/")
import { NextRequest, NextResponse } from "next/server"
import { createSign } from "crypto"
import { requireAdmin } from "@/lib/integration-token"

export const dynamic = "force-dynamic"

const b64 = (v: string | Buffer) => Buffer.from(v).toString("base64url")

async function accessToken(email: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${b64(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  )}`
  const sig = createSign("RSA-SHA256").update(unsigned).sign(privateKey).toString("base64url")
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error(data.error_description || "Google auth failed")
  return data.access_token
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  const email = process.env.GSC_CLIENT_EMAIL
  const key = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n")
  const site = process.env.GSC_SITE_URL
  if (!email || !key || !site) return NextResponse.json({ configured: false })

  const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get("days")) || 28, 7), 90)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const end = new Date(Date.now() - 2 * 86400000) // Search Console data lags ~2 days
  const start = new Date(end.getTime() - days * 86400000)
  try {
    const token = await accessToken(email, key)
    const run = async (dimension: "page" | "query") => {
      const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), dimensions: [dimension], rowLimit: 25 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || "Search Console request failed")
      return (data.rows ?? []).map((r: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
        key: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
      }))
    }
    const [pages, queries] = await Promise.all([run("page"), run("query")])
    return NextResponse.json({ configured: true, range: { start: fmt(start), end: fmt(end) }, pages, queries })
  } catch (error) {
    return NextResponse.json({ configured: true, error: (error as Error).message }, { status: 502 })
  }
}
