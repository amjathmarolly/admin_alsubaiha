"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { useOrders, type Order } from "@/lib/orders-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MoreHorizontal, Eye, Truck, Plus, Pencil, Trash2, Loader2, ChevronLeft } from "lucide-react"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { ExportDialog } from "@/components/dashboard/export-dialog"
import { useCurrency } from "@/lib/currency-context"
import { CreateOrderDialog } from "@/components/dashboard/create-order-dialog"
import { OrderDialog } from "@/components/dashboard/order-dialog"

const orderExportFields = [
  { key: "order_number", label: "Order Number", default: true },
  { key: "customer_name", label: "Customer Name", default: true },
  { key: "customer_email", label: "Email", default: true },
  { key: "items_count", label: "Items", default: true },
  { key: "total", label: "Total", default: true },
  { key: "status", label: "Status", default: true },
  { key: "created_at", label: "Date", default: true },
]

const statusColors: Record<string, string> = {
  delivered: "bg-emerald-500/20 text-emerald-400",
  shipped: "bg-blue-500/20 text-blue-400",
  processing: "bg-amber-500/20 text-amber-400",
  confirmed: "bg-cyan-500/20 text-cyan-400",
  pending: "bg-slate-500/20 text-slate-400",
  cancelled: "bg-red-500/20 text-red-400",
  refunded: "bg-purple-500/20 text-purple-400",
}

const paymentStatusColors: Record<string, string> = {
  paid: "bg-emerald-500/20 text-emerald-400",
  pending: "bg-slate-500/20 text-slate-400",
  failed: "bg-red-500/20 text-red-400",
  refunded: "bg-purple-500/20 text-purple-400",
}

