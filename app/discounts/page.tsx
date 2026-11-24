"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
import { Search, MoreHorizontal, Plus, Tag, Percent, DollarSign, Copy, Pencil, Trash2, BarChart3 } from "lucide-react"
import { DiscountDialog, type Discount } from "@/components/dashboard/discount-dialog"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { ExportDialog } from "@/components/dashboard/export-dialog"
import { useToast } from "@/hooks/use-toast"

const discountExportFields = [
  { key: "id", label: "ID", default: true },
  { key: "code", label: "Code", default: true },
  { key: "type", label: "Type", default: true },
  { key: "value", label: "Value", default: true },
  { key: "usageCount", label: "Usage Count", default: true },
  { key: "usageLimit", label: "Usage Limit", default: true },
  { key: "minPurchase", label: "Min. Purchase", default: true },
  { key: "status", label: "Status", default: true },
  { key: "expiresAt", label: "Expires At", default: true },
]

const initialDiscounts: Discount[] = [
  {
    id: "DSC001",
    code: "SPRING25",
    type: "percentage",
    value: 25,
    usageCount: 847,
    usageLimit: 1000,
    minPurchase: 100,
    status: "Active",
    expiresAt: "2026-03-31",
  },
  {
    id: "DSC002",
    code: "NEWUSER50",
    type: "fixed",
    value: 50,
    usageCount: 234,
    usageLimit: null,
    minPurchase: 200,
    status: "Active",
    expiresAt: null,
  },
  {
    id: "DSC003",
    code: "FREESHIP",
    type: "shipping",
    value: 0,
    usageCount: 1523,
    usageLimit: 2000,
    minPurchase: 75,
    status: "Active",
    expiresAt: "2026-02-28",
  },
  {
    id: "DSC004",
    code: "FLASH15",
    type: "percentage",
    value: 15,
    usageCount: 500,
    usageLimit: 500,
    minPurchase: 50,
    status: "Expired",
    expiresAt: "2026-01-31",
  },
  {
    id: "DSC005",
    code: "VIP30",
    type: "percentage",
    value: 30,
    usageCount: 89,
    usageLimit: 100,
    minPurchase: 300,
    status: "Active",
    expiresAt: "2026-12-31",
  },
  {
    id: "DSC006",
    code: "SUMMER20",
    type: "percentage",
    value: 20,
    usageCount: 0,
    usageLimit: 1500,
    minPurchase: 150,
    status: "Scheduled",
    expiresAt: "2026-08-31",
  },
]

const statusColors: Record<string, string> = {
  Active: "bg-emerald-500/20 text-emerald-400",
  Expired: "bg-red-500/20 text-red-400",
  Scheduled: "bg-blue-500/20 text-blue-400",
  Disabled: "bg-slate-500/20 text-slate-400",
}

