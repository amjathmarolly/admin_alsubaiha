import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface TeamMemberRow extends RowDataPacket {
  id: string
  user_id: string | null
  name: string
  email: string
  role_id: string | null
  status: "active" | "invited" | "inactive"
}

// GET /api/team/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const [member] = await query<TeamMemberRow[]>(
      `SELECT tm.*, r.name as role_name
       FROM team_members tm
       LEFT JOIN roles r ON tm.role_id = r.id
       WHERE tm.id = ?`,
      [id]
    )
    
    if (!member) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 })
    }
    
    return NextResponse.json(member)
  } catch (error) {
    console.error("GET /api/team/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch team member" }, { status: 500 })
  }
}

// PUT /api/team/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const [current] = await query<TeamMemberRow[]>(
      "SELECT * FROM team_members WHERE id = ?",
      [id]
    )
    
    if (!current) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 })
    }
    
    const { name, roleId, status } = body
    
    await query<ResultSetHeader>(
      `UPDATE team_members SET
        name = COALESCE(?, name),
        role_id = ?,
        status = COALESCE(?, status),
        joined_at = CASE WHEN ? = 'active' AND joined_at IS NULL THEN NOW() ELSE joined_at END
      WHERE id = ?`,
      [name, roleId !== undefined ? roleId : current.role_id, status, status, id]
    )
    
    // If status changed to active and user_id is null, create user account
    if (status === "active" && !current.user_id) {
      // In production, send activation email with password setup
      // For now, we'll just update the status
    }
    
    const [updated] = await query<TeamMemberRow[]>(
      `SELECT tm.*, r.name as role_name
       FROM team_members tm
       LEFT JOIN roles r ON tm.role_id = r.id
       WHERE tm.id = ?`,
      [id]
    )
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error("PUT /api/team/[id] error:", error)
    return NextResponse.json({ error: "Failed to update team member" }, { status: 500 })
  }
}

// DELETE /api/team/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const [member] = await query<TeamMemberRow[]>(
      "SELECT id FROM team_members WHERE id = ?",
      [id]
    )
    
    if (!member) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 })
    }
    
    await query<ResultSetHeader>("DELETE FROM team_members WHERE id = ?", [id])
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/team/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete team member" }, { status: 500 })
  }
}
