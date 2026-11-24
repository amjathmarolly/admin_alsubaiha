import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface DiscountRow extends RowDataPacket {
  id: string
  code: string
  description: string | null
  type: "percentage" | "fixed" | "shipping" | "bogo"
  value: number
  min_purchase: number
  max_discount: number | null
  usage_limit: number | null
  usage_count: number
  usage_per_customer: number
  status: "active" | "inactive" | "expired"
  starts_at: Date | null
  expires_at: Date | null
  applicable_products: string | null
  applicable_categories: string | null
}

// GET /api/discounts/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const [discount] = await query<DiscountRow[]>(
      "SELECT * FROM discounts WHERE id = ? OR code = ?",
      [id, id.toUpperCase()]
    )
    
    if (!discount) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 })
    }
    
    // Get usage stats
    const usageStats = await query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as total_uses,
        SUM(discount_amount) as total_savings,
        COUNT(DISTINCT customer_id) as unique_customers
       FROM discount_usage WHERE discount_id = ?`,
      [discount.id]
    )
    
    return NextResponse.json({
      ...discount,
      applicable_products: discount.applicable_products ? JSON.parse(discount.applicable_products) : null,
      applicable_categories: discount.applicable_categories ? JSON.parse(discount.applicable_categories) : null,
      usageStats: usageStats[0] || null,
    })
  } catch (error) {
    console.error("GET /api/discounts/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch discount" }, { status: 500 })
  }
}

// PUT /api/discounts/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const [current] = await query<DiscountRow[]>(
      "SELECT * FROM discounts WHERE id = ?",
      [id]
    )
    
    if (!current) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 })
    }
    
    const {
      description,
      type,
      value,
      minPurchase,
      maxDiscount,
      usageLimit,
      usagePerCustomer,
      status,
      startsAt,
      expiresAt,
      applicableProducts,
      applicableCategories,
    } = body
    
    await query<ResultSetHeader>(
      `UPDATE discounts SET
        description = ?,
        type = COALESCE(?, type),
        value = COALESCE(?, value),
        min_purchase = COALESCE(?, min_purchase),
        max_discount = ?,
        usage_limit = ?,
        usage_per_customer = COALESCE(?, usage_per_customer),
        status = COALESCE(?, status),
        starts_at = ?,
        expires_at = ?,
        applicable_products = ?,
        applicable_categories = ?
      WHERE id = ?`,
      [
        description !== undefined ? description : current.description,
        type,
        value,
        minPurchase,
        maxDiscount !== undefined ? maxDiscount : current.max_discount,
        usageLimit !== undefined ? usageLimit : current.usage_limit,
        usagePerCustomer,
        status,
        startsAt !== undefined ? startsAt : current.starts_at,
        expiresAt !== undefined ? expiresAt : current.expires_at,
        applicableProducts ? JSON.stringify(applicableProducts) : current.applicable_products,
        applicableCategories ? JSON.stringify(applicableCategories) : current.applicable_categories,
        id,
      ]
    )
    
    const [updated] = await query<DiscountRow[]>(
      "SELECT * FROM discounts WHERE id = ?",
      [id]
    )
    
    return NextResponse.json({
      ...updated,
      applicable_products: updated.applicable_products ? JSON.parse(updated.applicable_products) : null,
      applicable_categories: updated.applicable_categories ? JSON.parse(updated.applicable_categories) : null,
    })
  } catch (error) {
    console.error("PUT /api/discounts/[id] error:", error)
    return NextResponse.json({ error: "Failed to update discount" }, { status: 500 })
  }
}

// DELETE /api/discounts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const [discount] = await query<DiscountRow[]>(
      "SELECT id FROM discounts WHERE id = ?",
      [id]
    )
    
    if (!discount) {
      return NextResponse.json({ error: "Discount not found" }, { status: 404 })
    }
    
    await query<ResultSetHeader>("DELETE FROM discounts WHERE id = ?", [id])
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/discounts/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete discount" }, { status: 500 })
  }
}
