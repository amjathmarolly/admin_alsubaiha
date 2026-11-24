import { query, type ResultSetHeader } from "@/lib/db/config"

interface MembershipTierAssignmentResult {
  success: boolean
  customerId: string
  totalSpent: number
  membershipTierId: string
  membershipTierName: string
  discountPercentage: number
  message: string
}

/**
 * Automatically assign or update a customer's membership tier based on total purchases
 * This should be called:
 * 1. After an order is confirmed/paid
 * 2. When viewing customer details
 * 3. During bulk recalculation
 */
export async function assignMembershipTier(
  customerId: string
): Promise<MembershipTierAssignmentResult> {
  try {
    console.log("[v0] Assigning membership tier for customer:", customerId)

    // Get customer's total spent
    const customers = await query<any[]>(
      "SELECT id, total_spent, name FROM customers WHERE id = ?",
      [customerId]
    )

    if (customers.length === 0) {
      throw new Error("Customer not found")
    }

    const customer = customers[0]
    const totalSpent = parseFloat(customer.total_spent) || 0

    console.log("[v0] Customer total spent:", totalSpent)

    // Find the appropriate membership tier
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
      throw new Error("No matching membership tier found")
    }

    const tier = tiers[0]

    console.log("[v0] Assigning tier:", tier.name, "to customer:", customerId)

    // Update customer's membership tier
    const result = await query<ResultSetHeader>(
      `UPDATE customers 
       SET membership_tier_id = ?, last_membership_recalculated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [tier.id, customerId]
    )

    if (result.affectedRows === 0) {
      throw new Error("Failed to update customer membership tier")
    }

    console.log("[v0] Membership tier assigned successfully")

    return {
      success: true,
      customerId,
      totalSpent,
      membershipTierId: tier.id,
      membershipTierName: tier.name,
      discountPercentage: tier.discount_percentage,
      message: `Customer ${customer.name} assigned to ${tier.name} membership with ${tier.discount_percentage}% discount`,
    }
  } catch (error: any) {
    console.error("[v0] Error assigning membership tier:", error.message)
    throw error
  }
}

/**
 * Get customer's current membership tier details
 */
export async function getCustomerMembershipTier(customerId: string) {
  try {
    const customers = await query<any[]>(
      `SELECT c.id, c.name, c.total_spent, c.membership_tier_id,
              mp.id as tier_id, mp.name as tier_name, mp.tier_level, 
              mp.discount_percentage, mp.min_purchase, mp.max_purchase, mp.color
       FROM customers c
       LEFT JOIN membership_plans mp ON c.membership_tier_id = mp.id
       WHERE c.id = ?`,
      [customerId]
    )

    if (customers.length === 0) {
      return null
    }

    return customers[0]
  } catch (error) {
    console.error("[v0] Error getting customer membership tier:", error)
    throw error
  }
}

/**
 * Get all membership tiers for customer assignment
 */
export async function getAllActiveMembershipTiers() {
  try {
    const tiers = await query<any[]>(
      `SELECT id, name, tier_level, description, min_purchase, max_purchase, 
              discount_percentage, color, icon, status, created_at
       FROM membership_plans
       WHERE status = 'active'
       ORDER BY tier_level ASC`
    )

    return tiers
  } catch (error) {
    console.error("[v0] Error getting membership tiers:", error)
    throw error
  }
}

/**
 * Bulk assign membership tiers to all customers
 * Useful for data migration or fixing tier assignments
 */
export async function bulkAssignMembershipTiers() {
  try {
    console.log("[v0] Starting bulk membership tier assignment")

    // Get all customers with purchases
    const customers = await query<any[]>(
      "SELECT id FROM customers WHERE total_spent > 0 ORDER BY total_spent DESC"
    )

    console.log("[v0] Processing", customers.length, "customers")

    let successCount = 0
    let errorCount = 0
    const errors: any[] = []

    for (const customer of customers) {
      try {
        await assignMembershipTier(customer.id)
        successCount++
      } catch (error: any) {
        errorCount++
        errors.push({
          customerId: customer.id,
          error: error.message,
        })
        console.error(`[v0] Error processing customer ${customer.id}:`, error.message)
      }
    }

    console.log(
      "[v0] Bulk assignment complete. Success:",
      successCount,
      "Errors:",
      errorCount
    )

    return {
      totalProcessed: customers.length,
      successCount,
      errorCount,
      errors,
    }
  } catch (error) {
    console.error("[v0] Error in bulk membership assignment:", error)
    throw error
  }
}

/**
 * Calculate what tier a customer would be assigned based on total spent
 * Useful for previews and recommendations
 */
export async function calculateMembershipTierForAmount(totalSpent: number) {
  try {
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
      return null
    }

    return tiers[0]
  } catch (error) {
    console.error("[v0] Error calculating membership tier:", error)
    throw error
  }
}
