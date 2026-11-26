// Automatic client sync, for a Monday.com webhook or a scheduled call:
//   POST /api/client-logins/sync?key=<CLIENT_SYNC_KEY>
// Off (404) unless CLIENT_SYNC_KEY (24+ characters) is set in the server environment.
// Adds new clean clients without a password, updates totals, tiers and projects.
// Staff (administrator or manager) can also run it while signed in.
import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { autoSync, ownerOnly } from "@/lib/client-login-accounts"

export const dynamic = "force-dynamic"

function keyOk(given: string | null): boolean {
  const want = process.env.CLIENT_SYNC_KEY ?? ""
  if (want.length < 24 || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(want)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Monday calls each event at most this often in a burst; one run covers them all.
let running: Promise<unknown> | null = null
let lastRun = 0

export async function POST(request: NextRequest) {
  const keyed = keyOk(request.nextUrl.searchParams.get("key"))
  if (!keyed && (await ownerOnly())) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json().catch(() => null)
  // Monday's webhook set-up check: echo the challenge back.
  if (keyed && typeof body?.challenge === "string") return NextResponse.json({ challenge: body.challenge })

  if (running) return NextResponse.json({ ok: true, note: "A sync is already running" }, { status: 202 })
  if (keyed && Date.now() - lastRun < 30_000) return NextResponse.json({ ok: true, note: "Synced moments ago" }, { status: 202 })
  try {
    running = autoSync()
    const result = await running
    lastRun = Date.now()
    return NextResponse.json({ ok: true, ...(result as object) })
  } catch (e) {
    console.error("POST /api/client-logins/sync error:", (e as Error).message)
    return NextResponse.json({ error: "Sync failed" }, { status: 502 })
  } finally {
    running = null
  }
}
