// GET /api/products/:id/options — size and material choices with prices (public; product pages).
// PUT { sizes?: [{label,width,depth,height,price}] | null, materialIds?: string[] | null } — staff.
// null goes back to the category's standard sizes / the materials for its category.
import { NextRequest, NextResponse } from "next/server"
import { hasStaffSession } from "@/lib/integration-token"
import { revalidateWebsite } from "@/lib/seo"
import { optionsForProduct, saveProductOptions } from "@/lib/product-options"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params
  try {
    const options = await optionsForProduct(id)
    if (!options) return NextResponse.json({ error: "Product not found" }, { status: 404 })
    return NextResponse.json(options)
  } catch (error) {
    console.error("GET /api/products/[id]/options error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to load" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  if (!(await hasStaffSession())) return NextResponse.json({ error: "Please sign in again" }, { status: 401 })
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  try {
    const result = await saveProductOptions(id, body)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    const revalidated = await revalidateWebsite()
    return NextResponse.json({ ok: true, options: await optionsForProduct(id), revalidated })
  } catch (error) {
    console.error("PUT /api/products/[id]/options error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
