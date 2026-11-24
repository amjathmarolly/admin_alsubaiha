// Alt-text manager for product images.
import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"
import { requireAdmin } from "@/lib/integration-token"
import { ensureSeoToolTables } from "@/lib/seo-tools"
import { allImages } from "@/lib/seo-entries"

export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  try {
    await ensureSeoToolTables()
    const [products, alts] = await Promise.all([
      query<(RowDataPacket & { name: string; slug: string; images: unknown })[]>(
        "SELECT name, slug, images FROM products WHERE status <> 'archived' ORDER BY name"
      ),
      query<(RowDataPacket & { image_url: string; alt_text: string })[]>("SELECT image_url, alt_text FROM seo_image_alt"),
    ])
    const altMap = new Map(alts.map((a) => [a.image_url, a.alt_text]))
    const images = products.flatMap((p) =>
      allImages(p.images).map((url) => ({ url, product: p.name, slug: p.slug, alt: altMap.get(url) ?? "" }))
    )
    return NextResponse.json({ images })
  } catch (error) {
    console.error("GET /api/seo/images error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to load images" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  const body = await request.json().catch(() => null)
  const items: { url: string; alt: string }[] = Array.isArray(body?.items) ? body.items : body ? [body] : []
  if (!items.length || items.length > 500) return NextResponse.json({ error: "1–500 items required" }, { status: 400 })
  try {
    await ensureSeoToolTables()
    for (const it of items) {
      const url = typeof it.url === "string" ? it.url.trim().slice(0, 500) : ""
      const alt = typeof it.alt === "string" ? it.alt.trim().slice(0, 255) : ""
      if (!url) continue
      if (!alt) await query("DELETE FROM seo_image_alt WHERE image_url = ?", [url])
      else
        await query(
          `INSERT INTO seo_image_alt (image_url, alt_text) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE alt_text = VALUES(alt_text)`,
          [url, alt]
        )
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("PUT /api/seo/images error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to save alt text" }, { status: 500 })
  }
}
