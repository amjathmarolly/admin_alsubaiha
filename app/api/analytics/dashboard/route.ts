import { NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"

// GET /api/analytics/dashboard - Get dashboard statistics
export async function GET() {
  try {
    // Get date ranges
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    
    const currentPeriodStart = thirtyDaysAgo.toISOString().split("T")[0]
    const previousPeriodStart = sixtyDaysAgo.toISOString().split("T")[0]
    const previousPeriodEnd = currentPeriodStart
    
    // Current period revenue and orders
    const [currentStats] = await query<RowDataPacket[]>(
      `SELECT 
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(*) as total_orders
       FROM orders 
       WHERE created_at >= ? AND status != 'cancelled'`,
      [currentPeriodStart]
    )
    
    // Previous period revenue and orders
    const [previousStats] = await query<RowDataPacket[]>(
      `SELECT 
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(*) as total_orders
       FROM orders 
       WHERE created_at >= ? AND created_at < ? AND status != 'cancelled'`,
      [previousPeriodStart, previousPeriodEnd]
    )
    
    // Total customers
    const [currentCustomers] = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM customers WHERE created_at >= ?`,
      [currentPeriodStart]
    )
    
    const [previousCustomers] = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM customers WHERE created_at >= ? AND created_at < ?`,
      [previousPeriodStart, previousPeriodEnd]
    )
    
    const [totalCustomers] = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM customers`
    )
    
    // Calculate changes
    const revenueChange = previousStats.total_revenue > 0
      ? ((currentStats.total_revenue - previousStats.total_revenue) / previousStats.total_revenue) * 100
      : currentStats.total_revenue > 0 ? 100 : 0
    
    const ordersChange = previousStats.total_orders > 0
      ? ((currentStats.total_orders - previousStats.total_orders) / previousStats.total_orders) * 100
      : currentStats.total_orders > 0 ? 100 : 0
    
    const customersChange = previousCustomers.count > 0
      ? ((currentCustomers.count - previousCustomers.count) / previousCustomers.count) * 100
      : currentCustomers.count > 0 ? 100 : 0
    
    // Average order value
    const currentAOV = currentStats.total_orders > 0 
      ? currentStats.total_revenue / currentStats.total_orders 
      : 0
    const previousAOV = previousStats.total_orders > 0 
      ? previousStats.total_revenue / previousStats.total_orders 
      : 0
    const aovChange = previousAOV > 0
      ? ((currentAOV - previousAOV) / previousAOV) * 100
      : currentAOV > 0 ? 100 : 0
    
    return NextResponse.json({
      totalRevenue: currentStats.total_revenue,
      revenueChange: Math.round(revenueChange * 10) / 10,
      totalOrders: currentStats.total_orders,
      ordersChange: Math.round(ordersChange * 10) / 10,
      totalCustomers: totalCustomers.count,
      customersChange: Math.round(customersChange * 10) / 10,
      averageOrderValue: Math.round(currentAOV * 100) / 100,
      aovChange: Math.round(aovChange * 10) / 10,
    })
  } catch (error) {
    console.error("GET /api/analytics/dashboard error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
