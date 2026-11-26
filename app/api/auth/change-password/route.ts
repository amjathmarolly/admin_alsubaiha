import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import type { RowDataPacket } from "mysql2"
import { query } from "@/lib/db/config"
import { withCors } from "@/lib/cors"
import { readSession, startSession } from "@/lib/session"
import { ensurePasswordColumn, newPasswordProblem, setStaffPassword, verifyStaffPassword } from "@/lib/staff-password"
import { customerPasswordProblem, ensureCustomerColumns, hashPassword } from "@/lib/customer-accounts"
import { clearLoginFailures, loginWaitSeconds, recordLoginFailure, waitMessage } from "@/lib/login-limit"

export const dynamic = "force-dynamic"

interface StaffRow extends RowDataPacket {
  id: string
  email: string
  password_hash: string | null
  password_changed_at: Date | null
  status: string
}

interface CustomerRow extends RowDataPacket {
  id: string
  email: string | null
  phone_normalized: string | null
  password_hash: string | null
  status: string
}

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

/**
 * POST /api/auth/change-password  { currentPassword, newPassword }
 * For staff and customers alike. Also how a temporary password is replaced:
 * afterwards the session is renewed without the "must change" restriction.
 */
const handler = async (request: NextRequest) => {
  const session = await readSession()
  if (!session) return bad("Please sign in again", 401)

  const body = await request.json().catch(() => null)
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : ""
  const newPassword = body?.newPassword
  if (typeof newPassword === "string" && newPassword === currentPassword) {
    return bad("New password must be different from the current one")
  }

  // Same guessing limit as sign-in, so this cannot be used to try passwords.
  const limitKey = `change:${session.userId}`
  const wait = await loginWaitSeconds(limitKey)
  if (wait > 0) return bad(waitMessage(wait), 429)

  try {
    if (session.isCustomer) {
      await ensureCustomerColumns()
      const [c] = await query<CustomerRow[]>(
        "SELECT id, email, phone_normalized, password_hash, status FROM customers WHERE id = ?",
        [session.userId]
      )
      if (!c || c.status !== "active") return bad("Please sign in again", 401)
      if (!c.password_hash || !(await bcrypt.compare(currentPassword, c.password_hash))) {
        await recordLoginFailure(limitKey)
        return bad("Current password is incorrect")
      }
      const problem = customerPasswordProblem(newPassword, c.phone_normalized)
      if (problem) return bad(problem)
      await query("UPDATE customers SET password_hash = ?, must_change_password = 0 WHERE id = ?", [
        await hashPassword(newPassword as string),
        c.id,
      ])
      await clearLoginFailures(limitKey)
      await startSession({ userId: c.id, email: c.email, isCustomer: true })
      return NextResponse.json({ ok: true })
    }

    await ensurePasswordColumn()
    const [user] = await query<StaffRow[]>(
      "SELECT id, email, password_hash, password_changed_at, status FROM users WHERE id = ?",
      [session.userId]
    )
    if (!user || user.status !== "active") return bad("Please sign in again", 401)
    if ((await verifyStaffPassword(user, currentPassword)) !== "hash") {
      await recordLoginFailure(limitKey)
      return bad("Current password is incorrect")
    }
    const problem = await newPasswordProblem(newPassword, user.email)
    if (problem) return bad(problem)

    await setStaffPassword(user.id, newPassword as string)
    await clearLoginFailures(limitKey)
    await startSession({ userId: user.id, email: user.email })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("POST /api/auth/change-password error:", (error as Error).message)
    return bad("Could not change the password", 500)
  }
}

export const POST = withCors(handler)

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  })
}
