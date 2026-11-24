// Public read endpoint used by the website's generateMetadata.
// SEO metadata ends up in public page HTML anyway, so no auth is needed.
import { NextRequest, NextResponse } from "next/server"
import { getSeo, isSeoEntityType, SEO_ENTITY_TYPES } from "@/lib/seo"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type")
  const key = request.nextUrl.searchParams.get("key")
  if (!isSeoEntityType(type) || !key) {
    return NextResponse.json({ error: `type (${SEO_ENTITY_TYPES.join("|")}) and key are required` }, { status: 400 })
  }
  try {
    return NextResponse.json({ seo: await getSeo(type, key) })
  } catch (error) {
    console.error("GET /api/seo error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to load SEO metadata" }, { status: 500 })
  }
}
