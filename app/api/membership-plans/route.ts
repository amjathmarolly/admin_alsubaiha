import { NextRequest, NextResponse } from "next/server"
import { query, type ResultSetHeader } from "@/lib/db/config"

export async function GET(req: NextRequest) {
  try {
    console.log("[v0] Fetching membership plans")
    
    const membershipPlans = await query<any[]>(
      "SELECT * FROM membership_plans ORDER BY tier_level ASC"
    )
    
    console.log(`[v0] Found ${membershipPlans.length} membership plans`)
    
    return NextResponse.json({
      success: true,
      data: membershipPlans,
      count: membershipPlans.length
    })
  } catch (error: any) {
    console.error("[v0] Error fetching membership plans:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to fetch membership plans" 
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, tier_level, description, min_purchase, max_purchase, discount_percentage, color, icon } = body
    
    console.log("[v0] Creating membership plan:", name)
    
    // Validate required fields
    if (!name || tier_level === undefined || discount_percentage === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }
    
    // Check if tier already exists
    const existing = await query<any[]>(
      "SELECT id FROM membership_plans WHERE tier_level = ?",
      [tier_level]
    )
    
    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "Tier level already exists" },
        { status: 400 }
      )
    }
    
    const id = require("crypto").randomUUID()
    
    const result = await query<ResultSetHeader>(
      `INSERT INTO membership_plans (id, name, tier_level, description, min_purchase, max_purchase, discount_percentage, color, icon, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [id, name, tier_level, description, min_purchase, max_purchase || null, discount_percentage, color || "gray", icon || null]
    )
    
    console.log("[v0] Membership plan created:", id)
    
    return NextResponse.json({
      success: true,
      data: {
        id,
        name,
        tier_level,
        description,
        min_purchase,
        max_purchase,
        discount_percentage,
        color,
        icon,
        status: "active"
      }
    })
  } catch (error: any) {
    console.error("[v0] Error creating membership plan:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to create membership plan" 
      },
      { status: 500 }
    )
  }
}
