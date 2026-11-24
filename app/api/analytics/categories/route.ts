import { NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"

// GET /api/analytics/categories - Get category breakdown
export async function GET() {
  try {
    const categories = await query<RowDataPacket[]>(
      `SELECT 
        COALESCE(c.name, 'Uncategorized') as category,
        SUM(oi.total_price) as revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE o.status != 'cancelled'
       GROUP BY c.id, c.name
       ORDER BY revenue DESC`
    )
    
    // Calculate percentages
    const totalRevenue = categories.reduce((sum, c) => sum + Number(c.revenue), 0)
    const result = categories.map(c => ({
      category: c.category,
      revenue: Number(c.revenue),
      percentage: totalRevenue > 0 ? Math.round((Number(c.revenue) / totalRevenue) * 1000) / 10 : 0,
    }))
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("GET /api/analytics/categories error:", error)
    return NextResponse.json({ error: "Failed to fetch category breakdown" }, { status: 500 })
  }
}
