// Materials (Admin -> Materials): shop-wide list with a % extra on the size price.
// GET is public (product pages); add ?all=1 when signed in to include drafts.
import { NextRequest, NextResponse } from "next/server"
import { hasStaffSession } from "@/lib/integration-token"
import { revalidateWebsite } from "@/lib/seo"
import { listMaterials, saveMaterial } from "@/lib/product-options"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const all = request.nextUrl.searchParams.get("all") === "1" && (await hasStaffSession())
    return NextResponse.json({ materials: await listMaterials(!all) })
  } catch (error) {
    console.error("GET /api/materials error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to load" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await hasStaffSession())) return NextResponse.json({ error: "Please sign in again" }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  try {
    const result = await saveMaterial(body)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    const revalidated = await revalidateWebsite()
    return NextResponse.json({ ok: true, id: result.id, revalidated }, { status: 201 })
  } catch (error) {
    console.error("POST /api/materials error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
