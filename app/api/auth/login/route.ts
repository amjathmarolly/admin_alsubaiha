import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcrypt"
import type { RowDataPacket, ResultSetHeader } from "mysql2"
import { query } from "@/lib/db/config"
import { withCors } from "@/lib/cors"
import { verifyStaffPassword } from "@/lib/staff-password"
import { startSession } from "@/lib/session"
import { ensureCustomerColumns } from "@/lib/customer-accounts"
import { normalizePhone, isPlausiblePhone } from "@/lib/phone"
import { clearLoginFailures, loginWaitSeconds, recordLoginFailure, waitMessage } from "@/lib/login-limit"

interface UserRow extends RowDataPacket {
  id: string
  email: string
  password_hash: string
  name: string
  avatar: string | null
  role_id: string | null
  status: "active" | "inactive" | "suspended"
  password_changed_at?: Date | null
}

interface CustomerRow extends RowDataPacket {
  id: string
  name: string
  email: string | null
  phone: string | null
  phone_normalized: string | null
  avatar: string | null
  status: string
  verified: number | boolean | null
  password_hash: string | null
  must_change_password: number | null
}

interface RoleRow extends RowDataPacket {
  id: string
  name: string
  permissions: string
}

const WRONG = "Invalid email or password"

// POST /api/auth/login  { email, password } or { phone, password }
const loginHandler = async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}))
    const password = typeof body?.password === "string" ? body.password : ""
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const phone = !email && body?.phone != null ? normalizePhone(body.phone) : ""

    if (!password || (!email && !phone)) {
      return NextResponse.json({ error: "Email or mobile number and password are required" }, { status: 400 })
    }
    if (phone && !isPlausiblePhone(phone)) {
      return NextResponse.json({ error: "Please enter the mobile number with its country code" }, { status: 400 })
    }

    const limitKey = email ? `email:${email}` : `phone:${phone}`
    const wait = await loginWaitSeconds(limitKey)
    if (wait > 0) return NextResponse.json({ error: waitMessage(wait) }, { status: 429 })
    const fail = async (status = 401, error = WRONG) => {
      await recordLoginFailure(limitKey)
      return NextResponse.json({ error: phone && error === WRONG ? "Invalid mobile number or password" : error }, { status })
    }

    // Staff sign in with their email only.
    const [user] = email ? await query<UserRow[]>("SELECT * FROM users WHERE email = ?", [email]) : []

    if (!user) {
      await ensureCustomerColumns()
      const [customer] = email
        ? await query<CustomerRow[]>("SELECT * FROM customers WHERE email = ?", [email])
        : await query<CustomerRow[]>("SELECT * FROM customers WHERE phone_normalized = ?", [phone])

      if (!customer || !customer.password_hash || !(await bcrypt.compare(password, customer.password_hash))) {
        return fail()
      }
      if (customer.status !== "active") {
        return NextResponse.json({ error: "Account is not active" }, { status: 403 })
      }
      if (!customer.verified) {
        return NextResponse.json({ error: "Please verify your email address before logging in." }, { status: 403 })
      }

      await clearLoginFailures(limitKey)
      const mustChangePassword = Boolean(customer.must_change_password)
      await startSession({ userId: customer.id, email: customer.email, isCustomer: true, mustChange: mustChangePassword })

      return NextResponse.json({
        user: {
          id: customer.id,
          email: customer.email,
          phone: customer.phone_normalized || customer.phone,
          name: customer.name,
          avatar: customer.avatar,
          role: "customer",
          roleId: "customer",
        },
        permissions: ["view_profile", "place_order"],
        mustChangePassword,
      })
    }

    const match = await verifyStaffPassword(user, password)
    if (!match) return fail()
    if (match === "starter") {
      // Published with the old code, so anyone could use it.
      await recordLoginFailure(limitKey)
      return NextResponse.json(
        { error: "This old starter password no longer works. Ask the administrator to set a new password for this account." },
        { status: 401 }
      )
    }
    if (user.status !== "active") {
      return NextResponse.json({ error: "Account is not active" }, { status: 403 })
    }
    await clearLoginFailures(limitKey)

    let role = null
    let permissions: string[] = []
    if (user.role_id) {
      const roleResult = await query<RoleRow[]>(
        `SELECT r.id, r.name, GROUP_CONCAT(rp.permission) as permissions
         FROM roles r
         LEFT JOIN role_permissions rp ON r.id = rp.role_id
         WHERE r.id = ?
         GROUP BY r.id`,
        [user.role_id]
      )
      if (roleResult.length > 0) {
        role = { id: roleResult[0].id, name: roleResult[0].name }
        permissions = roleResult[0].permissions ? roleResult[0].permissions.split(",") : []
      }
    }

    // Optional: the live users table has no last_login column.
    try {
      await query<ResultSetHeader>("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id])
    } catch {
      /* not recorded */
    }

    const mustChangePassword = false
    await startSession({ userId: user.id, email: user.email })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: role?.name || "viewer",
        roleId: user.role_id,
      },
      permissions,
      mustChangePassword,
    })
  } catch (error) {
    console.error("POST /api/auth/login error:", (error as Error).message)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}

export const POST = withCors(loginHandler)

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": request.headers.get("origin") || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  })
}
