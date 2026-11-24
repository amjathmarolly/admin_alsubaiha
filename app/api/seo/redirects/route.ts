// Admin CRUD for 301/302 redirects. The website reads active ones from /api/seo/site.
import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"
import { requireAdmin } from "@/lib/integration-token"
import { ensureSeoToolTables, normalizePath } from "@/lib/seo-tools"
import { revalidateWebsite } from "@/lib/seo"

export const dynamic = "force-dynamic"

interface RedirectRow extends RowDataPacket {
  id: string
  from_path: string
  to_path: string
  status_code: number
  active: number
  created_at: Date
}

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  try {
    await ensureSeoToolTables()
    const rows = await query<RedirectRow[]>("SELECT * FROM seo_redirects ORDER BY created_at DESC")
    return NextResponse.json({
      redirects: rows.map((r) => ({
        id: r.id, from: r.from_path, to: r.to_path, status: r.status_code, active: Boolean(r.active), createdAt: r.created_at,
      })),
    })
  } catch (error) {
    console.error("GET /api/seo/redirects error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to load redirects" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  const body = await request.json().catch(() => null)
  const from = typeof body?.from === "string" ? normalizePath(body.from) : ""
  const rawTo = typeof body?.to === "string" ? body.to.trim() : ""
  const to = /^https?:\/\//i.test(rawTo) ? rawTo.slice(0, 500) : rawTo ? normalizePath(rawTo) : ""
  const status = body?.status === 302 ? 302 : 301
  if (!from || from === "/" || !to) return NextResponse.json({ error: "Both 'from' and 'to' are required ('from' cannot be the home page)" }, { status: 400 })
  if (from === to) return NextResponse.json({ error: "'from' and 'to' are the same" }, { status: 400 })
  try {
    await ensureSeoToolTables()
    // avoid a direct two-step loop (A->B while B->A)
    const loop = await query<RowDataPacket[]>("SELECT 1 FROM seo_redirects WHERE from_path = ? AND to_path = ? LIMIT 1", [to, from])
    if (loop.length) return NextResponse.json({ error: "That would create a redirect loop" }, { status: 400 })
    await query(
      `INSERT INTO seo_redirects (id, from_path, to_path, status_code, active) VALUES (?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE to_path = VALUES(to_path), status_code = VALUES(status_code), active = TRUE`,
      [randomUUID(), from, to, status]
    )
    // the 404 for this path is now handled
    await query("DELETE FROM seo_404_log WHERE path = ?", [from])
    return NextResponse.json({ ok: true, revalidated: await revalidateWebsite() })
  } catch (error) {
    console.error("POST /api/seo/redirects error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to save redirect" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  const body = await request.json().catch(() => null)
  if (typeof body?.id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 })
  try {
    await ensureSeoToolTables()
    await query("UPDATE seo_redirects SET active = ? WHERE id = ?", [body.active ? 1 : 0, body.id])
    return NextResponse.json({ ok: true, revalidated: await revalidateWebsite() })
  } catch (error) {
    console.error("PATCH /api/seo/redirects error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to update redirect" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  const id = request.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  try {
    await ensureSeoToolTables()
    await query("DELETE FROM seo_redirects WHERE id = ?", [id])
    return NextResponse.json({ ok: true, revalidated: await revalidateWebsite() })
  } catch (error) {
    console.error("DELETE /api/seo/redirects error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to delete redirect" }, { status: 500 })
  }
}
