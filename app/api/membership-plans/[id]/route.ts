import { NextRequest, NextResponse } from "next/server"
import { query, type ResultSetHeader } from "@/lib/db/config"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    console.log("[v0] Fetching membership plan:", id)

    const membershipPlans = await query<any[]>(
      "SELECT * FROM membership_plans WHERE id = ?",
      [id]
    )

    if (membershipPlans.length === 0) {
      return NextResponse.json(
        { success: false, error: "Membership plan not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: membershipPlans[0]
    })
  } catch (error: any) {
    console.error("[v0] Error fetching membership plan:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch membership plan"
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const { name, description, min_purchase, max_purchase, discount_percentage, color, icon, status } = body

    console.log("[v0] Updating membership plan:", id)

    // Check if exists
    const existing = await query<any[]>(
      "SELECT id FROM membership_plans WHERE id = ?",
      [id]
    )

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Membership plan not found" },
        { status: 404 }
      )
    }

    await query<ResultSetHeader>(
      `UPDATE membership_plans 
       SET name = ?, description = ?, min_purchase = ?, max_purchase = ?, discount_percentage = ?, color = ?, icon = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, description, min_purchase, max_purchase || null, discount_percentage, color, icon || null, status, id]
    )

    console.log("[v0] Membership plan updated:", id)

    return NextResponse.json({
      success: true,
      message: "Membership plan updated successfully"
    })
  } catch (error: any) {
    console.error("[v0] Error updating membership plan:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update membership plan"
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    console.log("[v0] Deleting membership plan:", id)

    // Check if exists
    const existing = await query<any[]>(
      "SELECT id FROM membership_plans WHERE id = ?",
      [id]
    )

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Membership plan not found" },
        { status: 404 }
      )
    }

    // Check if any customers have this membership
    const customers = await query<any[]>(
      "SELECT COUNT(*) as count FROM customers WHERE membership_tier_id = ?",
      [id]
    )

    if (customers[0]?.count > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete membership plan with active customers" },
        { status: 400 }
      )
    }

    await query<ResultSetHeader>(
      "DELETE FROM membership_plans WHERE id = ?",
      [id]
    )

    console.log("[v0] Membership plan deleted:", id)

    return NextResponse.json({
      success: true,
      message: "Membership plan deleted successfully"
    })
  } catch (error: any) {
    console.error("[v0] Error deleting membership plan:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete membership plan"
      },
      { status: 500 }
    )
  }
}
