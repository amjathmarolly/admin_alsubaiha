"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { useCustomers } from "@/lib/customers-context"
import { useProducts } from "@/lib/products-context"
import type { Order, Product } from "@/lib/orders-context"

interface OrderItem {
  productId: string
  product?: {
    name: string
    sku: string | null
    price: number
    available_stock: number
  }
  quantity: number
}

interface CreateOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateOrder: (orderData: any) => Promise<void>
  editOrder?: Order | null
}

interface CreateOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateOrder: (orderData: any) => Promise<void>
  editOrder?: Order | null
}

export function CreateOrderDialog({ open, onOpenChange, onCreateOrder, editOrder }: CreateOrderDialogProps) {
  const { customers } = useCustomers()
  const { products } = useProducts()
  const [loading, setLoading] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [items, setItems] = useState<OrderItem[]>([{ productId: "", quantity: 1 }])
  const [shippingAmount, setShippingAmount] = useState("0")
  const [taxAmount, setTaxAmount] = useState("0")
  const [discountAmount, setDiscountAmount] = useState("0")
  const [notes, setNotes] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("cash")

  useEffect(() => {
    if (editOrder) {
      setSelectedCustomerId(editOrder.customer_id || "")
      setShippingAmount(editOrder.shipping_amount?.toString() || "0")
      setTaxAmount(editOrder.tax_amount?.toString() || "0")
      setDiscountAmount(editOrder.discount_amount?.toString() || "0")
      setNotes(editOrder.notes || "")
      setPaymentMethod(editOrder.payment_method || "cash")
      setItems([])
    } else {
      setSelectedCustomerId("")
      setItems([{ productId: "", quantity: 1 }])
      setShippingAmount("0")
      setTaxAmount("0")
      setDiscountAmount("0")
      setNotes("")
      setPaymentMethod("cash")
    }
  }, [editOrder, open])

  const addItem = () => {
    setItems([...items, { productId: "", quantity: 1 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items]
    if (field === "productId" && value) {
      const selectedProduct = products.find(p => p.id === value)
      if (selectedProduct) {
        newItems[index] = {
          productId: value,
          product: {
            name: selectedProduct.name,
            sku: selectedProduct.sku,
            price: selectedProduct.price,
            available_stock: selectedProduct.available_stock,
          },
          quantity: 1,
        }
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value }
    }
    setItems(newItems)
  }

  const getItemTotal = (item: OrderItem) => {
    const price = typeof item.product?.price === 'string' ? parseFloat(item.product.price) : (item.product?.price || 0)
    return price * item.quantity
  }

  const formatPrice = (price: any) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : (price || 0)
    return numPrice.toFixed(2)
  }

  const getSubtotal = () => {
    return items.reduce((sum, item) => sum + getItemTotal(item), 0)
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + getItemTotal(item), 0)
  }

  const subtotal = calculateSubtotal()
  const shipping = parseFloat(shippingAmount) || 0
  const tax = parseFloat(taxAmount) || 0
  const discount = parseFloat(discountAmount) || 0
  const total = subtotal + shipping + tax - discount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editOrder) {
      // Edit mode - only update pricing/shipping/notes
      setLoading(true)
      try {
        await onCreateOrder({
          status: editOrder.status,
          paymentStatus: editOrder.payment_status,
          shippingAmount: parseFloat(shippingAmount) || 0,
          taxAmount: parseFloat(taxAmount) || 0,
          notes: notes || undefined,
        })
      } catch (error) {
        console.error("Error updating order:", error)
      } finally {
        setLoading(false)
      }
    } else {
      // Create mode
      if (!selectedCustomerId) {
        alert("Please select a customer")
        return
      }

      if (items.some(item => !item.productId || item.quantity <= 0)) {
        alert("Please select a product and valid quantity for all items")
        return
      }

      setLoading(true)
      try {
        await onCreateOrder({
          customerId: selectedCustomerId,
          items: items.map(item => ({
            productId: item.productId,
            name: item.product?.name || "",
            quantity: item.quantity,
            unitPrice: item.product?.price || 0,
          })),
          shippingAmount: parseFloat(shippingAmount) || 0,
          taxAmount: parseFloat(taxAmount) || 0,
          notes: notes || undefined,
          paymentMethod: paymentMethod,
        })
        
        // Reset form
        setSelectedCustomerId("")
        setItems([{ productId: "", quantity: 1 }])
        setShippingAmount("0")
        setTaxAmount("0")
        setDiscountAmount("0")
        setNotes("")
        setPaymentMethod("cash")
      } catch (error) {
        console.error("Error creating order:", error)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <DialogTitle>{editOrder ? "Edit Order" : "Create New Order"}</DialogTitle>
          <DialogDescription>
            {editOrder 
              ? `Update pricing and details for order ${editOrder.order_number}`
              : "Add order details and items for the customer"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {editOrder ? (
            // Edit Mode - Show summary and allow editing pricing only
            <div className="space-y-4 py-4">
              <div className="bg-secondary/30 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Order Summary</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order Number:</span>
                    <span className="font-medium">{editOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="font-medium">{editOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items:</span>
                    <span className="font-medium">{editOrder.items_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Total:</span>
                    <span className="font-medium">{editOrder.total.toFixed(2)} AED</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="shipping">Shipping Amount (AED)</Label>
                  <Input
                    id="shipping"
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingAmount}
                    onChange={(e) => setShippingAmount(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tax">Tax Amount (AED)</Label>
                  <Input
                    id="tax"
                    type="number"
                    min="0"
                    step="0.01"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Order Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Add any special instructions or notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          ) : (
            // Create Mode
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Customer & Items</TabsTrigger>
                <TabsTrigger value="pricing">Pricing & Payment</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 py-4">
              {/* Customer Selection */}
              <div className="grid gap-2">
                <Label htmlFor="customer">Select Customer</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger disabled={loading}>
                    <SelectValue placeholder="Choose a customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} ({customer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Order Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Order Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    disabled={loading}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3 bg-secondary/30 p-3 rounded-lg">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label className="text-xs">Product</Label>
                        <Select value={item.productId} onValueChange={(value) => updateItem(index, "productId", value)}>
                          <SelectTrigger disabled={loading} className="text-xs">
                            <SelectValue placeholder="Select product..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products
                              .filter(p => p.status === "active" && p.available_stock > 0)
                              .map(product => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} (SKU: {product.sku || "N/A"}) - AED {formatPrice(product.price)}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          max={item.product?.available_stock || 999}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                          disabled={loading}
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <Label className="text-xs block mb-1">Unit Price</Label>
                        <p className="text-sm font-medium bg-background px-2 py-1 rounded">
                          {item.product ? `AED ${formatPrice(item.product.price)}` : "-"}
                        </p>
                      </div>
                      <div className="col-span-2 text-right">
                        <Label className="text-xs block mb-1">Total</Label>
                        <p className="text-sm font-medium">{getItemTotal(item).toFixed(2)} AED</p>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {items.length > 0 && (
                  <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-medium">{getSubtotal().toFixed(2)} AED</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span className="font-medium">{parseFloat(shippingAmount).toFixed(2)} AED</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span className="font-medium">{parseFloat(taxAmount).toFixed(2)} AED</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>Discount:</span>
                      <span className="font-medium">-{parseFloat(discountAmount).toFixed(2)} AED</span>
                    </div>
                    <div className="border-t pt-1 flex justify-between font-bold text-base">
                      <span>Total:</span>
                      <span>{(getSubtotal() + parseFloat(shippingAmount) + parseFloat(taxAmount) - parseFloat(discountAmount)).toFixed(2)} AED</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="grid gap-2">
                <Label htmlFor="notes">Order Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="Add any special instructions or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={loading}
                />
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 py-4">
              {/* Shipping */}
              <div className="grid gap-2">
                <Label htmlFor="shipping">Shipping Amount (AED)</Label>
                <Input
                  id="shipping"
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingAmount}
                  onChange={(e) => setShippingAmount(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Tax */}
              <div className="grid gap-2">
                <Label htmlFor="tax">Tax Amount (AED)</Label>
                <Input
                  id="tax"
                  type="number"
                  min="0"
                  step="0.01"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Discount */}
              <div className="grid gap-2">
                <Label htmlFor="discount">Discount Amount (AED)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Payment Method */}
              <div className="grid gap-2">
                <Label htmlFor="payment">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger disabled={loading}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Credit Card</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Order Summary */}
              <div className="bg-secondary/50 p-4 rounded-lg space-y-2 border border-border">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{subtotal.toFixed(2)} AED</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping:</span>
                  <span>{shipping.toFixed(2)} AED</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>{tax.toFixed(2)} AED</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Discount:</span>
                  <span>-{discount.toFixed(2)} AED</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-base">
                  <span>Total:</span>
                  <span>{total.toFixed(2)} AED</span>
                </div>
              </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editOrder ? "Update Order" : "Create Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