export default function OrdersPage() {
  const searchParams = useSearchParams()
  const { hasPermission } = useAuth()
  const canManage = hasPermission("manage_orders")
  const canExport = hasPermission("export_data")

  const { formatPrice } = useCurrency()


  const { orders, isLoading, addOrder, updateOrder, deleteOrder, refreshOrders } = useOrders()

  // Get customer_id and customer_name from query params
  const customerIdParam = searchParams.get("customer_id")
  const customerNameParam = searchParams.get("customer_name")

  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null)
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false)
  const [viewOrderDialogOpen, setViewOrderDialogOpen] = useState(false)
  const [selectedOrderForView, setSelectedOrderForView] = useState<Order | null>(null)
  const [editOrderDialogOpen, setEditOrderDialogOpen] = useState(false)
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null)

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = activeTab === "all" || order.status === activeTab
    // Filter by customer_id if provided in query params
    const matchesCustomer = !customerIdParam || order.customer_id === customerIdParam
    return matchesSearch && matchesTab && matchesCustomer
  })

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (orderToDelete) {
      try {
        await deleteOrder(orderToDelete.id)
      } catch (error) {
        console.error("Failed to delete order:", error)
      }
      setOrderToDelete(null)
    }
    setDeleteDialogOpen(false)
  }

  const handleCreateOrder = async (orderData: any) => {
    try {
      await addOrder(orderData)
      setCreateOrderDialogOpen(false)
      await refreshOrders()
    } catch (error) {
      console.error("Failed to create order:", error)
    }
  }

  const handleEditOrder = (order: Order) => {
    setSelectedOrderForEdit(order)
    setEditOrderDialogOpen(true)
  }

  const handleViewDetails = (order: Order) => {
    setSelectedOrderForView(order)
    setViewOrderDialogOpen(true)
  }

  const handleUpdateOrder = async (orderData: any) => {
    if (selectedOrderForEdit) {
      try {
        await updateOrder(selectedOrderForEdit.id, orderData)
        setEditOrderDialogOpen(false)
        setSelectedOrderForEdit(null)
        await refreshOrders()
      } catch (error) {
        console.error("Failed to update order:", error)
      }
    }
  }

  const handleStatusChange = async (order: Order, newStatus: string) => {
    try {
      await updateOrder(order.id, { status: newStatus })
      await refreshOrders()
    } catch (error) {
      console.error("Failed to update order status:", error)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Orders" description="Track and manage customer orders." requiredPermission="view_orders">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title={customerNameParam ? `Orders for ${customerNameParam}` : "Orders"}
      description={customerNameParam ? `Viewing orders for this customer` : "Track and manage customer orders."}
      requiredPermission="view_orders"
    >
      <div className="space-y-6">
        {customerIdParam && (
          <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
            <Link href="/customers" className="flex items-center gap-1 hover:text-primary">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Back to Customers</span>
            </Link>
            <span className="text-muted-foreground text-sm">
              Showing orders for: <span className="font-medium text-foreground">{customerNameParam}</span>
            </span>
          </div>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary"
            />
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Button onClick={() => setCreateOrderDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Order
              </Button>
            )}
            {canExport && (
              <ExportDialog
                title="Orders"
                data={filteredOrders}
                fields={orderExportFields}
                filename="orders"
              />
            )}
          </div>
        </div>

        <Tabs defaultValue="all" onValueChange={setActiveTab}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="all">All Orders</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="shipped">Shipped</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Order History ({filteredOrders.length} orders)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.order_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <Link href={`/customers?search=${encodeURIComponent(order.customer_name)}`} className="font-medium hover:text-primary hover:underline">
                                {order.customer_name}
                              </Link>
                              <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{order.items_count} items</TableCell>
                          <TableCell>{formatPrice(order.total)}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[order.status] || statusColors.pending}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={paymentStatusColors[order.payment_status] || paymentStatusColors.pending}>
                              {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer"
                                  onClick={() => handleViewDetails(order)}
                                >
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {canManage && (
                                  <DropdownMenuItem
                                    className="gap-2 cursor-pointer"
                                    onClick={() => handleEditOrder(order)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit Order
                                  </DropdownMenuItem>
                                )}
                                {canManage && order.status === "pending" && (
                                  <DropdownMenuItem className="gap-2" onClick={() => handleStatusChange(order, "processing")}>
                                    <Truck className="h-4 w-4" />
                                    Mark Processing
                                  </DropdownMenuItem>
                                )}
                                {canManage && order.status === "processing" && (
                                  <DropdownMenuItem className="gap-2" onClick={() => handleStatusChange(order, "shipped")}>
                                    <Truck className="h-4 w-4" />
                                    Mark Shipped
                                  </DropdownMenuItem>
                                )}
                                {canManage && order.status === "shipped" && (
                                  <DropdownMenuItem className="gap-2" onClick={() => handleStatusChange(order, "delivered")}>
                                    <Truck className="h-4 w-4" />
                                    Mark Delivered
                                  </DropdownMenuItem>
                                )}
                                <Link href={`/shipping?order=${order.order_number}`}>
                                  <DropdownMenuItem className="gap-2">
                                    <Pencil className="h-4 w-4" />
                                    Track Shipment
                                  </DropdownMenuItem>
                                </Link>
                                {canManage && ["pending", "cancelled"].includes(order.status) && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="gap-2 text-destructive focus:text-destructive"
                                      onClick={() => handleDeleteClick(order)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete Order
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Order"
        description={`Are you sure you want to delete order "${orderToDelete?.order_number}"? This action cannot be undone.`}
      />

      <CreateOrderDialog
        open={createOrderDialogOpen}
        onOpenChange={setCreateOrderDialogOpen}
        onCreateOrder={handleCreateOrder}
      />

      <OrderDialog
        open={viewOrderDialogOpen}
        onOpenChange={setViewOrderDialogOpen}
        order={selectedOrderForView}
        onSave={() => setViewOrderDialogOpen(false)}
        mode="view"
      />

      <OrderDialog
        open={editOrderDialogOpen}
        onOpenChange={setEditOrderDialogOpen}
        order={selectedOrderForEdit}
        onSave={handleUpdateOrder}
        mode="edit"
      />
    </DashboardLayout>
  )
}
