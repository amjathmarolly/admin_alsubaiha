"use client"

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react"

export interface Order {
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
  items_count: number
  notes: string | null
  internal_notes: string | null
  created_at: string
  updated_at: string
}

interface OrdersResponse {
  data: Order[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface OrdersContextType {
  orders: Order[]
  isLoading: boolean
  error: string | null
  pagination: OrdersResponse["pagination"] | null
  addOrder: (order: {
    customerId?: string
    items: { productId?: string; sku?: string; name: string; quantity: number; unitPrice: number }[]
    shippingAmount?: number
    taxAmount?: number
    discountId?: string
    shippingAddress?: object
    billingAddress?: object
    notes?: string
    paymentMethod?: string
  }) => Promise<Order>
  updateOrder: (id: string, data: Partial<{ status: string; paymentStatus: string; notes: string; internalNotes: string }>) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
  refreshOrders: () => Promise<void>
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined)

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState<OrdersResponse["pagination"] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch("/api/orders?limit=100")
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(errorData.error || "Failed to fetch orders")
        setOrders([])
        setPagination(null)
        return
      }
      const data: OrdersResponse = await res.json()
      setOrders(data.data || [])
      setPagination(data.pagination || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch orders")
      setOrders([])
      setPagination(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const addOrder = useCallback(async (orderData: {
    customerId?: string
    items: { productId?: string; sku?: string; name: string; quantity: number; unitPrice: number }[]
    shippingAmount?: number
    taxAmount?: number
    discountId?: string
    shippingAddress?: object
    billingAddress?: object
    notes?: string
    paymentMethod?: string
  }) => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    })
    if (!res.ok) throw new Error("Failed to create order")
    const newOrder = await res.json()
    await fetchOrders()
    return newOrder
  }, [fetchOrders])

  const updateOrder = useCallback(async (id: string, data: Partial<{ status: string; paymentStatus: string; notes: string }>) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Failed to update order")
    await fetchOrders()
  }, [fetchOrders])

  const deleteOrder = useCallback(async (id: string) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: "DELETE",
    })
    if (!res.ok) throw new Error("Failed to delete order")
    await fetchOrders()
  }, [fetchOrders])

  return (
    <OrdersContext.Provider
      value={{
        orders,
        isLoading,
        error,
        pagination,
        addOrder,
        updateOrder,
        deleteOrder,
        refreshOrders: fetchOrders,
      }}
    >
      {children}
    </OrdersContext.Provider>
  )
}

export function useOrders() {
  const context = useContext(OrdersContext)
  if (!context) {
    throw new Error("useOrders must be used within an OrdersProvider")
  }
  return context
}