export default function DiscountsPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission("manage_discounts")
  const canExport = hasPermission("export_data")
  
  const [searchQuery, setSearchQuery] = useState("")
  const [discounts, setDiscounts] = useState<Discount[]>(initialDiscounts)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [discountToDelete, setDiscountToDelete] = useState<Discount | null>(null)
  const { toast } = useToast()

  const filteredDiscounts = discounts.filter((discount) =>
    discount.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeDiscounts = discounts.filter((d) => d.status === "Active").length
  const totalRedemptions = discounts.reduce((sum, d) => sum + d.usageCount, 0)

  const handleCreateDiscount = () => {
    setSelectedDiscount(null)
    setDialogOpen(true)
  }

  const handleEditDiscount = (discount: Discount) => {
    setSelectedDiscount(discount)
    setDialogOpen(true)
  }

  const handleDuplicateDiscount = (discount: Discount) => {
    const newDiscount: Discount = {
      ...discount,
      id: `DSC${String(discounts.length + 1).padStart(3, "0")}`,
      code: `${discount.code}_COPY`,
      usageCount: 0,
      status: "Active",
    }
    setDiscounts([...discounts, newDiscount])
    toast({
      title: "Discount duplicated",
      description: `Created copy of ${discount.code}`,
    })
  }

  const handleDeleteClick = (discount: Discount) => {
    setDiscountToDelete(discount)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (discountToDelete) {
      setDiscounts(discounts.filter((d) => d.id !== discountToDelete.id))
      setDiscountToDelete(null)
    }
    setDeleteDialogOpen(false)
  }

  const handleToggleStatus = (discount: Discount) => {
    if (discount.status === "Expired") return
    setDiscounts(
      discounts.map((d) =>
        d.id === discount.id
          ? { ...d, status: d.status === "Active" ? "Disabled" : "Active" }
          : d
      )
    )
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "Code copied",
      description: `${code} copied to clipboard`,
    })
  }

  const handleSaveDiscount = (discountData: Partial<Discount> & { id?: string }) => {
    if (discountData.id) {
      setDiscounts(
        discounts.map((d) =>
          d.id === discountData.id ? { ...d, ...discountData } as Discount : d
        )
      )
    } else {
      const newDiscount: Discount = {
        id: `DSC${String(discounts.length + 1).padStart(3, "0")}`,
        code: discountData.code || "",
        type: discountData.type || "percentage",
        value: discountData.value || 0,
        usageCount: 0,
        usageLimit: discountData.usageLimit || null,
        minPurchase: discountData.minPurchase || 0,
        status: "Active",
        expiresAt: discountData.expiresAt || null,
      }
      setDiscounts([newDiscount, ...discounts])
    }
  }

  return (
    <DashboardLayout
      title="Discounts"
      description="Create and manage promotional codes."
      requiredPermission="view_discounts"
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Total Codes</p>
              </div>
              <p className="mt-2 text-2xl font-bold">{discounts.length}</p>
              <p className="text-xs text-muted-foreground">Discount codes created</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-emerald-400" />
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
              <p className="mt-2 text-2xl font-bold">{activeDiscounts}</p>
              <p className="text-xs text-emerald-400">Currently running</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <p className="text-sm text-muted-foreground">Total Redemptions</p>
              </div>
              <p className="mt-2 text-2xl font-bold">{totalRedemptions.toLocaleString()}</p>
              <p className="text-xs text-primary">All-time usage</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-400" />
                <p className="text-sm text-muted-foreground">Total Savings</p>
              </div>
              <p className="mt-2 text-2xl font-bold">$42,890</p>
              <p className="text-xs text-amber-400">Given to customers</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search discount codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary"
            />
          </div>
          <div className="flex gap-2">
            {canExport && (
              <ExportDialog
                title="Discounts"
                data={filteredDiscounts}
                fields={discountExportFields}
                filename="discounts"
              />
            )}
            {canManage && (
              <Button className="gap-2" onClick={handleCreateDiscount}>
                <Plus className="h-4 w-4" />
                Create Discount
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Discount Codes ({filteredDiscounts.length} codes)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Min. Purchase</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDiscounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-secondary px-2 py-1 text-sm font-medium">
                          {discount.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyCode(discount.code)}
                        >
                          <Copy className="h-3 w-3" />
                          <span className="sr-only">Copy code</span>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{discount.type}</TableCell>
                    <TableCell>
                      {discount.type === "percentage"
                        ? `${discount.value}%`
                        : discount.type === "fixed"
                          ? `$${discount.value}`
                          : "Free"}
                    </TableCell>
                    <TableCell>
                      {discount.usageCount}
                      {discount.usageLimit && ` / ${discount.usageLimit}`}
                    </TableCell>
                    <TableCell>${discount.minPurchase}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {discount.expiresAt
                        ? new Date(discount.expiresAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[discount.status]}>
                        {discount.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={discount.status === "Active"}
                        disabled={discount.status === "Expired"}
                        onCheckedChange={() => handleToggleStatus(discount)}
                      />
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
                          <DropdownMenuItem className="gap-2" onClick={() => handleEditDiscount(discount)}>
                            <Pencil className="h-4 w-4" />
                            Edit Discount
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <BarChart3 className="h-4 w-4" />
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => handleDuplicateDiscount(discount)}>
                            <Copy className="h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 text-destructive focus:text-destructive"
                            onClick={() => handleDeleteClick(discount)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <DiscountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        discount={selectedDiscount}
        onSave={handleSaveDiscount}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Discount"
        description={`Are you sure you want to delete "${discountToDelete?.code}"? This action cannot be undone.`}
      />
    </DashboardLayout>
  )
}
