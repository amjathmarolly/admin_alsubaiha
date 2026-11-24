import { NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"

interface CountRow extends RowDataPacket {
  count: number
}

// GET /api/health - Check database connection and return table counts
export async function GET() {
  try {
    // Test database connection
    const [products] = await query<CountRow[]>("SELECT COUNT(*) as count FROM products")
    const [orders] = await query<CountRow[]>("SELECT COUNT(*) as count FROM orders")
    const [customers] = await query<CountRow[]>("SELECT COUNT(*) as count FROM customers")
    const [categories] = await query<CountRow[]>("SELECT COUNT(*) as count FROM categories")

    return NextResponse.json({
      status: "healthy",
      database: "connected",
      tables: {
        products: products.count,
        orders: orders.count,
        customers: customers.count,
        categories: categories.count,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
