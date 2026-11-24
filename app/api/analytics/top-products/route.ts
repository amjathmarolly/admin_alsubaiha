import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"

// GET /api/analytics/top-products - Get top selling products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "10")
    
    const products = await query<RowDataPacket[]>(
      `SELECT 
        oi.product_id as id,
        oi.product_name as name,
        SUM(oi.total_price) as revenue,
        SUM(oi.quantity) as quantity
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status != 'cancelled'
       GROUP BY oi.product_id, oi.product_name
       ORDER BY revenue DESC
       LIMIT ?`,
      [limit]
    )
    
    return NextResponse.json(products)
  } catch (error) {
    console.error("GET /api/analytics/top-products error:", error)
    return NextResponse.json({ error: "Failed to fetch top products" }, { status: 500 })
  }
}
