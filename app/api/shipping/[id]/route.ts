import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface ShipmentRow extends RowDataPacket {
  id: string
  shipment_number: string
  order_id: string
  carrier: string | null
  tracking_number: string | null
  tracking_url: string | null
  status: string
  weight: number | null
  dimensions: string | null
  shipping_cost: number | null
  estimated_delivery: Date | null
  actual_delivery: Date | null
  shipped_at: Date | null
  notes: string | null
}

// GET /api/shipping/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const [shipment] = await query<ShipmentRow[]>(
      `SELECT s.*, o.order_number, o.customer_name, o.customer_email
       FROM shipments s
       LEFT JOIN orders o ON s.order_id = o.id
       WHERE s.id = ? OR s.shipment_number = ?`,
      [id, id]
    )
    
    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
    }
    
    return NextResponse.json({
      ...shipment,
      dimensions: shipment.dimensions ? JSON.parse(shipment.dimensions) : null,
    })
  } catch (error) {
    console.error("GET /api/shipping/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch shipment" }, { status: 500 })
  }
}

// PUT /api/shipping/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const [current] = await query<ShipmentRow[]>(
      "SELECT * FROM shipments WHERE id = ?",
      [id]
    )
    
    if (!current) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
    }
    
    const {
      carrier,
      trackingNumber,
      trackingUrl,
      status,
      weight,
      dimensions,
      shippingCost,
      estimatedDelivery,
      notes,
    } = body
    
    // Handle status transitions
    let shippedAt = current.shipped_at
    let actualDelivery = current.actual_delivery
    
    if (status === "picked_up" && !current.shipped_at) {
      shippedAt = new Date()
    }
    
    if (status === "delivered" && !current.actual_delivery) {
      actualDelivery = new Date()
      
      // Update order status
      await query(
        "UPDATE orders SET status = 'delivered' WHERE id = ?",
        [current.order_id]
      )
    }
    
    await query<ResultSetHeader>(
      `UPDATE shipments SET
        carrier = COALESCE(?, carrier),
        tracking_number = ?,
        tracking_url = ?,
        status = COALESCE(?, status),
        weight = ?,
        dimensions = ?,
        shipping_cost = ?,
        estimated_delivery = ?,
        shipped_at = ?,
        actual_delivery = ?,
        notes = ?
      WHERE id = ?`,
      [
        carrier,
        trackingNumber !== undefined ? trackingNumber : current.tracking_number,
        trackingUrl !== undefined ? trackingUrl : current.tracking_url,
        status,
        weight !== undefined ? weight : current.weight,
        dimensions ? JSON.stringify(dimensions) : current.dimensions,
        shippingCost !== undefined ? shippingCost : current.shipping_cost,
        estimatedDelivery !== undefined ? estimatedDelivery : current.estimated_delivery,
        shippedAt,
        actualDelivery,
        notes !== undefined ? notes : current.notes,
        id,
      ]
    )
    
    const [updated] = await query<ShipmentRow[]>(
      "SELECT * FROM shipments WHERE id = ?",
      [id]
    )
    
    return NextResponse.json({
      ...updated,
      dimensions: updated.dimensions ? JSON.parse(updated.dimensions) : null,
    })
  } catch (error) {
    console.error("PUT /api/shipping/[id] error:", error)
    return NextResponse.json({ error: "Failed to update shipment" }, { status: 500 })
  }
}

// DELETE /api/shipping/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const [shipment] = await query<ShipmentRow[]>(
      "SELECT id FROM shipments WHERE id = ?",
      [id]
    )
    
    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 })
    }
    
    await query<ResultSetHeader>("DELETE FROM shipments WHERE id = ?", [id])
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/shipping/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete shipment" }, { status: 500 })
  }
}
