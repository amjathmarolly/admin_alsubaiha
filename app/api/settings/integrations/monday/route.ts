// Admin-facing management of the Monday.com token (Settings -> Security).
// The full token is never returned to the browser, only a masked form.
import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import {
  MONDAY_TOKEN_KEY,
  hasStaffSession,
  maskToken,
  readMondayToken,
} from "@/lib/integration-token"

export const dynamic = "force-dynamic"

const unauthorized = () => NextResponse.json({ error: "Not authenticated" }, { status: 401 })

export async function GET() {
  if (!(await hasStaffSession())) return unauthorized()
  try {
    const stored = await readMondayToken()
    return NextResponse.json({
      configured: Boolean(stored),
      masked: stored ? maskToken(stored.token) : null,
      updatedAt: stored?.updatedAt ?? null,
    })
  } catch (error) {
    console.error("GET /api/settings/integrations/monday error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to load integration settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!(await hasStaffSession())) return unauthorized()

  const body = await request.json().catch(() => null)
  const token = typeof body?.token === "string" ? body.token.trim() : ""
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 })
  }

  // Reject a bad token up front so a typo can't take the tracker down.
  try {
    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token, "API-Version": "2024-01" },
      body: JSON.stringify({ query: "{ me { id } }" }),
      signal: AbortSignal.timeout(10_000),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.data?.me?.id) {
      return NextResponse.json({ error: "Monday.com rejected this token" }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: "Could not reach Monday.com to verify the token" }, { status: 502 })
  }

  try {
    await query(
      `INSERT INTO store_settings (id, setting_key, setting_value, updated_at)
       VALUES (UUID(), ?, ?, NOW())
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
      [MONDAY_TOKEN_KEY, JSON.stringify(token)]
    )
    return NextResponse.json({ configured: true, masked: maskToken(token), updatedAt: new Date() })
  } catch (error) {
    console.error("PUT /api/settings/integrations/monday error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to save token" }, { status: 500 })
  }
}
