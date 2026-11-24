// Public bundle for the website: robots.txt, tracking IDs, active redirects, image alt text, organization.
import { NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"
import { ensureSeoToolTables, getSettings } from "@/lib/seo-tools"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await ensureSeoToolTables()
    const [settings, redirects, alts] = await Promise.all([
      getSettings(),
      query<(RowDataPacket & { from_path: string; to_path: string; status_code: number })[]>(
        "SELECT from_path, to_path, status_code FROM seo_redirects WHERE active = TRUE"
      ),
      query<(RowDataPacket & { image_url: string; alt_text: string })[]>("SELECT image_url, alt_text FROM seo_image_alt"),
    ])
    return NextResponse.json({
      robotsTxt: settings.robotsTxt,
      tracking: settings.tracking,
      org: settings.org,
      redirects: redirects.map((r) => ({ from: r.from_path, to: r.to_path, status: r.status_code })),
      imageAlt: Object.fromEntries(alts.map((a) => [a.image_url, a.alt_text])),
    })
  } catch (error) {
    console.error("GET /api/seo/site error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to load site SEO data" }, { status: 500 })
  }
}
