// Bulk update SEO overrides (CSV import, template apply). Only supplied fields change.
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/integration-token"
import { getSeoMap, isSeoEntityType, revalidateWebsite, saveSeo, type SeoOverride } from "@/lib/seo"
import { listEntries } from "@/lib/seo-entries"

export const dynamic = "force-dynamic"

const text = (v: unknown, max: number): string | null | undefined => {
  if (v === undefined) return undefined
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  const body = await request.json().catch(() => null)
  const type = body?.type
  const items = body?.items
  if (!isSeoEntityType(type) || !Array.isArray(items)) {
    return NextResponse.json({ error: "type and items[] are required" }, { status: 400 })
  }
  if (items.length > 2000) return NextResponse.json({ error: "Too many rows (max 2000)" }, { status: 400 })
  try {
    const [valid, existing] = await Promise.all([listEntries(type), getSeoMap(type)])
    const keys = new Set(valid.map((e) => e.key))
    let updated = 0
    const skipped: string[] = []
    for (const it of items) {
      const key = typeof it?.key === "string" ? it.key.trim() : ""
      if (!key || !keys.has(key)) {
        skipped.push(key || "(empty)")
        continue
      }
      const cur: SeoOverride = existing.get(key) ?? {
        title: null, description: null, ogImage: null, canonicalUrl: null, noindex: false, twitterCard: null, twitterImage: null, h1: null, intro: null,
      }
      const canonical = text(it.canonicalUrl, 500)
      if (canonical && !/^https?:\/\//i.test(canonical)) {
        skipped.push(key)
        continue
      }
      const card = it.twitterCard === undefined ? undefined : it.twitterCard === "summary" || it.twitterCard === "summary_large_image" ? it.twitterCard : null
      const next: SeoOverride = {
        title: text(it.title, 255) ?? cur.title,
        description: text(it.description, 1000) ?? cur.description,
        ogImage: text(it.ogImage, 500) ?? cur.ogImage,
        canonicalUrl: canonical ?? cur.canonicalUrl,
        noindex: it.noindex === undefined ? cur.noindex : Boolean(it.noindex),
        twitterCard: card === undefined ? cur.twitterCard : card,
        twitterImage: text(it.twitterImage, 500) ?? cur.twitterImage,
        h1: text(it.h1, 255) ?? cur.h1,
        intro: text(it.intro, 2000) ?? cur.intro,
      }
      // explicit empty string clears a field
      if (it.title === "") next.title = null
      if (it.description === "") next.description = null
      if (it.ogImage === "") next.ogImage = null
      if (it.h1 === "") next.h1 = null
      if (it.intro === "") next.intro = null
      await saveSeo(type, key, next)
      updated++
    }
    const revalidated = await revalidateWebsite()
    return NextResponse.json({ ok: true, updated, skipped, revalidated })
  } catch (error) {
    console.error("POST /api/seo/bulk error:", (error as Error).message)
    return NextResponse.json({ error: "Bulk update failed" }, { status: 500 })
  }
}
