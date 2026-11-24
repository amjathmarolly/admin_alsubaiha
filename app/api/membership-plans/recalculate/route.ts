import { NextRequest, NextResponse } from "next/server"
import { query, type ResultSetHeader } from "@/lib/db/config"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customerId } = body
    
    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "customerId is required" },
        { status: 400 }
      )
    }
    
    console.log("[v0] Recalculating membership for customer:", customerId)
    
    // Get customer's total spent
    const customers = await query<any[]>(
      "SELECT id, total_spent FROM customers WHERE id = ?",
      [customerId]
    )
    
    if (customers.length === 0) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      )
    }
    
    const customer = customers[0]
    const totalSpent = parseFloat(customer.total_spent) || 0
    
    console.log("[v0] Customer total spent:", totalSpent)
    
    // Find matching membership tier
    const tiers = await query<any[]>(
      `SELECT id, name, tier_level, discount_percentage, min_purchase, max_purchase
       FROM membership_plans 
       WHERE status = 'active'
       AND min_purchase <= ?
       AND (max_purchase IS NULL OR max_purchase >= ?)
       ORDER BY tier_level DESC
       LIMIT 1`,
      [totalSpent, totalSpent]
    )
    
    if (tiers.length === 0) {
      return NextResponse.json(
        { success: false, error: "No matching membership tier found" },
        { status: 400 }
      )
    }
    
    const tier = tiers[0]
    
    console.log("[v0] Assigning tier:", tier.name)
    
    // Update customer membership
    await query<ResultSetHeader>(
      `UPDATE customers 
       SET membership_tier_id = ?, last_membership_recalculated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [tier.id, customerId]
    )
    
    console.log("[v0] Membership updated for customer:", customerId)
    
    return NextResponse.json({
      success: true,
      data: {
        customerId,
        totalSpent,
        membershipTier: {
          id: tier.id,
          name: tier.name,
          tierLevel: tier.tier_level,
          discountPercentage: tier.discount_percentage,
          minPurchase: tier.min_purchase,
          maxPurchase: tier.max_purchase
        }
      }
    })
  } catch (error: any) {
    console.error("[v0] Error recalculating membership:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to recalculate membership" 
      },
      { status: 500 }
    )
  }
}

// Bulk recalculate all customers
export async function PUT(req: NextRequest) {
  try {
    console.log("[v0] Bulk recalculating memberships for all customers")
    
    // Get all customers with total_spent
    const customers = await query<any[]>(
      "SELECT id, total_spent FROM customers WHERE total_spent > 0"
    )
    
    console.log("[v0] Processing", customers.length, "customers")
    
    let updated = 0
    let errors = 0
    
    for (const customer of customers) {
      try {
        const totalSpent = parseFloat(customer.total_spent) || 0
        
        // Find matching tier
        const tiers = await query<any[]>(
          `SELECT id FROM membership_plans 
           WHERE status = 'active'
           AND min_purchase <= ?
           AND (max_purchase IS NULL OR max_purchase >= ?)
           ORDER BY tier_level DESC
           LIMIT 1`,
          [totalSpent, totalSpent]
        )
        
        if (tiers.length > 0) {
          await query<ResultSetHeader>(
            `UPDATE customers 
             SET membership_tier_id = ?, last_membership_recalculated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [tiers[0].id, customer.id]
          )
          updated++
        }
      } catch (err) {
        console.error("[v0] Error processing customer:", customer.id, err)
        errors++
      }
    }
    
    console.log("[v0] Bulk recalculation complete. Updated:", updated, "Errors:", errors)
    
    return NextResponse.json({
      success: true,
      data: {
        totalCustomers: customers.length,
        updated,
        errors
      }
    })
  } catch (error: any) {
    console.error("[v0] Error in bulk recalculation:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to bulk recalculate memberships" 
      },
      { status: 500 }
    )
  }
}
