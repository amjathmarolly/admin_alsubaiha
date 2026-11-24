import { NextRequest, NextResponse } from "next/server"
import { assignMembershipTier, getCustomerMembershipTier } from "@/lib/membership-utils"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params

    console.log("[v0] Fetching membership tier for customer:", customerId)

    // Get customer membership details
    const customerTier = await getCustomerMembershipTier(customerId)

    if (!customerTier) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        customerId,
        name: customerTier.name,
        totalSpent: customerTier.total_spent,
        membershipTier: {
          id: customerTier.tier_id,
          name: customerTier.tier_name,
          level: customerTier.tier_level,
          discountPercentage: customerTier.discount_percentage,
          minPurchase: customerTier.min_purchase,
          maxPurchase: customerTier.max_purchase,
          color: customerTier.color,
        },
      },
    })
  } catch (error: any) {
    console.error("[v0] Error fetching membership tier:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch membership tier",
      },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { customerId } = await params

    console.log("[v0] Assigning membership tier for customer:", customerId)

    // Assign or update membership tier
    const result = await assignMembershipTier(customerId)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error("[v0] Error assigning membership tier:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to assign membership tier",
      },
      { status: 500 }
    )
  }
}
