import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface RoleRow extends RowDataPacket {
  id: string
  name: string
  description: string | null
  color: string
  is_system: boolean
  created_at: Date
  updated_at: Date
  permissions: string | null
  member_count: number
}

// GET /api/roles - List all roles with permissions
export async function GET() {
  try {
    const roles = await query<RoleRow[]>(
      `SELECT 
        r.*,
        GROUP_CONCAT(rp.permission) as permissions,
        (SELECT COUNT(*) FROM users WHERE role_id = r.id) as member_count
       FROM roles r
       LEFT JOIN role_permissions rp ON r.id = rp.role_id
       GROUP BY r.id
       ORDER BY r.is_system DESC, r.name ASC`
    )
    
    return NextResponse.json({
      data: roles.map(r => ({
        ...r,
        permissions: r.permissions ? r.permissions.split(",") : [],
      })),
    })
  } catch (error) {
    console.error("GET /api/roles error:", error)
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 })
  }
}

// POST /api/roles - Create a new role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, color, permissions } = body
    
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    
    // Create role
    await query<ResultSetHeader>(
      "INSERT INTO roles (name, description, color, is_system) VALUES (?, ?, ?, FALSE)",
      [name, description || null, color || "gray"]
    )
    
    // Get the new role
    const [newRole] = await query<RoleRow[]>(
      "SELECT * FROM roles WHERE name = ?",
      [name]
    )
    
    // Add permissions
    if (permissions && permissions.length > 0) {
      for (const permission of permissions) {
        await query(
          "INSERT INTO role_permissions (role_id, permission) VALUES (?, ?)",
          [newRole.id, permission]
        )
      }
    }
    
    return NextResponse.json({
      ...newRole,
      permissions: permissions || [],
    }, { status: 201 })
  } catch (error: unknown) {
    console.error("POST /api/roles error:", error)
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 })
  }
}
