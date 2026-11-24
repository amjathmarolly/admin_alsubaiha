import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"

// GET /api/analytics/revenue - Get revenue chart data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "30d"
    
    let days = 30
    switch (period) {
      case "7d": days = 7; break
      case "30d": days = 30; break
      case "90d": days = 90; break
      case "1y": days = 365; break
    }
    
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().split("T")[0]
    
    // Group by appropriate interval
    let groupBy = "DATE(created_at)"
    if (days > 90) {
      groupBy = "DATE_FORMAT(created_at, '%Y-%m')"
    } else if (days > 30) {
      groupBy = "YEARWEEK(created_at)"
    }
    
    const data = await query<RowDataPacket[]>(
      `SELECT 
        ${groupBy} as date,
        COALESCE(SUM(total), 0) as revenue,
        COUNT(*) as orders
       FROM orders 
       WHERE created_at >= ? AND status != 'cancelled'
       GROUP BY ${groupBy}
       ORDER BY date ASC`,
      [startDate]
    )
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/analytics/revenue error:", error)
    return NextResponse.json({ error: "Failed to fetch revenue data" }, { status: 500 })
  }
}
