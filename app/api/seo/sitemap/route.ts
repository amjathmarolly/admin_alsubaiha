// Public sitemap source for the website. ?format=xml returns a ready sitemap.xml.
// Admin view (?admin=1) additionally returns excluded/noindex entries with flags.
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/integration-token"
import { listAllEntries } from "@/lib/seo-entries"
import { getSettings, siteUrl, xmlEscape } from "@/lib/seo-tools"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const admin = request.nextUrl.searchParams.get("admin") === "1"
  if (admin) {
    const denied = await requireAdmin()
    if (denied) return denied
  }
  try {
    const [entries, settings] = await Promise.all([listAllEntries(), getSettings()])
    const excluded = new Set(settings.sitemapExclude)
    const all = entries.map((e) => ({
      type: e.type,
      label: e.label,
      path: e.path,
      noindex: Boolean(e.seo?.noindex),
      excluded: excluded.has(e.path),
    }))
    if (admin) return NextResponse.json({ urls: all })

    const base = (settings.org.url || siteUrl()).replace(/\/$/, "")
    const urls = all.filter((u) => !u.noindex && !u.excluded).map((u) => `${base}${u.path === "/" ? "" : u.path}` || base)
    if (request.nextUrl.searchParams.get("format") === "xml") {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((u) => `  <url><loc>${xmlEscape(u === base ? base + "/" : u)}</loc></url>`)
        .join("\n")}\n</urlset>\n`
      return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } })
    }
    return NextResponse.json({ urls })
  } catch (error) {
    console.error("GET /api/seo/sitemap error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to build sitemap" }, { status: 500 })
  }
}
