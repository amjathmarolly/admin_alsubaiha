"use client"

import { useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
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
import { Search, MoreHorizontal, Truck, Package, MapPin, Clock, Plus, Eye, Pencil, Printer, Copy } from "lucide-react"
import { ShippingDialog, type Shipment } from "@/components/dashboard/shipping-dialog"
import { ExportDialog } from "@/components/dashboard/export-dialog"
import { useToast } from "@/hooks/use-toast"

const shippingExportFields = [
  { key: "id", label: "Shipment ID", default: true },
  { key: "orderId", label: "Order ID", default: true },
  { key: "customer", label: "Customer", default: true },
  { key: "destination", label: "Destination", default: true },
  { key: "carrier", label: "Carrier", default: true },
  { key: "tracking", label: "Tracking Number", default: true },
  { key: "status", label: "Status", default: true },
  { key: "estimatedDelivery", label: "Est. Delivery", default: true },
]

// const initialShipments: Shipment[] = [
//   {
//     id: "SHP-2847",
//     orderId: "ORD-7823",
//     customer: "Sarah Johnson",
//     destination: "Los Angeles, CA",
//     carrier: "FedEx",
//     tracking: "FX847291038",
//     status: "In Transit",
//     estimatedDelivery: "2026-02-05",
//   },
//   {
//     id: "SHP-2846",
//     orderId: "ORD-7822",
//     customer: "Michael Chen",
//     destination: "New York, NY",
//     carrier: "UPS",
//     tracking: "1Z999AA10123456784",
//     status: "Out for Delivery",
//     estimatedDelivery: "2026-02-03",
//   },
//   {
//     id: "SHP-2845",
//     orderId: "ORD-7821",
//     customer: "Emily Davis",
//     destination: "Chicago, IL",
//     carrier: "FedEx",
//     tracking: "FX847291039",
//     status: "Pending",
//     estimatedDelivery: "2026-02-07",
//   },
//   {
//     id: "SHP-2844",
//     orderId: "ORD-7819",
//     customer: "Olivia Brown",
//     destination: "Houston, TX",
//     carrier: "USPS",
//     tracking: "9400111899223456789012",
//     status: "Delivered",
//     estimatedDelivery: "2026-02-01",
//   },
//   {
//     id: "SHP-2843",
//     orderId: "ORD-7817",
//     customer: "Sophia Martinez",
//     destination: "Phoenix, AZ",
//     carrier: "UPS",
//     tracking: "1Z999AA10123456785",
//     status: "Delivered",
//     estimatedDelivery: "2026-01-30",
//   },
//   {
//     id: "SHP-2842",
//     orderId: "ORD-7816",
//     customer: "Daniel Anderson",
//     destination: "Philadelphia, PA",
//     carrier: "FedEx",
//     tracking: "FX847291040",
//     status: "In Transit",
//     estimatedDelivery: "2026-02-04",
//   },
// ]

const statusColors: Record<string, string> = {
  Pending: "bg-slate-500/20 text-slate-400",
  "In Transit": "bg-blue-500/20 text-blue-400",
  "Out for Delivery": "bg-amber-500/20 text-amber-400",
  Delivered: "bg-emerald-500/20 text-emerald-400",
}

export default function ShippingPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission("manage_shipping")
  const canExport = hasPermission("export_data")

  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">("create")
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const { toast } = useToast()

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch =
      shipment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.tracking.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.orderId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab =
      activeTab === "all" ||
      shipment.status.toLowerCase().replace(/ /g, "-") === activeTab
    return matchesSearch && matchesTab
  })

  const handleCreateShipment = () => {
    setSelectedShipment(null)
    setDialogMode("create")
    setDialogOpen(true)
  }

  const handleViewShipment = (shipment: Shipment) => {
    setSelectedShipment(shipment)
    setDialogMode("view")
    setDialogOpen(true)
  }

  const handleEditShipment = (shipment: Shipment) => {
    setSelectedShipment(shipment)
    setDialogMode("edit")
    setDialogOpen(true)
  }

  const handleCopyTracking = (tracking: string) => {
    navigator.clipboard.writeText(tracking)
    toast({
      title: "Tracking copied",
      description: "Tracking number copied to clipboard",
    })
  }

  const handleSaveShipment = (data: Partial<Shipment> & { id?: string }) => {
    if (data.id) {
      setShipments(
        shipments.map((s) => (s.id === data.id ? { ...s, ...data } as Shipment : s))
      )
    } else {
      const newShipment: Shipment = {
        id: `SHP-${2848 + shipments.length}`,
        orderId: data.orderId || "",
        customer: data.customer || "",
        destination: data.destination || "",
        carrier: data.carrier || "",
        tracking: data.tracking || "",
        status: data.status || "Pending",
        estimatedDelivery: data.estimatedDelivery || "",
      }
      setShipments([newShipment, ...shipments])
    }
  }

  return (
    <DashboardLayout
      title="Shipping"
      description="Track shipments and manage deliveries."
      requiredPermission="view_shipping"
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {shipments.filter((s) => s.status === "Pending").length}
              </p>
              <p className="text-xs text-muted-foreground">Awaiting pickup</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-400" />
                <p className="text-sm text-muted-foreground">In Transit</p>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {shipments.filter((s) => s.status === "In Transit").length}
              </p>
              <p className="text-xs text-blue-400">On the way</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-400" />
                <p className="text-sm text-muted-foreground">Out for Delivery</p>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {shipments.filter((s) => s.status === "Out for Delivery").length}
              </p>
              <p className="text-xs text-amber-400">Arriving today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                <p className="text-sm text-muted-foreground">Delivered</p>
              </div>
              <p className="mt-2 text-2xl font-bold">
                {shipments.filter((s) => s.status === "Delivered").length}
              </p>
              <p className="text-xs text-emerald-400">Successfully completed</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search shipments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary"
            />
          </div>
          <div className="flex gap-2">
            {canExport && (
              <ExportDialog
                title="Shipments"
                data={filteredShipments}
                fields={shippingExportFields}
                filename="shipments"
              />
            )}
            {canManage && (
              <Button className="gap-2" onClick={handleCreateShipment}>
                <Plus className="h-4 w-4" />
                Create Shipment
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="all" onValueChange={setActiveTab}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in-transit">In Transit</TabsTrigger>
            <TabsTrigger value="out-for-delivery">Out for Delivery</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Shipments ({filteredShipments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shipment ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>ETA</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleViewShipment(shipment)}
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {shipment.id}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/customers?search=${encodeURIComponent(shipment.customer)}`}
                            className="hover:text-primary hover:underline"
                          >
                            {shipment.customer}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{shipment.destination}</TableCell>
                        <TableCell>{shipment.carrier}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="rounded bg-secondary px-2 py-1 text-xs">
                              {shipment.tracking.slice(0, 12)}...
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopyTracking(shipment.tracking)}
                            >
                              <Copy className="h-3 w-3" />
                              <span className="sr-only">Copy tracking</span>
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[shipment.status]}>{shipment.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(shipment.estimatedDelivery).toLocaleDateString("en-US", {
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
                              <DropdownMenuItem className="gap-2" onClick={() => handleViewShipment(shipment)}>
                                <Eye className="h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2" onClick={() => handleEditShipment(shipment)}>
                                <Pencil className="h-4 w-4" />
                                Update Status
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2">
                                <Printer className="h-4 w-4" />
                                Print Label
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <Link href={`/orders?search=${shipment.orderId}`}>
                                <DropdownMenuItem>View Order</DropdownMenuItem>
                              </Link>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ShippingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        shipment={selectedShipment}
        onSave={handleSaveShipment}
        mode={dialogMode}
      />
    </DashboardLayout>
  )
}
