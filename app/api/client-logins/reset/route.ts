// POST { customerId }: a new temporary password for one client, shown once. Administrators and managers only.
import { NextRequest, NextResponse } from "next/server"
import { ownerOnly, resetClientPassword } from "@/lib/client-login-accounts"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const denied = await ownerOnly()
  if (denied) return NextResponse.json({ error: denied }, { status: 403 })
  const body = await request.json().catch(() => null)
  const id = typeof body?.customerId === "string" ? body.customerId : ""
  if (!id) return NextResponse.json({ error: "Customer is required" }, { status: 400 })
  try {
    const result = await resetClientPassword(id)
    if (!result) return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } })
  } catch (e) {
    console.error("POST /api/client-logins/reset error:", (e as Error).message)
    return NextResponse.json({ error: "Could not set a new password" }, { status: 500 })
  }
}
