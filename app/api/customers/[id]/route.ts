import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import { assignMembershipTier } from "@/lib/membership-utils"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface CustomerRow extends RowDataPacket {
  id: string
  name: string
  email: string
  phone: string | null
  avatar: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string
  total_orders: number
  total_spent: number
  tags: string | null
  notes: string | null
  status: "active" | "inactive" | "blocked"
  created_at: Date
  updated_at: Date
}

// GET /api/customers/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const [customer] = await query<any[]>(
      `SELECT c.*, 
              mp.id as tier_id, mp.name as tier_name, mp.tier_level, mp.min_purchase, 
              mp.max_purchase, mp.discount_percentage, mp.color, mp.icon as tier_icon
       FROM customers c
       LEFT JOIN membership_plans mp ON c.membership_tier_id = mp.id
       WHERE c.id = ? OR c.email = ?`,
      [id, id]
    )
    
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }
    
    // Get recent orders
    const orders = await query<RowDataPacket[]>(
      `SELECT id, order_number, total, status, created_at 
       FROM orders WHERE customer_id = ? 
       ORDER BY created_at DESC LIMIT 10`,
      [customer.id]
    )
    
    return NextResponse.json({
      ...customer,
      tags: customer.tags ? JSON.parse(customer.tags) : [],
      recentOrders: orders,
      membership_tier: customer.tier_id ? {
        id: customer.tier_id,
        name: customer.tier_name,
        tier_level: customer.tier_level,
        min_purchase: customer.min_purchase,
        max_purchase: customer.max_purchase,
        discount_percentage: customer.discount_percentage,
        color: customer.color,
        icon: customer.tier_icon,
      } : null,
    })
  } catch (error) {
    const err = error as Error
    console.error("GET /api/customers/[id] error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to fetch customer" },
      { status: 500 }
    )
  }
}

// PUT /api/customers/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const [current] = await query<CustomerRow[]>(
      "SELECT * FROM customers WHERE id = ?",
      [id]
    )
    
    if (!current) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }
    
    const {
      name,
      phone,
      avatar,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      status,
      notes,
      tags,
      total_spent,
    } = body
    
    await query<ResultSetHeader>(
      `UPDATE customers SET
        name = COALESCE(?, name),
        phone = ?,
        avatar = ?,
        address_line1 = ?,
        address_line2 = ?,
        city = ?,
        state = ?,
        postal_code = ?,
        country = COALESCE(?, country),
        status = COALESCE(?, status),
        notes = ?,
        tags = ?,
        total_spent = COALESCE(?, total_spent)
      WHERE id = ?`,
      [
        name !== undefined ? name : current.name,
        phone !== undefined ? phone : current.phone,
        avatar !== undefined ? avatar : current.avatar,
        addressLine1 !== undefined ? addressLine1 : current.address_line1,
        addressLine2 !== undefined ? addressLine2 : current.address_line2,
        city !== undefined ? city : current.city,
        state !== undefined ? state : current.state,
        postalCode !== undefined ? postalCode : current.postal_code,
        country !== undefined ? country : current.country,
        status !== undefined ? status : current.status,
        notes !== undefined ? notes : current.notes,
        tags !== undefined ? (tags ? JSON.stringify(tags) : null) : current.tags,
        total_spent !== undefined ? total_spent : current.total_spent,
        id,
      ]
    )

    // If total_spent was updated, recalculate membership tier
    if (total_spent !== undefined && total_spent !== current.total_spent) {
      try {
        console.log("[v0] Total spent changed, recalculating membership tier for customer:", id)
        await assignMembershipTier(id)
      } catch (error: any) {
        console.error("[v0] Error assigning membership tier:", error.message)
        // Don't fail the update operation if membership assignment fails
      }
    }
    
    const [updated] = await query<CustomerRow[]>(
      "SELECT * FROM customers WHERE id = ?",
      [id]
    )
    
    return NextResponse.json({
      ...updated,
      tags: updated.tags ? JSON.parse(updated.tags) : [],
    })
  } catch (error) {
    const err = error as Error
    console.error("PUT /api/customers/[id] error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to update customer" },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const [customer] = await query<CustomerRow[]>(
      "SELECT id FROM customers WHERE id = ?",
      [id]
    )
    
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }
    
    await query<ResultSetHeader>("DELETE FROM customers WHERE id = ?", [id])
    
    return NextResponse.json({ success: true })
  } catch (error) {
    const err = error as Error
    console.error("DELETE /api/customers/[id] error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to delete customer" },
      { status: 500 }
    )
  }
}
