import { NextRequest, NextResponse } from "next/server"
import { query, getPaginationSQL, type PaginatedResult, type PaginationParams } from "@/lib/db/config"
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
  membership_tier_id: string | null
  created_at: Date
  updated_at: Date
  // Membership tier fields
  tier_id?: string
  tier_name?: string
  tier_level?: number
  min_purchase?: number
  max_purchase?: number | null
  discount_percentage?: number
  color?: string
  tier_icon?: string | null
  tier_status?: string
}

interface CountRow extends RowDataPacket {
  total: number
}

const ALLOWED_SORT_FIELDS = ["name", "email", "total_orders", "total_spent", "created_at"]

// GET /api/customers - List all customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const params: PaginationParams = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      sortBy: searchParams.get("sortBy") || "created_at",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    }
    
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const minSpent = searchParams.get("minSpent") || ""
    const maxSpent = searchParams.get("maxSpent") || ""
    
    const conditions: string[] = []
    const values: unknown[] = []
    
    if (search) {
      conditions.push("(name LIKE ? OR email LIKE ? OR phone LIKE ?)")
      values.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    
    if (status) {
      conditions.push("status = ?")
      values.push(status)
    }
    
    if (minSpent) {
      conditions.push("total_spent >= ?")
      values.push(parseFloat(minSpent))
    }
    
    if (maxSpent) {
      conditions.push("total_spent <= ?")
      values.push(parseFloat(maxSpent))
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
    const { orderSQL, limitSQL, limit } = getPaginationSQL(params, ALLOWED_SORT_FIELDS)
    
    const countResult = await query<CountRow[]>(
      `SELECT COUNT(*) as total FROM customers ${whereClause}`,
      values
    )
    const total = countResult[0]?.total || 0
    
    const customers = await query<CustomerRow[]>(
      `SELECT 
        c.id, c.name, c.email, c.phone, c.avatar, c.address_line1, c.address_line2, 
        c.city, c.state, c.postal_code, c.country, c.total_orders, c.total_spent, 
        c.tags, c.notes, c.status, c.membership_tier_id, c.created_at, c.updated_at,
        mp.id as tier_id, mp.name as tier_name, mp.tier_level, mp.min_purchase, 
        mp.max_purchase, mp.discount_percentage, mp.color, mp.icon as tier_icon, mp.status as tier_status
      FROM customers c
      LEFT JOIN membership_plans mp ON c.membership_tier_id = mp.id
      ${whereClause} ${orderSQL || "ORDER BY c.created_at DESC"} ${limitSQL}`,
      values
    )
    
    const result: PaginatedResult<any> = {
      data: customers.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        avatar: c.avatar,
        address_line1: c.address_line1,
        address_line2: c.address_line2,
        city: c.city,
        state: c.state,
        postal_code: c.postal_code,
        country: c.country,
        total_orders: c.total_orders,
        total_spent: c.total_spent,
        tags: c.tags ? JSON.parse(c.tags) : [],
        notes: c.notes,
        status: c.status,
        membership_tier_id: c.membership_tier_id,
        created_at: c.created_at,
        updated_at: c.updated_at,
        membership_tier: c.tier_id ? {
          id: c.tier_id,
          name: c.tier_name,
          tier_level: c.tier_level,
          min_purchase: c.min_purchase,
          max_purchase: c.max_purchase,
          discount_percentage: c.discount_percentage,
          color: c.color,
          icon: c.tier_icon,
          status: c.tier_status,
        } : null,
      })),
      pagination: {
        page: params.page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
    
    return NextResponse.json(result)
  } catch (error) {
    const err = error as Error
    console.error("GET /api/customers error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to fetch customers" },
      { status: 500 }
    )
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
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
    } = body
    
    if (!email || !name) {
      return NextResponse.json(
        { error: "Email and name are required" },
        { status: 400 }
      )
    }
    
    const customerId = `cust-${Date.now()}`
    
    const insertQuery = `
      INSERT INTO customers (
        id, name, email, phone, avatar, address_line1, address_line2, city, state, 
        postal_code, country, status, notes, tags, total_orders, total_spent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `
    
    await query<ResultSetHeader>(insertQuery, [
      customerId,
      name,
      email,
      phone || null,
      avatar || null,
      addressLine1 || null,
      addressLine2 || null,
      city || null,
      state || null,
      postalCode || null,
      country || "United States",
      status || "active",
      notes || null,
      tags ? JSON.stringify(tags) : null,
    ])
    
    const [newCustomer] = await query<CustomerRow[]>(
      "SELECT * FROM customers WHERE id = ?",
      [customerId]
    )
    
    // Assign membership tier based on initial total_spent (will be 0, so Blue tier)
    try {
      console.log("[v0] New customer created, assigning initial membership tier")
      await assignMembershipTier(customerId)
    } catch (error: any) {
      console.error("[v0] Error assigning initial membership tier:", error.message)
      // Don't fail the customer creation if tier assignment fails
    }
    
    return NextResponse.json(newCustomer, { status: 201 })
  } catch (error: unknown) {
    console.error("POST /api/customers error:", error)
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A customer with this email already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
  }
}
