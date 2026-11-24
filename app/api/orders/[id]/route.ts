import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import { assignMembershipTier } from "@/lib/membership-utils"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface OrderRow extends RowDataPacket {
  id: string
  order_number: string
  customer_id: string | null
  customer_name: string | null
  customer_email: string | null
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded"
  payment_status: "pending" | "paid" | "failed" | "refunded"
  payment_method: string | null
  subtotal: number
  discount_amount: number
  discount_code: string | null
  shipping_amount: number
  tax_amount: number
  total: number
  discount_id: string | null
  shipping_address: string | null
  billing_address: string | null
  notes: string | null
  internal_notes: string | null
  created_at: Date
  updated_at: Date
}

interface OrderItemRow extends RowDataPacket {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  product_sku: string | null
  quantity: number
  unit_price: number
  total_price: number
}

// GET /api/orders/[id] - Get a single order with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const [order] = await query<OrderRow[]>(
      `SELECT o.*
       FROM orders o
       WHERE o.id = ? OR o.order_number = ?`,
      [id, id]
    )
    
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }
    
    // Get order items
    const items = await query<OrderItemRow[]>(
      "SELECT * FROM order_items WHERE order_id = ?",
      [order.id]
    )
    
    // Get shipment info if exists
    const [shipment] = await query<RowDataPacket[]>(
      "SELECT * FROM shipments WHERE order_id = ?",
      [order.id]
    )
    
    return NextResponse.json({
      ...order,
      shipping_address: order.shipping_address ? JSON.parse(order.shipping_address) : null,
      billing_address: order.billing_address ? JSON.parse(order.billing_address) : null,
      items,
      shipment: shipment || null,
    })
  } catch (error) {
    const err = error as Error
    console.error("GET /api/orders/[id] error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to fetch order" },
      { status: 500 }
    )
  }
}

// PUT /api/orders/[id] - Update an order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const [currentOrder] = await query<OrderRow[]>(
      "SELECT * FROM orders WHERE id = ?",
      [id]
    )
    
    if (!currentOrder) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }
    
    // Handle both camelCase and snake_case for payment_status
    const {
      status,
      payment_status,
      paymentStatus,
      shipping_amount,
      shippingAmount,
      tax_amount,
      taxAmount,
      discount_amount,
      discountAmount,
      shippingAddress,
      billingAddress,
      notes,
      payment_method,
      paymentMethod,
      internalNotes,
      total,
    } = body
    
    // Use snake_case or camelCase values
    const finalPaymentStatus = payment_status || paymentStatus
    const finalShippingAmount = shipping_amount !== undefined ? shipping_amount : shippingAmount
    const finalTaxAmount = tax_amount !== undefined ? tax_amount : taxAmount
    const finalDiscountAmount = discount_amount !== undefined ? discount_amount : discountAmount
    const finalPaymentMethod = payment_method || paymentMethod
    
    // Handle status change logic - restore stock if cancelling
    if (status && status === "cancelled" && currentOrder.status !== "cancelled") {
      const items = await query<OrderItemRow[]>(
        "SELECT * FROM order_items WHERE order_id = ?",
        [id]
      )
      
      for (const item of items) {
        if (item.product_id) {
          await query(
            "UPDATE products SET stock = stock + ? WHERE id = ?",
            [item.quantity, item.product_id]
          )
        }
      }
    }
    
    // Build update query with all fields
    let updateFields: string[] = []
    let updateValues: any[] = []
    
    if (status !== undefined) {
      updateFields.push("status = ?")
      updateValues.push(status)
    }
    if (finalPaymentStatus !== undefined) {
      updateFields.push("payment_status = ?")
      updateValues.push(finalPaymentStatus)
    }
    if (finalShippingAmount !== undefined) {
      updateFields.push("shipping_amount = ?")
      updateValues.push(finalShippingAmount)
    }
    if (finalTaxAmount !== undefined) {
      updateFields.push("tax_amount = ?")
      updateValues.push(finalTaxAmount)
    }
    if (finalDiscountAmount !== undefined) {
      updateFields.push("discount_amount = ?")
      updateValues.push(finalDiscountAmount)
    }
    if (notes !== undefined) {
      updateFields.push("notes = ?")
      updateValues.push(notes)
    }
    if (finalPaymentMethod !== undefined) {
      updateFields.push("payment_method = ?")
      updateValues.push(finalPaymentMethod)
    }
    if (shippingAddress !== undefined) {
      updateFields.push("shipping_address = ?")
      updateValues.push(shippingAddress ? JSON.stringify(shippingAddress) : null)
    }
    if (billingAddress !== undefined) {
      updateFields.push("billing_address = ?")
      updateValues.push(billingAddress ? JSON.stringify(billingAddress) : null)
    }
    if (internalNotes !== undefined) {
      updateFields.push("internal_notes = ?")
      updateValues.push(internalNotes)
    }
    if (total !== undefined) {
      updateFields.push("total = ?")
      updateValues.push(total)
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }
    
    updateValues.push(id)
    const updateQuery = `UPDATE orders SET ${updateFields.join(", ")} WHERE id = ?`
    
    await query<ResultSetHeader>(updateQuery, updateValues)

    // If total was updated and there's a customer, recalculate membership tier
    if (total !== undefined && total !== currentOrder.total && currentOrder.customer_id) {
      try {
        console.log("[v0] Order total changed, recalculating membership tier for customer:", currentOrder.customer_id)
        // Calculate the difference and update customer's total_spent
        const totalDifference = total - currentOrder.total
        await query(
          "UPDATE customers SET total_spent = total_spent + ? WHERE id = ?",
          [totalDifference, currentOrder.customer_id]
        )
        // Recalculate membership tier
        await assignMembershipTier(currentOrder.customer_id)
      } catch (error: any) {
        console.error("[v0] Error updating customer stats or membership tier:", error.message)
        // Don't fail the order update if this fails
      }
    }
    
    // Get updated order
    const [updatedOrder] = await query<OrderRow[]>(
      `SELECT o.* FROM orders o WHERE o.id = ?`,
      [id]
    )
    
    return NextResponse.json({
      ...updatedOrder,
      shipping_address: updatedOrder.shipping_address ? JSON.parse(updatedOrder.shipping_address) : null,
      billing_address: updatedOrder.billing_address ? JSON.parse(updatedOrder.billing_address) : null,
    })
  } catch (error) {
    const err = error as Error
    console.error("PUT /api/orders/[id] error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to update order" },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[id] - Delete an order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const [order] = await query<OrderRow[]>(
      "SELECT * FROM orders WHERE id = ?",
      [id]
    )
    
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }
    
    // Only allow deleting pending or cancelled orders
    if (!["pending", "cancelled"].includes(order.status)) {
      return NextResponse.json(
        { error: "Can only delete pending or cancelled orders" },
        { status: 400 }
      )
    }
    
    // Restore stock if order was pending
    if (order.status === "pending") {
      const items = await query<OrderItemRow[]>(
        "SELECT * FROM order_items WHERE order_id = ?",
        [id]
      )
      
      for (const item of items) {
        if (item.product_id) {
          await query(
            "UPDATE products SET stock = stock + ? WHERE id = ?",
            [item.quantity, item.product_id]
          )
        }
      }
    }
    
    // Delete order (items will cascade)
    await query<ResultSetHeader>("DELETE FROM orders WHERE id = ?", [id])
    
    return NextResponse.json({ success: true })
  } catch (error) {
    const err = error as Error
    console.error("DELETE /api/orders/[id] error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to delete order" },
      { status: 500 }
    )
  }
}
