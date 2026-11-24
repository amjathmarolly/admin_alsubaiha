import { NextRequest, NextResponse } from "next/server"
import { setupMembershipPlans } from "@/scripts/setup-membership-plans"

export async function POST(req: NextRequest) {
  try {
    console.log("[Setup API] Starting membership plans setup...")
    
    const success = await setupMembershipPlans()
    
    if (success) {
      return NextResponse.json(
        {
          success: true,
          message: "Membership plans table and default tiers set up successfully",
        },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to set up membership plans",
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("[Setup API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to set up membership plans",
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      message: "POST to this endpoint to set up membership plans",
      endpoint: "/api/setup/membership-plans",
    },
    { status: 200 }
  )
}
