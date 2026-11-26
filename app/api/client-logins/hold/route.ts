// POST { phone, hold: true|false, note? }: put a client's mobile number on hold
// (Create client logins and automatic sync skip it) or release it. Administrators and managers only.
import { NextRequest, NextResponse } from "next/server"
import { ownerOnly, setHold } from "@/lib/client-login-accounts"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const denied = await ownerOnly()
  if (denied) return NextResponse.json({ error: denied }, { status: 403 })
  const body = await request.json().catch(() => null)
  const phone = typeof body?.phone === "string" && /^\d{9,15}$/.test(body.phone) ? body.phone : ""
  if (!phone || typeof body?.hold !== "boolean") return NextResponse.json({ error: "Mobile number and hold are required" }, { status: 400 })
  try {
    await setHold(phone, body.hold, typeof body.note === "string" ? body.note.trim() : "")
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("POST /api/client-logins/hold error:", (e as Error).message)
    return NextResponse.json({ error: "Could not save" }, { status: 500 })
  }
}
