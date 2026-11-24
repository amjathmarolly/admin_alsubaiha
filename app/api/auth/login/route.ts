import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import { cookies } from "next/headers"
import type { RowDataPacket, ResultSetHeader } from "mysql2"
import { withCors } from "@/lib/cors"
import bcrypt from "bcrypt"
import { verifyStaffPassword } from "@/lib/staff-password"

interface UserRow extends RowDataPacket {
  id: string
  email: string
  password_hash: string
  name: string
  avatar: string | null
  role_id: string | null
  status: "active" | "inactive" | "suspended"
  last_login: Date | null
  password_changed_at?: Date | null
}

interface RoleRow extends RowDataPacket {
  id: string
  name: string
  permissions: string
}

// POST /api/auth/login
const loginHandler = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Find user
    const [user] = await query<UserRow[]>(
      "SELECT * FROM users WHERE email = ?",
      [email.toLowerCase()]
    )

    if (!user) {
      // If not found in users, check in customers
      console.log("[Login] User not found in users table, checking customers table for:", email)
      const [customer] = await query<any[]>(
        "SELECT * FROM customers WHERE email = ?",
        [email.toLowerCase()]
      )

      console.log("[Login] Customer query result:", customer)

      if (!customer) {
        console.log("[Login] Customer not found in database for email:", email)
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        )
      }

      if (customer.status !== "active") {
        console.log("[Login] Customer status is not active:", customer.status)
        return NextResponse.json(
          { error: "Account is not active" },
          { status: 403 }
        )
      }

      if (!customer.verified) {
        console.log("[Login] Customer is not verified:", customer.verified)
        return NextResponse.json(
          { error: "Please verify your email address before logging in." },
          { status: 403 }
        )
      }

      // Verify password using bcrypt if password_hash exists
      let isPasswordValid = false
      if (customer.password_hash) {
        isPasswordValid = await bcrypt.compare(password, customer.password_hash)
        console.log("[Login] Bcrypt password match result:", isPasswordValid)
      } else {
        // Fallback to default password if no hash is stored yet
        isPasswordValid = !!process.env.DEFAULT_CUSTOMER_PASSWORD && password === process.env.DEFAULT_CUSTOMER_PASSWORD
        console.log("[Login] Fallback password match result:", isPasswordValid)
      }

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        )
      }

      // Create session token for customer
      const sessionToken = Buffer.from(
        JSON.stringify({
          userId: customer.id,
          email: customer.email,
          isCustomer: true,
          exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        })
      ).toString("base64")

      // Set cookie
      const cookieStore = await cookies()
      cookieStore.set("session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 24 hours
        path: "/",
      })

      return NextResponse.json({
        user: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          avatar: customer.avatar,
          role: "customer",
          roleId: "customer",
        },
        permissions: ["view_profile", "place_order"],
      })
    }

    if (user.status !== "active") {
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 }
      )
    }

    // Verify password
    if (!(await verifyStaffPassword(user, password))) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Get role with permissions
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
        role = {
          id: roleResult[0].id,
          name: roleResult[0].name,
        }
        permissions = roleResult[0].permissions ? roleResult[0].permissions.split(",") : []
      }
    }

    // Update last login
    // Recording the time is optional: the live users table has no last_login
    // column, and a failure here must not block the sign-in.
    try {
      await query<ResultSetHeader>("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id])
    } catch (e) {
      console.warn("[Login] Could not record last_login:", (e as Error).message)
    }

    // Create session token (in production, use JWT or secure session)
    const sessionToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      })
    ).toString("base64")

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    })

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
    })
  } catch (error) {
    console.error("POST /api/auth/login error:", error)
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    )
  }
}

export const POST = withCors(loginHandler)

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
}
