import { NextRequest, NextResponse } from "next/server"
import { hasStaffSession } from "@/lib/integration-token"
import { revalidateWebsite } from "@/lib/seo"
import { saveVideo, deleteVideo } from "@/lib/site-content"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: Ctx) {
  if (!(await hasStaffSession())) return NextResponse.json({ error: "Please sign in again" }, { status: 401 })
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  try {
    const result = await saveVideo(body, id)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    const revalidated = await revalidateWebsite()
    return NextResponse.json({ ok: true, id, revalidated })
  } catch (error) {
    console.error("PUT /api/factory-videos error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  if (!(await hasStaffSession())) return NextResponse.json({ error: "Please sign in again" }, { status: 401 })
  const { id } = await params
  try {
    await deleteVideo(id)
    const revalidated = await revalidateWebsite()
    return NextResponse.json({ ok: true, revalidated })
  } catch (error) {
    console.error("DELETE /api/factory-videos error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
