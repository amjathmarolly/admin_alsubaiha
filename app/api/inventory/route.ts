import { NextRequest, NextResponse } from "next/server"
import { query, getPaginationSQL, type PaginatedResult, type PaginationParams } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface InventoryRow extends RowDataPacket {
  id: string
  product_id: string
  product_name: string
  product_sku: string
  category_name: string | null
  stock: number
  reserved: number
  incoming: number
  available: number
  reorder_point: number
  reorder_quantity: number
  location: string | null
  status: "in_stock" | "low_stock" | "out_of_stock"
  last_counted_at: Date | null
  created_at: Date
  updated_at: Date
}

interface CountRow extends RowDataPacket {
  total: number
}

const ALLOWED_SORT_FIELDS = ["product_name", "stock", "available", "updated_at"]

// GET /api/inventory - List inventory with product info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const params: PaginationParams = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      sortBy: searchParams.get("sortBy") || "updated_at",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    }
    
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const category = searchParams.get("category") || ""
    
    const conditions: string[] = []
    const values: unknown[] = []
    
    if (search) {
      conditions.push("(p.name LIKE ? OR p.sku LIKE ?)")
      values.push(`%${search}%`, `%${search}%`)
    }
    
    if (status === "low_stock") {
      conditions.push("p.stock <= p.low_stock_threshold AND p.stock > 0")
    } else if (status === "out_of_stock") {
      conditions.push("p.stock <= 0")
    } else if (status === "in_stock") {
      conditions.push("p.stock > p.low_stock_threshold")
    }
    
    if (category) {
      conditions.push("p.category_id = ?")
      values.push(category)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
    const { orderSQL, limitSQL, limit } = getPaginationSQL(params, ALLOWED_SORT_FIELDS)
    
    const countResult = await query<CountRow[]>(
      `SELECT COUNT(*) as total FROM products p ${whereClause}`,
      values
    )
    const total = countResult[0]?.total || 0
    
    const inventoryQuery = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku as product_sku,
        c.name as category_name,
        p.stock,
        p.reserved_stock as reserved,
        COALESCE(i.incoming, 0) as incoming,
        (p.stock - p.reserved_stock) as available,
        COALESCE(i.reorder_point, p.low_stock_threshold) as reorder_point,
        COALESCE(i.reorder_quantity, 50) as reorder_quantity,
        i.location,
        CASE 
          WHEN p.stock <= 0 THEN 'out_of_stock'
          WHEN p.stock <= p.low_stock_threshold THEN 'low_stock'
          ELSE 'in_stock'
        END as status,
        i.last_counted_at,
        p.updated_at
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ${orderSQL || "ORDER BY p.updated_at DESC"}
      ${limitSQL}
    `
    
    const inventory = await query<InventoryRow[]>(inventoryQuery, values)
    
    const result: PaginatedResult<InventoryRow> = {
      data: inventory,
      pagination: {
        page: params.page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("GET /api/inventory error:", error)
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 })
  }
}

// POST /api/inventory/adjust - Adjust stock
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      productId,
      adjustment,
      type,
      reason,
      userId,
    } = body
    
    if (!productId || adjustment === undefined || !type) {
      return NextResponse.json(
        { error: "Product ID, adjustment amount, and type are required" },
        { status: 400 }
      )
    }
    
    // Get current stock
    const [product] = await query<RowDataPacket[]>(
      "SELECT id, stock FROM products WHERE id = ?",
      [productId]
    )
    
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }
    
    const quantityBefore = product.stock
    const quantityAfter = quantityBefore + adjustment
    
    if (quantityAfter < 0) {
      return NextResponse.json(
        { error: "Stock cannot be negative" },
        { status: 400 }
      )
    }
    
    // Update product stock
    await query<ResultSetHeader>(
      "UPDATE products SET stock = ? WHERE id = ?",
      [quantityAfter, productId]
    )
    
    // Log the adjustment
    await query<ResultSetHeader>(
      `INSERT INTO inventory_logs (product_id, type, quantity_change, quantity_before, quantity_after, reason, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [productId, type, adjustment, quantityBefore, quantityAfter, reason || null, userId || null]
    )
    
    return NextResponse.json({
      productId,
      quantityBefore,
      quantityAfter,
      adjustment,
      type,
    })
  } catch (error) {
    console.error("POST /api/inventory error:", error)
    return NextResponse.json({ error: "Failed to adjust inventory" }, { status: 500 })
  }
}
