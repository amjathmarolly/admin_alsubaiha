import { NextRequest, NextResponse } from "next/server"
import { query, getPaginationSQL, type PaginatedResult, type PaginationParams } from "@/lib/db/config"
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
  created_by: string | null
  created_at: Date
  updated_at: Date
}

interface CountRow extends RowDataPacket {
  total: number
}

const ALLOWED_SORT_FIELDS = ["code", "type", "value", "usage_count", "expires_at", "created_at"]

// GET /api/discounts - List all discounts
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
    const type = searchParams.get("type") || ""
    
    const conditions: string[] = []
    const values: unknown[] = []
    
    if (search) {
      conditions.push("(code LIKE ? OR description LIKE ?)")
      values.push(`%${search}%`, `%${search}%`)
    }
    
    if (status) {
      conditions.push("status = ?")
      values.push(status)
    }
    
    if (type) {
      conditions.push("type = ?")
      values.push(type)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
    const { orderSQL, limitSQL, limit } = getPaginationSQL(params, ALLOWED_SORT_FIELDS)
    
    const countResult = await query<CountRow[]>(
      `SELECT COUNT(*) as total FROM discounts ${whereClause}`,
      values
    )
    const total = countResult[0]?.total || 0
    
    const discounts = await query<DiscountRow[]>(
      `SELECT * FROM discounts ${whereClause} ${orderSQL || "ORDER BY created_at DESC"} ${limitSQL}`,
      values
    )
    
    const result: PaginatedResult<DiscountRow> = {
      data: discounts.map(d => ({
        ...d,
        applicable_products: d.applicable_products ? JSON.parse(d.applicable_products) : null,
        applicable_categories: d.applicable_categories ? JSON.parse(d.applicable_categories) : null,
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
    console.error("GET /api/discounts error:", error)
    return NextResponse.json({ error: "Failed to fetch discounts" }, { status: 500 })
  }
}

// POST /api/discounts - Create a discount
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      code,
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
      createdBy,
    } = body
    
    if (!code || !type || value === undefined) {
      return NextResponse.json(
        { error: "Code, type, and value are required" },
        { status: 400 }
      )
    }
    
    await query<ResultSetHeader>(
      `INSERT INTO discounts (
        code, description, type, value, min_purchase, max_discount,
        usage_limit, usage_per_customer, status, starts_at, expires_at,
        applicable_products, applicable_categories, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code.toUpperCase(),
        description || null,
        type,
        value,
        minPurchase || 0,
        maxDiscount || null,
        usageLimit || null,
        usagePerCustomer || 1,
        status || "active",
        startsAt || null,
        expiresAt || null,
        applicableProducts ? JSON.stringify(applicableProducts) : null,
        applicableCategories ? JSON.stringify(applicableCategories) : null,
        createdBy || null,
      ]
    )
    
    const [newDiscount] = await query<DiscountRow[]>(
      "SELECT * FROM discounts WHERE code = ?",
      [code.toUpperCase()]
    )
    
    return NextResponse.json(newDiscount, { status: 201 })
  } catch (error: unknown) {
    console.error("POST /api/discounts error:", error)
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A discount with this code already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Failed to create discount" }, { status: 500 })
  }
}
