import { NextRequest, NextResponse } from "next/server"
import { query, getPaginationSQL, type PaginatedResult, type PaginationParams } from "@/lib/db/config"
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
  items_count: number
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

interface CountRow extends RowDataPacket {
  total: number
}

const ALLOWED_SORT_FIELDS = ["order_number", "total", "status", "created_at"]

// GET /api/orders - List all orders with pagination
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
    const paymentStatus = searchParams.get("paymentStatus") || ""
    const customerId = searchParams.get("customerId") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""
    
    // Build WHERE conditions
    const conditions: string[] = []
    const values: unknown[] = []
    
    if (search) {
      conditions.push("(o.order_number LIKE ? OR c.name LIKE ? OR c.email LIKE ?)")
      values.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    
    if (status) {
      conditions.push("o.status = ?")
      values.push(status)
    }
    
    if (paymentStatus) {
      conditions.push("o.payment_status = ?")
      values.push(paymentStatus)
    }
    
    if (customerId) {
      conditions.push("o.customer_id = ?")
      values.push(customerId)
    }
    
    if (startDate) {
      conditions.push("o.created_at >= ?")
      values.push(startDate)
    }
    
    if (endDate) {
      conditions.push("o.created_at <= ?")
      values.push(`${endDate} 23:59:59`)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
    const { orderSQL, limitSQL, limit } = getPaginationSQL(params, ALLOWED_SORT_FIELDS)
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ${whereClause}
    `
    const countResult = await query<CountRow[]>(countQuery, values)
    const total = countResult[0]?.total || 0
    
    // Get orders with customer info and item count
    const ordersQuery = `
      SELECT 
        o.id, o.order_number, o.customer_id, o.customer_name, o.customer_email,
        o.status, o.payment_status, o.payment_method, o.subtotal, 
        o.discount_amount, o.discount_code, o.shipping_amount,
        o.tax_amount, o.total, o.discount_id, o.shipping_address,
        o.billing_address, o.notes, o.internal_notes, o.created_at, o.updated_at,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ${whereClause}
      ${orderSQL || "ORDER BY o.created_at DESC"}
      ${limitSQL}
    `
    const orders = await query<OrderRow[]>(ordersQuery, values)
    
    // Fetch items for each order in parallel
    const ordersWithItems = await Promise.all(
      orders.map(async (o) => {
        const items = await query<OrderItemRow[]>(
          "SELECT * FROM order_items WHERE order_id = ?",
          [o.id]
        );
        return {
          ...o,
          shipping_address: o.shipping_address ? JSON.parse(o.shipping_address) : null,
          billing_address: o.billing_address ? JSON.parse(o.billing_address) : null,
          items,
        };
      })
    );
    
    const result: PaginatedResult<any> = {
      data: ordersWithItems,
      pagination: {
        page: params.page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
    
    return NextResponse.json(result)
  } catch (error) {
    const err = error as Error
    console.error("GET /api/orders error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to fetch orders" },
      { status: 500 }
    )
  }
}

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customerId,
      items,
      discountId,
      shippingAmount,
      taxAmount,
      shippingAddress,
      billingAddress,
      notes,
      paymentMethod,
    } = body
    
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      )
    }
    
    // Calculate totals
    let subtotal = 0
    for (const item of items) {
      subtotal += item.unitPrice * item.quantity
    }
    
    let discountAmount = 0
    // Apply discount if provided
    if (discountId) {
      const [discount] = await query<RowDataPacket[]>(
        "SELECT * FROM discounts WHERE id = ? AND status = 'active' AND (starts_at IS NULL OR starts_at <= NOW()) AND (expires_at IS NULL OR expires_at >= NOW())",
        [discountId]
      )
      
      if (discount) {
        if (discount.type === "percentage") {
          discountAmount = subtotal * (discount.value / 100)
        } else if (discount.type === "fixed") {
          discountAmount = Math.min(discount.value, subtotal)
        }
      }
    }
    
    const total = subtotal - discountAmount + (shippingAmount || 0) + (taxAmount || 0)
    
    // Generate order ID and number
    const orderId = `ord-${Date.now()}`
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`
    
    // Get customer info for denormalized fields
    let customerName = null
    let customerEmail = null
    if (customerId) {
      const [customer] = await query<RowDataPacket[]>(
        "SELECT name, email FROM customers WHERE id = ?",
        [customerId]
      )
      if (customer) {
        customerName = customer.name
        customerEmail = customer.email
      }
    }

    // Get discount code if discount is applied
    let discountCode = null
    if (discountId) {
      const [discountInfo] = await query<RowDataPacket[]>(
        "SELECT code FROM discounts WHERE id = ?",
        [discountId]
      )
      if (discountInfo) {
        discountCode = discountInfo.code
      }
    }

    // Insert order
    await query<ResultSetHeader>(
      `INSERT INTO orders (
        id, order_number, customer_id, customer_name, customer_email,
        status, payment_status, payment_method,
        subtotal, discount_amount, discount_code, shipping_amount, tax_amount, total, discount_id,
        shipping_address, billing_address, notes, internal_notes
      ) VALUES (?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        orderNumber,
        customerId || null,
        customerName,
        customerEmail,
        paymentMethod || null,
        subtotal,
        discountAmount,
        discountCode,
        shippingAmount || 0,
        taxAmount || 0,
        total,
        discountId || null,
        shippingAddress ? JSON.stringify(shippingAddress) : null,
        billingAddress ? JSON.stringify(billingAddress) : null,
        notes || null,
        null, // internal_notes
      ]
    )
    
    // Insert order items
    for (const item of items) {
      const itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await query(
        `INSERT INTO order_items (id, order_id, product_id, product_name, product_sku, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          orderId,
          item.productId || null,
          item.name,
          item.sku || null,
          item.quantity,
          item.unitPrice,
          item.unitPrice * item.quantity,
        ]
      )
      
      // Update product stock
      if (item.productId) {
        await query(
          "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
          [item.quantity, item.productId, item.quantity]
        )
      }
    }
    
    // Update customer stats
    if (customerId) {
      await query(
        "UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ? WHERE id = ?",
        [total, customerId]
      )
      
      // Recalculate membership tier based on new total_spent
      try {
        console.log("[v0] Order created, recalculating membership tier for customer:", customerId)
        await assignMembershipTier(customerId)
      } catch (error: any) {
        console.error("[v0] Error assigning membership tier:", error.message)
        // Don't fail the order creation if membership assignment fails
      }
    }
    
    // Update discount usage
    if (discountId && discountAmount > 0) {
      await query(
        "UPDATE discounts SET used_count = used_count + 1 WHERE id = ?",
        [discountId]
      )
    }
    
    // Get the created order
    const [newOrder] = await query<OrderRow[]>(
      `SELECT o.*, c.name as customer_name, c.email as customer_email
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.id = ?`,
      [orderId]
    )
    
    const orderItems = await query<OrderItemRow[]>(
      "SELECT * FROM order_items WHERE order_id = ?",
      [orderId]
    )
    
    return NextResponse.json({
      ...newOrder,
      shipping_address: newOrder.shipping_address ? JSON.parse(newOrder.shipping_address) : null,
      billing_address: newOrder.billing_address ? JSON.parse(newOrder.billing_address) : null,
      items: orderItems,
    }, { status: 201 })
  } catch (error) {
    const err = error as Error
    console.error("POST /api/orders error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to create order" },
      { status: 500 }
    )
  }
}
