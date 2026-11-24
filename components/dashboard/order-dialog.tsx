"use client"

import React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useCurrency } from "@/lib/currency-context"

export interface Order {
  id: string
  customer: string
  email: string
  items: number
  total: number
  status: string
  date: string
}
import type { Order } from "@/lib/orders-context"

interface OrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order?: Order | null
  onSave: (order: Partial<Order>) => void | Promise<void>
  mode: "create" | "edit" | "view"
}

const statusColors: Record<string, string> = {
  pending: "bg-slate-500/20 text-slate-400",
  confirmed: "bg-cyan-500/20 text-cyan-400",
  processing: "bg-amber-500/20 text-amber-400",
  shipped: "bg-blue-500/20 text-blue-400",
  delivered: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
  refunded: "bg-purple-500/20 text-purple-400",
}

const paymentStatusColors: Record<string, string> = {
  pending: "bg-slate-500/20 text-slate-400",
  paid: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
  refunded: "bg-purple-500/20 text-purple-400",
}

export function OrderDialog({ open, onOpenChange, order, onSave, mode }: OrderDialogProps) {
  const { formatPrice } = useCurrency()
  const [formData, setFormData] = useState({
    status: "pending",
    payment_status: "pending",
    shipping_amount: "0",
    tax_amount: "0",
    discount_amount: "0",
    notes: "",
    payment_method: "cash",
  })

  useEffect(() => {
    if (order) {
      setFormData({
        status: order.status || "pending",
        payment_status: order.payment_status || "pending",
        shipping_amount: order.shipping_amount?.toString() || "0",
        tax_amount: order.tax_amount?.toString() || "0",
        discount_amount: order.discount_amount?.toString() || "0",
        notes: order.notes || "",
        payment_method: order.payment_method || "cash",
      })
    } else {
      setFormData({
        status: "pending",
        payment_status: "pending",
        shipping_amount: "0",
        tax_amount: "0",
        discount_amount: "0",
        notes: "",
        payment_method: "cash",
      })
    }
  }, [order, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      status: formData.status as Order["status"],
      payment_status: formData.payment_status as Order["payment_status"],
      shipping_amount: parseFloat(formData.shipping_amount) || 0,
      tax_amount: parseFloat(formData.tax_amount) || 0,
      discount_amount: parseFloat(formData.discount_amount) || 0,
      notes: formData.notes || null,
      payment_method: formData.payment_method,
    })
    onOpenChange(false)
  }

  if (mode === "view" && order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Order {order.order_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{order.customer_name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-xs">{order.customer_email || "N/A"}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Items</p>
                <p className="font-medium">{order.items_count} items</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="font-medium">AED {order.total.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={statusColors[order.status] || statusColors.pending}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <Badge className={paymentStatusColors[order.payment_status] || paymentStatusColors.pending}>
                  {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-medium">{order.payment_method || "N/A"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Order Summary</p>
              <div className="bg-secondary/50 p-3 rounded space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{order.subtotal.toLocaleString()} AED</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping:</span>
                  <span>{order.shipping_amount?.toLocaleString() || 0} AED</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{order.tax_amount?.toLocaleString() || 0} AED</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Discount:</span>
                    <span>-{order.discount_amount.toLocaleString()} AED</span>
                  </div>
                )}
                <div className="border-t pt-1 flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{order.total.toLocaleString()} AED</span>
                </div>
              </div>
            </div>
            {order.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm bg-secondary/50 p-2 rounded">{order.notes}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Order Date</p>
              <p className="font-medium">
                {new Date(order.created_at).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Update Order" : "Create New Order"}</DialogTitle>
          <DialogDescription>
            {mode === "edit" ? "Update the order details below." : "Fill in the details to create a new order."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Order Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment_status">Payment Status</Label>
              <Select
                value={formData.payment_status}
                onValueChange={(value) => setFormData({ ...formData, payment_status: value })}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="shipping_amount">Shipping (AED)</Label>
                <Input
                  id="shipping_amount"
                  type="number"
                  value={formData.shipping_amount}
                  onChange={(e) => setFormData({ ...formData, shipping_amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-secondary"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tax_amount">Tax (AED)</Label>
                <Input
                  id="tax_amount"
                  type="number"
                  value={formData.tax_amount}
                  onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-secondary"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discount_amount">Discount (AED)</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                  placeholder="0.00"
                  className="bg-secondary"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add order notes..."
                className="bg-secondary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button type="submit">{mode === "edit" ? "Update Order" : "Create Order"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
