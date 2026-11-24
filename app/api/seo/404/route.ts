// 404 monitor. The website POSTs missing paths here (guarded by the shared REVALIDATE_SECRET);
// admins list and clear them.
import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"
import { requireAdmin } from "@/lib/integration-token"
import { ensureSeoToolTables, normalizePath } from "@/lib/seo-tools"

export const dynamic = "force-dynamic"

const MAX_ROWS = 5000

function secretOk(request: NextRequest): boolean {
  const secret = process.env.REVALIDATE_SECRET
  const given = request.headers.get("x-revalidate-secret")
  if (!secret || !given) return false
  const a = Buffer.from(secret)
  const b = Buffer.from(given)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  if (!secretOk(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (typeof body?.path !== "string" || !body.path.startsWith("/")) {
    return NextResponse.json({ error: "path required" }, { status: 400 })
  }
  const path = normalizePath(body.path)
  const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null
  try {
    await ensureSeoToolTables()
    const [{ n }] = await query<(RowDataPacket & { n: number })[]>("SELECT COUNT(*) AS n FROM seo_404_log")
    const exists = await query<RowDataPacket[]>("SELECT 1 FROM seo_404_log WHERE path = ? LIMIT 1", [path])
    if (!exists.length && n >= MAX_ROWS) return NextResponse.json({ ok: true, skipped: true })
    await query(
      `INSERT INTO seo_404_log (path, referrer) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE hits = hits + 1, referrer = COALESCE(VALUES(referrer), referrer)`,
      [path, referrer]
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/seo/404 error:", (error as Error).message)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  try {
    await ensureSeoToolTables()
    const rows = await query<(RowDataPacket & { path: string; hits: number; referrer: string | null; first_seen: Date; last_seen: Date })[]>(
      "SELECT path, hits, referrer, first_seen, last_seen FROM seo_404_log ORDER BY hits DESC, last_seen DESC LIMIT 500"
    )
    return NextResponse.json({
      items: rows.map((r) => ({ path: r.path, hits: r.hits, referrer: r.referrer, firstSeen: r.first_seen, lastSeen: r.last_seen })),
    })
  } catch (error) {
    console.error("GET /api/seo/404 error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to load 404 log" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  const path = request.nextUrl.searchParams.get("path")
  try {
    await ensureSeoToolTables()
    if (path) await query("DELETE FROM seo_404_log WHERE path = ?", [path])
    else await query("DELETE FROM seo_404_log")
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE /api/seo/404 error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 })
  }
}
