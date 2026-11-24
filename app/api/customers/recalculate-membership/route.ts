import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import { assignMembershipTier, bulkAssignMembershipTiers } from "@/lib/membership-utils"
import type { RowDataPacket } from "mysql2"

// POST /api/customers/recalculate-membership - Recalculate membership for one or all customers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, bulkRecalculate } = body

    console.log("[v0] Recalculate membership request:", { customerId, bulkRecalculate })

    if (bulkRecalculate) {
      // Bulk recalculate all customers
      console.log("[v0] Starting bulk membership recalculation for all customers")

      const result = await bulkAssignMembershipTiers()

      return NextResponse.json({
        success: true,
        message: "Bulk membership recalculation completed",
        ...result,
      })
    } else if (customerId) {
      // Recalculate for specific customer
      console.log("[v0] Recalculating membership for customer:", customerId)

      // Verify customer exists
      const customers = await query<any[]>(
        "SELECT id, name, total_spent FROM customers WHERE id = ?",
        [customerId]
      )

      if (customers.length === 0) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        )
      }

      const result = await assignMembershipTier(customerId)

      return NextResponse.json({
        success: true,
        message: `Membership tier recalculated for ${customers[0].name}`,
        ...result,
      })
    } else {
      return NextResponse.json(
        { error: "Please provide either customerId or bulkRecalculate parameter" },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("[v0] Error in recalculate membership:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to recalculate membership" },
      { status: 500 }
    )
  }
}

// GET /api/customers/recalculate-membership - Get recalculation stats
export async function GET(request: NextRequest) {
  try {
    // Get customers with mismatched tiers (customers whose total_spent doesn't match their tier)
    const mismatchedCustomers = await query<any[]>(
      `SELECT c.id, c.name, c.total_spent, c.membership_tier_id,
              mp.id as tier_id, mp.name as tier_name, mp.min_purchase, mp.max_purchase,
              CASE 
                WHEN c.total_spent >= mp.min_purchase AND (mp.max_purchase IS NULL OR c.total_spent <= mp.max_purchase) THEN 'correct'
                ELSE 'mismatch'
              END as tier_status
       FROM customers c
       LEFT JOIN membership_plans mp ON c.membership_tier_id = mp.id
       HAVING tier_status = 'mismatch'
       ORDER BY c.total_spent DESC
       LIMIT 100`
    )

    // Get summary stats
    const stats = await query<any[]>(
      `SELECT 
        COUNT(*) as total_customers,
        SUM(CASE WHEN membership_tier_id IS NOT NULL THEN 1 ELSE 0 END) as assigned_tiers,
        SUM(CASE WHEN membership_tier_id IS NULL THEN 1 ELSE 0 END) as unassigned_tiers,
        AVG(total_spent) as avg_spent,
        MAX(total_spent) as max_spent,
        MIN(total_spent) as min_spent
      FROM customers`
    )

    return NextResponse.json({
      summary: stats[0],
      mismatchedCustomers,
      totalMismatched: mismatchedCustomers.length,
    })
  } catch (error: any) {
    console.error("[v0] Error getting recalculation stats:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to get stats" },
      { status: 500 }
    )
  }
}
