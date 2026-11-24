// Profile API - Uses users table
// Table columns: id, name, email, phone, avatar, status, role_id, etc.
// Updated: 2026-03-19 - Uses email query param for auth
import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface UserRow extends RowDataPacket {
  id: string
  name: string
  email: string
  phone: string | null
  avatar: string | null
  status: string
  role_id: string
}

// GET /api/profile?email=xxx - Get user profile by email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    
    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      )
    }
    
    const users = await query<UserRow[]>(
      "SELECT id, name, email, phone, avatar, status, role_id FROM users WHERE email = ?",
      [email]
    )
    
    if (users.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }
    
    const user = users[0]
    const nameParts = user.name.split(" ")
    const firstName = nameParts[0] || ""
    const lastName = nameParts.slice(1).join(" ") || ""
    
    return NextResponse.json({
      id: user.id,
      firstName,
      lastName,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      avatar: user.avatar,
      status: user.status,
      roleId: user.role_id,
    })
  } catch (error) {
    const err = error as Error
    console.error("GET /api/profile error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to fetch profile" },
      { status: 500 }
    )
  }
}

// PUT /api/profile - Update user profile (requires email in body to identify user)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, firstName, lastName, phone } = body
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required to identify the user" },
        { status: 400 }
      )
    }
    
    // Find user by email
    const existingUsers = await query<UserRow[]>(
      "SELECT id FROM users WHERE email = ?",
      [email]
    )
    
    if (existingUsers.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }
    
    const userId = existingUsers[0].id
    
    // Combine first and last name into single 'name' column
    const name = [firstName, lastName].filter(Boolean).join(" ").trim()
    
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }
    
    // Build update query
    const updates: string[] = ["name = ?"]
    const values: (string | null)[] = [name]
    
    if (phone !== undefined) {
      updates.push("phone = ?")
      values.push(phone || null)
    }
    
    values.push(userId)
    
    await query<ResultSetHeader>(
      `UPDATE users SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
      values
    )
    
    // Fetch and return updated profile
    const users = await query<UserRow[]>(
      "SELECT id, name, email, phone, avatar, status, role_id FROM users WHERE id = ?",
      [userId]
    )
    
    const user = users[0]
    const nameParts = user.name.split(" ")
    const updatedFirstName = nameParts[0] || ""
    const updatedLastName = nameParts.slice(1).join(" ") || ""
    
    return NextResponse.json({
      id: user.id,
      firstName: updatedFirstName,
      lastName: updatedLastName,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      avatar: user.avatar,
      status: user.status,
      roleId: user.role_id,
    })
  } catch (error) {
    const err = error as Error
    console.error("PUT /api/profile error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to update profile" },
      { status: 500 }
    )
  }
}
