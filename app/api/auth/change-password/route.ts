import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2"
import { query } from "@/lib/db/config"
import { staffUserId } from "@/lib/integration-token"
import { ensurePasswordColumn, newPasswordProblem, setStaffPassword, verifyStaffPassword } from "@/lib/staff-password"

export const dynamic = "force-dynamic"

interface Row extends RowDataPacket {
  id: string
  email: string
  password_hash: string | null
  password_changed_at: Date | null
  status: string
}

// POST /api/auth/change-password  { currentPassword, newPassword }
export async function POST(request: NextRequest) {
  const userId = await staffUserId()
  if (!userId) return NextResponse.json({ error: "Please sign in again" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : ""
  const newPassword = body?.newPassword

  try {
    await ensurePasswordColumn()
    const [user] = await query<Row[]>(
      "SELECT id, email, password_hash, password_changed_at, status FROM users WHERE id = ?",
      [userId]
    )
    if (!user || user.status !== "active") {
      return NextResponse.json({ error: "Please sign in again" }, { status: 401 })
    }
    if (!(await verifyStaffPassword(user, currentPassword))) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }
    const problem = await newPasswordProblem(newPassword, user.email)
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: "New password must be different from the current one" }, { status: 400 })
    }

    await setStaffPassword(user.id, newPassword as string)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/auth/change-password error:", error)
    return NextResponse.json({ error: "Could not change the password" }, { status: 500 })
  }
}
