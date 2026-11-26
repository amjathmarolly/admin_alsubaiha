// POST { phone }: staff approve a held-back number (orders under different names
// or emails) as one client. Administrators and managers only.
import { NextRequest, NextResponse } from "next/server"
import { approveNumber, confirmAccountLink, ownerOnly } from "@/lib/client-login-accounts"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const denied = await ownerOnly()
  if (denied) return NextResponse.json({ error: denied }, { status: 403 })
  const body = await request.json().catch(() => null)
  const phone = typeof body?.phone === "string" && /^\d{9,15}$/.test(body.phone) ? body.phone : ""
  if (!phone) return NextResponse.json({ error: "Mobile number is required" }, { status: 400 })
  try {
    // kind "link": confirm the existing (e.g. self-signed-up) account on this number is the client.
    const ok = body?.kind === "link" ? await confirmAccountLink(phone) : await approveNumber(phone)
    if (!ok) {
      return NextResponse.json({ error: "This number can't be approved (it changed on Monday or needs fixing there)" }, { status: 409 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("POST /api/client-logins/approve error:", (e as Error).message)
    return NextResponse.json({ error: "Could not approve" }, { status: 500 })
  }
}
