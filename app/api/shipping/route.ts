import { NextRequest, NextResponse } from "next/server"
import { query, getPaginationSQL, type PaginatedResult, type PaginationParams } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface ShipmentRow extends RowDataPacket {
  id: string
  shipment_number: string
  order_id: string
  order_number: string
  customer_name: string
  carrier: string | null
  tracking_number: string | null
  tracking_url: string | null
  status: "pending" | "label_created" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "returned"
  weight: number | null
  dimensions: string | null
  shipping_cost: number | null
  estimated_delivery: Date | null
  actual_delivery: Date | null
  shipped_at: Date | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

interface CountRow extends RowDataPacket {
  total: number
}

const ALLOWED_SORT_FIELDS = ["shipment_number", "status", "estimated_delivery", "created_at"]

// GET /api/shipping - List all shipments
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
    const carrier = searchParams.get("carrier") || ""
    
    const conditions: string[] = []
    const values: unknown[] = []
    
    if (search) {
      conditions.push("(s.shipment_number LIKE ? OR s.tracking_number LIKE ? OR o.order_number LIKE ?)")
      values.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    
    if (status) {
      conditions.push("s.status = ?")
      values.push(status)
    }
    
    if (carrier) {
      conditions.push("s.carrier = ?")
      values.push(carrier)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
    const { orderSQL, limitSQL, limit } = getPaginationSQL(params, ALLOWED_SORT_FIELDS)
    
    const countResult = await query<CountRow[]>(
      `SELECT COUNT(*) as total FROM shipments s LEFT JOIN orders o ON s.order_id = o.id ${whereClause}`,
      values
    )
    const total = countResult[0]?.total || 0
    
    const shipmentsQuery = `
      SELECT 
        s.*,
        o.order_number,
        o.customer_name
      FROM shipments s
      LEFT JOIN orders o ON s.order_id = o.id
      ${whereClause}
      ${orderSQL || "ORDER BY s.created_at DESC"}
      ${limitSQL}
    `
    
    const shipments = await query<ShipmentRow[]>(shipmentsQuery, values)
    
    const result: PaginatedResult<ShipmentRow> = {
      data: shipments.map(s => ({
        ...s,
        dimensions: s.dimensions ? JSON.parse(s.dimensions) : null,
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
    console.error("GET /api/shipping error:", error)
    return NextResponse.json({ error: "Failed to fetch shipments" }, { status: 500 })
  }
}

// POST /api/shipping - Create a shipment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      orderId,
      carrier,
      trackingNumber,
      trackingUrl,
      weight,
      dimensions,
      shippingCost,
      estimatedDelivery,
      notes,
    } = body
    
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
    }
    
    // Check if order exists
    const [order] = await query<RowDataPacket[]>(
      "SELECT id FROM orders WHERE id = ?",
      [orderId]
    )
    
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
    
    // Generate shipment number
    const shipmentNumber = `SHP-${Date.now().toString(36).toUpperCase()}`
    
    await query<ResultSetHeader>(
      `INSERT INTO shipments (
        shipment_number, order_id, carrier, tracking_number, tracking_url,
        weight, dimensions, shipping_cost, estimated_delivery, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        shipmentNumber,
        orderId,
        carrier || null,
        trackingNumber || null,
        trackingUrl || null,
        weight || null,
        dimensions ? JSON.stringify(dimensions) : null,
        shippingCost || null,
        estimatedDelivery || null,
        notes || null,
      ]
    )
    
    const [newShipment] = await query<ShipmentRow[]>(
      "SELECT * FROM shipments WHERE shipment_number = ?",
      [shipmentNumber]
    )
    
    return NextResponse.json(newShipment, { status: 201 })
  } catch (error) {
    console.error("POST /api/shipping error:", error)
    return NextResponse.json({ error: "Failed to create shipment" }, { status: 500 })
  }
}
