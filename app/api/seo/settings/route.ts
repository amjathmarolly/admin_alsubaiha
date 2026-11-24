// Admin read/write of site-wide SEO settings (robots, sitemap exclusions, organization, tracking).
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/integration-token"
import { getSettings, saveSettings } from "@/lib/seo-tools"
import { revalidateWebsite } from "@/lib/seo"

export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  try {
    return NextResponse.json({ settings: await getSettings() })
  } catch (error) {
    console.error("GET /api/seo/settings error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  try {
    const settings = await saveSettings(body)
    const revalidated = await revalidateWebsite()
    return NextResponse.json({ ok: true, settings, revalidated })
  } catch (error) {
    console.error("PUT /api/seo/settings error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
