// Admin-facing management of SEO overrides (Admin -> SEO).
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/integration-token"
import { listEntries } from "@/lib/seo-entries"
import { SEO_ENTITY_TYPES, isEditablePageKey, isSeoEntityType, revalidateWebsite, saveSeo, type SeoEntityType } from "@/lib/seo"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type")
  if (!isSeoEntityType(type)) {
    return NextResponse.json({ error: `type must be one of: ${SEO_ENTITY_TYPES.join(", ")}` }, { status: 400 })
  }
  try {
    return NextResponse.json({ entries: await listEntries(type) })
  } catch (error) {
    console.error("GET /api/seo/entries error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to load SEO entries" }, { status: 500 })
  }
}

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  const body = await request.json().catch(() => null)
  const type = body?.type as SeoEntityType
  const key = typeof body?.key === "string" ? body.key.trim() : ""
  if (!isSeoEntityType(type) || !key) {
    return NextResponse.json({ error: "type and key are required" }, { status: 400 })
  }
  if (type === "page" && !isEditablePageKey(key)) {
    return NextResponse.json({ error: "Unknown page" }, { status: 400 })
  }
  const canonicalUrl = clean(body.canonicalUrl, 500)
  if (canonicalUrl && !/^https?:\/\//i.test(canonicalUrl)) {
    return NextResponse.json({ error: "Canonical URL must start with http:// or https://" }, { status: 400 })
  }
  try {
    await saveSeo(type, key, {
      title: clean(body.title, 255),
      description: clean(body.description, 1000),
      ogImage: clean(body.ogImage, 500),
      canonicalUrl,
      noindex: Boolean(body.noindex),
      twitterCard: body.twitterCard === "summary" || body.twitterCard === "summary_large_image" ? body.twitterCard : null,
      twitterImage: clean(body.twitterImage, 500),
      h1: clean(body.h1, 255),
      intro: clean(body.intro, 2000),
    })
    const revalidated = await revalidateWebsite()
    return NextResponse.json({ ok: true, revalidated })
  } catch (error) {
    console.error("PUT /api/seo/entries error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to save SEO metadata" }, { status: 500 })
  }
}
