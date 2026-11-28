// Google sign-in for staff.
// GET  -> { clientId, linkedEmail } (linkedEmail only for a signed-in staff member)
// POST { credential }                 -> sign in with a linked Google account
// POST { credential, mode: "link" }   -> link the Google account to the signed-in staff account
// POST { mode: "unlink" }             -> remove the link
import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2"
import { query } from "@/lib/db/config"
import { staffUserId } from "@/lib/integration-token"
import { startSession } from "@/lib/session"
import { googleClientId, linkGoogle, linkedGoogleEmail, staffForGoogle, unlinkGoogle, verifyGoogleIdToken } from "@/lib/google-signin"

export const dynamic = "force-dynamic"

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function GET() {
  const userId = await staffUserId()
  return NextResponse.json(
    { clientId: googleClientId() || null, linkedEmail: userId ? await linkedGoogleEmail(userId).catch(() => null) : null },
    { headers: { "Cache-Control": "no-store" } }
  )
}

interface UserRow extends RowDataPacket {
  id: string
  email: string
  name: string
  avatar: string | null
  role_id: string | null
  status: string
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const mode = body?.mode

  try {
    if (mode === "unlink") {
      const userId = await staffUserId()
      if (!userId) return bad("Please sign in again", 401)
      await unlinkGoogle(userId)
      return NextResponse.json({ ok: true })
    }

    const g = await verifyGoogleIdToken(body?.credential)
    if ("error" in g) return bad(g.error, 401)

    if (mode === "link") {
      const userId = await staffUserId()
      if (!userId) return bad("Please sign in again", 401)
      const res = await linkGoogle(userId, g)
      if (!res.ok) return bad(res.error, 409)
      return NextResponse.json({ ok: true, linkedEmail: g.email })
    }

    const userId = await staffForGoogle(g.sub)
    if (!userId) {
      return bad(
        "This Google account isn't connected to the admin. Sign in with your email and password once, then connect Google in Settings → Security.",
        403
      )
    }
    const [user] = await query<UserRow[]>("SELECT id, email, name, avatar, role_id, status FROM users WHERE id = ?", [userId])
    if (!user || user.status !== "active") return bad("Account is not active", 403)

    let role: { id: string; name: string } | null = null
    let permissions: string[] = []
    if (user.role_id) {
      const [r] = await query<(RowDataPacket & { id: string; name: string; permissions: string | null })[]>(
        `SELECT r.id, r.name, GROUP_CONCAT(rp.permission) AS permissions
         FROM roles r LEFT JOIN role_permissions rp ON r.id = rp.role_id
         WHERE r.id = ? GROUP BY r.id`,
        [user.role_id]
      )
      if (r) {
        role = { id: r.id, name: r.name }
        permissions = r.permissions ? r.permissions.split(",") : []
      }
    }

    await startSession({ userId: user.id, email: user.email })
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, role: role?.name || "viewer", roleId: user.role_id },
      permissions,
      mustChangePassword: false,
    })
  } catch (error) {
    console.error("POST /api/auth/google error:", (error as Error).message)
    return bad("Google sign-in failed", 500)
  }
}
