import { NextRequest, NextResponse } from "next/server"
import { query, transaction } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader, PoolConnection } from "mysql2/promise"

interface RoleRow extends RowDataPacket {
  id: string
  name: string
  description: string | null
  color: string
  is_system: boolean
  permissions: string | null
}

// GET /api/roles/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const [role] = await query<RoleRow[]>(
      `SELECT r.*, GROUP_CONCAT(rp.permission) as permissions
       FROM roles r
       LEFT JOIN role_permissions rp ON r.id = rp.role_id
       WHERE r.id = ?
       GROUP BY r.id`,
      [id]
    )
    
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }
    
    // Get members with this role
    const members = await query<RowDataPacket[]>(
      "SELECT id, name, email, avatar FROM users WHERE role_id = ?",
      [id]
    )
    
    return NextResponse.json({
      ...role,
      permissions: role.permissions ? role.permissions.split(",") : [],
      members,
    })
  } catch (error) {
    console.error("GET /api/roles/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 })
  }
}

// PUT /api/roles/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const [current] = await query<RoleRow[]>(
      "SELECT * FROM roles WHERE id = ?",
      [id]
    )
    
    if (!current) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }
    
    const { name, description, color, permissions } = body
    
    // Update role (but not name for system roles)
    if (current.is_system && name && name !== current.name) {
      return NextResponse.json(
        { error: "Cannot rename system roles" },
        { status: 400 }
      )
    }
    
    await transaction(async (conn: PoolConnection) => {
      // Update role
      await conn.execute(
        `UPDATE roles SET
          name = COALESCE(?, name),
          description = ?,
          color = COALESCE(?, color)
        WHERE id = ?`,
        [
          current.is_system ? current.name : name,
          description !== undefined ? description : current.description,
          color,
          id,
        ]
      )
      
      // Update permissions if provided
      if (permissions !== undefined) {
        // Remove old permissions
        await conn.execute(
          "DELETE FROM role_permissions WHERE role_id = ?",
          [id]
        )
        
        // Add new permissions
        for (const permission of permissions) {
          await conn.execute(
            "INSERT INTO role_permissions (role_id, permission) VALUES (?, ?)",
            [id, permission]
          )
        }
      }
    })
    
    // Get updated role
    const [updated] = await query<RoleRow[]>(
      `SELECT r.*, GROUP_CONCAT(rp.permission) as permissions
       FROM roles r
       LEFT JOIN role_permissions rp ON r.id = rp.role_id
       WHERE r.id = ?
       GROUP BY r.id`,
      [id]
    )
    
    return NextResponse.json({
      ...updated,
      permissions: updated.permissions ? updated.permissions.split(",") : [],
    })
  } catch (error) {
    console.error("PUT /api/roles/[id] error:", error)
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 })
  }
}

// DELETE /api/roles/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const [role] = await query<RoleRow[]>(
      "SELECT id, is_system FROM roles WHERE id = ?",
      [id]
    )
    
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }
    
    if (role.is_system) {
      return NextResponse.json(
        { error: "Cannot delete system roles" },
        { status: 400 }
      )
    }
    
    // Check if role is in use
    const [usageCount] = await query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM users WHERE role_id = ?",
      [id]
    )
    
    if (usageCount.count > 0) {
      return NextResponse.json(
        { error: "Cannot delete role that is assigned to users" },
        { status: 400 }
      )
    }
    
    await query<ResultSetHeader>("DELETE FROM roles WHERE id = ?", [id])
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/roles/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete role" }, { status: 500 })
  }
}
