// "Create client logins" (Admin -> Client logins). Administrators and managers only.
// GET: preview from the Monday client board. POST { phones: [...] }: create the chosen logins.
import { NextRequest, NextResponse } from "next/server"
import { applyPlan, buildPlan, ownerOnly } from "@/lib/client-login-accounts"

export const dynamic = "force-dynamic"

const noStore = { "Cache-Control": "no-store" }

export async function GET() {
  const denied = await ownerOnly()
  if (denied) return NextResponse.json({ error: denied }, { status: 403 })
  try {
    return NextResponse.json(await buildPlan(), { headers: noStore })
  } catch (e) {
    console.error("GET /api/client-logins error:", (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const denied = await ownerOnly()
  if (denied) return NextResponse.json({ error: denied }, { status: 403 })
  const body = await request.json().catch(() => null)
  const phones = Array.isArray(body?.phones) ? body.phones.filter((p: unknown): p is string => typeof p === "string" && /^\d{9,15}$/.test(p)) : []
  if (!phones.length) return NextResponse.json({ error: "Choose at least one client" }, { status: 400 })
  try {
    // Temporary passwords are in this answer only; they are not stored anywhere readable.
    return NextResponse.json(await applyPlan(phones.slice(0, 1000)), { headers: noStore })
  } catch (e) {
    console.error("POST /api/client-logins error:", (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 })
  }
}
