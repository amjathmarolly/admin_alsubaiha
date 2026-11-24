"use client"

import React from "react"
import { useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
import { Search, MoreHorizontal, Package, AlertTriangle, CheckCircle, XCircle, Plus, Pencil } from "lucide-react"
import { InventoryDialog, type InventoryItem } from "@/components/dashboard/inventory-dialog"
import { ExportDialog } from "@/components/dashboard/export-dialog"

const inventoryExportFields = [
  { key: "id", label: "ID", default: true },
  { key: "sku", label: "SKU", default: true },
  { key: "name", label: "Product Name", default: true },
  { key: "stock", label: "Stock", default: true },
  { key: "reserved", label: "Reserved", default: true },
  { key: "incoming", label: "Incoming", default: true },
  { key: "reorderPoint", label: "Reorder Point", default: false },
  { key: "status", label: "Status", default: true },
]

const initialInventory: InventoryItem[] = [
  { id: "INV001", sku: "SOF-VEL-NVY", name: "Velvet Sofa - Navy", stock: 24, reserved: 3, incoming: 10, reorderPoint: 10, status: "Healthy" },
  { id: "INV002", sku: "TBL-OAK-DIN", name: "Oak Dining Table", stock: 12, reserved: 2, incoming: 0, reorderPoint: 8, status: "Healthy" },
  { id: "INV003", sku: "CHR-ERG-BLK", name: "Ergonomic Office Chair", stock: 3, reserved: 1, incoming: 20, reorderPoint: 10, status: "Low Stock" },
  { id: "INV004", sku: "BED-KNG-FRM", name: "King Size Bed Frame", stock: 8, reserved: 2, incoming: 5, reorderPoint: 5, status: "Healthy" },
  { id: "INV005", sku: "STO-MOD-BKS", name: "Modular Bookshelf", stock: 0, reserved: 0, incoming: 15, reorderPoint: 8, status: "Out of Stock" },
  { id: "INV006", sku: "CHR-LTH-RCL", name: "Leather Recliner", stock: 15, reserved: 4, incoming: 0, reorderPoint: 10, status: "Healthy" },
  { id: "INV007", sku: "TBL-COF-WLN", name: "Coffee Table - Walnut", stock: 18, reserved: 1, incoming: 0, reorderPoint: 12, status: "Healthy" },
  { id: "INV008", sku: "STO-WRD-CAB", name: "Wardrobe Cabinet", stock: 5, reserved: 3, incoming: 8, reorderPoint: 8, status: "Low Stock" },
]

function getStatus(stock: number, reorderPoint: number): string {
  if (stock === 0) return "Out of Stock"
  if (stock <= reorderPoint) return "Low Stock"
  return "Healthy"
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  Healthy: { color: "bg-emerald-500/20 text-emerald-400", icon: <CheckCircle className="h-4 w-4" /> },
  "Low Stock": { color: "bg-amber-500/20 text-amber-400", icon: <AlertTriangle className="h-4 w-4" /> },
  "Out of Stock": { color: "bg-red-500/20 text-red-400", icon: <XCircle className="h-4 w-4" /> },
}

export default function InventoryPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission("manage_inventory")
  const canExport = hasPermission("export_data")
  
  const [searchQuery, setSearchQuery] = useState("")
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"adjust" | "restock">("adjust")
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  const filteredItems = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalStock = inventory.reduce((sum, item) => sum + item.stock, 0)
  const lowStockCount = inventory.filter((item) => item.status === "Low Stock").length
  const outOfStockCount = inventory.filter((item) => item.status === "Out of Stock").length

  const handleAdjustStock = (item: InventoryItem) => {
    setSelectedItem(item)
    setDialogMode("adjust")
    setDialogOpen(true)
  }

  const handleRestockItem = (item: InventoryItem) => {
    setSelectedItem(item)
    setDialogMode("restock")
    setDialogOpen(true)
  }

  const handleSave = (data: { id?: string; adjustment: number; reason: string }) => {
    if (data.id) {
      setInventory(
        inventory.map((item) => {
          if (item.id === data.id) {
            const newStock = dialogMode === "adjust" 
              ? item.stock + data.adjustment 
              : item.stock
            const newIncoming = dialogMode === "restock"
              ? item.incoming + data.adjustment
              : item.incoming
            return {
              ...item,
              stock: Math.max(0, newStock),
              incoming: newIncoming,
              status: getStatus(Math.max(0, newStock), item.reorderPoint),
            }
          }
          return item
        })
      )
    }
  }

  return (
    <DashboardLayout
      title="Inventory"
      description="Track stock levels and manage inventory."
      requiredPermission="view_inventory"
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
              <p className="mt-2 text-2xl font-bold">{totalStock}</p>
              <p className="text-xs text-muted-foreground">Across all products</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <p className="text-sm text-muted-foreground">Healthy Stock</p>
              </div>
              <p className="mt-2 text-2xl font-bold">{inventory.length - lowStockCount - outOfStockCount}</p>
              <p className="text-xs text-emerald-400">Above reorder point</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <p className="text-sm text-muted-foreground">Low Stock</p>
              </div>
              <p className="mt-2 text-2xl font-bold">{lowStockCount}</p>
              <p className="text-xs text-amber-400">Need reordering</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-muted-foreground">Out of Stock</p>
              </div>
              <p className="mt-2 text-2xl font-bold">{outOfStockCount}</p>
              <p className="text-xs text-red-400">Immediate action needed</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary"
            />
          </div>
          <div className="flex gap-2">
            {canExport && (
              <ExportDialog
                title="Inventory"
                data={filteredItems}
                fields={inventoryExportFields}
                filename="inventory"
              />
            )}
            {canManage && (
              <Button asChild>
                <Link href="/products">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Link>
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Stock Levels ({filteredItems.length} items)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Incoming</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const stockPercentage = Math.min((item.stock / (item.reorderPoint * 2)) * 100, 100)
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link href={`/products?search=${encodeURIComponent(item.name)}`} className="font-medium hover:text-primary hover:underline">
                          {item.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                      <TableCell>{item.stock}</TableCell>
                      <TableCell>{item.reserved}</TableCell>
                      <TableCell>
                        {item.incoming > 0 ? (
                          <span className="text-primary">+{item.incoming}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={stockPercentage}
                            className="h-2 w-20"
                          />
                          <span className="text-xs text-muted-foreground">
                            {Math.round(stockPercentage)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[item.status].color}>
                          {item.status}
                        </Badge>
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
                            <DropdownMenuItem className="gap-2" onClick={() => handleAdjustStock(item)}>
                              <Pencil className="h-4 w-4" />
                              Adjust Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleRestockItem(item)}>
                              <Plus className="h-4 w-4" />
                              Add Incoming Stock
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <Link href={`/products?search=${encodeURIComponent(item.name)}`}>
                              <DropdownMenuItem>View Product</DropdownMenuItem>
                            </Link>
                            <Link href={`/orders?search=${encodeURIComponent(item.name)}`}>
                              <DropdownMenuItem>View Orders</DropdownMenuItem>
                            </Link>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <InventoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selectedItem}
        onSave={handleSave}
        mode={dialogMode}
      />
    </DashboardLayout>
  )
}
