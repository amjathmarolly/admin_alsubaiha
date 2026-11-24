import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface TeamMemberRow extends RowDataPacket {
  id: string
  user_id: string | null
  name: string
  email: string
  role_id: string | null
  role_name: string | null
  status: "active" | "invited" | "inactive"
  invited_by: string | null
  invited_at: Date
  joined_at: Date | null
  last_active: Date | null
}

// GET /api/team - List team members
export async function GET() {
  try {
    const members = await query<TeamMemberRow[]>(
      `SELECT 
        tm.*,
        r.name as role_name
       FROM team_members tm
       LEFT JOIN roles r ON tm.role_id = r.id
       ORDER BY tm.created_at DESC`
    )
    
    return NextResponse.json({ data: members })
  } catch (error) {
    console.error("GET /api/team error:", error)
    return NextResponse.json({ error: "Failed to fetch team members" }, { status: 500 })
  }
}

// POST /api/team - Invite a team member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, roleId, invitedBy } = body
    
    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      )
    }
    
    // Check if email already exists
    const [existing] = await query<TeamMemberRow[]>(
      "SELECT id FROM team_members WHERE email = ?",
      [email.toLowerCase()]
    )
    
    if (existing) {
      return NextResponse.json(
        { error: "A team member with this email already exists" },
        { status: 409 }
      )
    }
    
    await query<ResultSetHeader>(
      `INSERT INTO team_members (name, email, role_id, status, invited_by)
       VALUES (?, ?, ?, 'invited', ?)`,
      [name, email.toLowerCase(), roleId || null, invitedBy || null]
    )
    
    const [newMember] = await query<TeamMemberRow[]>(
      `SELECT tm.*, r.name as role_name
       FROM team_members tm
       LEFT JOIN roles r ON tm.role_id = r.id
       WHERE tm.email = ?`,
      [email.toLowerCase()]
    )
    
    return NextResponse.json(newMember, { status: 201 })
  } catch (error) {
    console.error("POST /api/team error:", error)
    return NextResponse.json({ error: "Failed to invite team member" }, { status: 500 })
  }
}
