"use client"

import { useState } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { useCustomers, type Customer } from "@/lib/customers-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { Search, MoreHorizontal, Mail, UserPlus, Eye, Pencil, Trash2, ShoppingBag, Loader2, Crown, KeyRound } from "lucide-react"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { ExportDialog } from "@/components/dashboard/export-dialog"
import { useCurrency } from "@/lib/currency-context"
import { AddCustomerDialog } from "@/components/dashboard/add-customer-dialog"
import { CustomerDialog } from "@/components/dashboard/customer-dialog"
import { SendEmailDialog } from "@/components/dashboard/send-email-dialog"
import { ClientLoginDialog } from "@/components/dashboard/client-login-dialog"

const customerExportFields = [
  { key: "id", label: "Customer ID", default: true },
  { key: "name", label: "Name", default: true },
  { key: "email", label: "Email", default: true },
  { key: "total_orders", label: "Orders", default: true },
  { key: "total_spent", label: "Total Spent", default: true },
  { key: "status", label: "Status", default: true },
  { key: "created_at", label: "Joined Date", default: true },
  { key: "phone", label: "Phone", default: false },
]

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  inactive: "bg-slate-500/20 text-slate-400",
  blocked: "bg-red-500/20 text-red-400",
}

export default function CustomersPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission("manage_customers")
  const canExport = hasPermission("export_data")

  const { customers, isLoading, addCustomer, updateCustomer, deleteCustomer } = useCustomers()
  const { formatPrice } = useCurrency()

  const [searchQuery, setSearchQuery] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null)
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view")
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailCustomer, setEmailCustomer] = useState<Customer | null>(null)

  const [loginCustomerId, setLoginCustomerId] = useState<string | null>(null)

  const q = searchQuery.toLowerCase()
  const qDigits = searchQuery.replace(/\D/g, "")
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(q) ||
      (customer.email ?? "").toLowerCase().includes(q) ||
      (qDigits.length >= 3 && (customer.phone ?? "").replace(/\D/g, "").includes(qDigits))
  )

  const totalCustomers = customers.length
  const activeCustomers = customers.filter((c) => c.status === "active").length
  // Amounts arrive as text ("1200.00"): add them as numbers.
  const spent = (c: Customer) => Number(c.total_spent) || 0
  const vipCustomers = customers.filter((c) => Number(c.membership_tier?.discount_percentage) > 0).length
  const spenders = customers.filter((c) => spent(c) > 0)
  const avgSpend = spenders.reduce((acc, c) => acc + spent(c), 0) / Math.max(1, spenders.length)

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer)
    setDeleteDialogOpen(true)
  }

  const handleViewProfile = (customer: Customer) => {
    setSelectedCustomer(customer)
    setDialogMode("view")
    setCustomerDialogOpen(true)
  }

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setDialogMode("edit")
    setCustomerDialogOpen(true)
  }

  const handleSendEmail = (customer: Customer) => {
    setEmailCustomer(customer)
    setEmailDialogOpen(true)
  }

  const handleCustomerSave = async (updatedData: Partial<Customer> & { id?: string }) => {
    try {
      if (selectedCustomer && canManage) {
        const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedData)
        })

        if (!response.ok) {
          throw new Error("Failed to update customer")
        }

        const result = await response.json()
        updateCustomer(selectedCustomer.id, result)
      }
      setCustomerDialogOpen(false)
    } catch (error) {
      console.error("Error updating customer:", error)
    }
  }

  const handleDeleteConfirm = async () => {
    if (customerToDelete) {
      try {
        await deleteCustomer(customerToDelete.id)
      } catch (error) {
        console.error("Failed to delete customer:", error)
      }
      setCustomerToDelete(null)
    }
    setDeleteDialogOpen(false)
  }

  if (isLoading) {
    return (
      <DashboardLayout
        title="Customers"
        description="Manage your customer relationships and data."
        requiredPermission="view_customers"
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      title="Customers"
      description="Manage your customer relationships and data."
      requiredPermission="view_customers"
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold">{totalCustomers.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Active Customers</p>
              <p className="text-2xl font-bold">{activeCustomers.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">VIP Customers</p>
              <p className="text-2xl font-bold">{vipCustomers}</p>
              <p className="text-xs text-muted-foreground">On a tier with a member discount</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Avg. Spend per Client</p>
              <p className="text-2xl font-bold">{formatPrice(Math.round(avgSpend))}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary"
            />
          </div>
          <div className="flex gap-2">
            {canManage && <AddCustomerDialog />}
            {canExport && (
              <ExportDialog
                title="Customers"
                data={filteredCustomers}
                fields={customerExportFields}
                filename="customers"
              />
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer List ({filteredCustomers.length} customers)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {customer.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{customer.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {[customer.email, customer.phone].filter(Boolean).join(" · ") || "No email or mobile"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/orders?customer_id=${customer.id}&customer_name=${encodeURIComponent(customer.name)}`} className="hover:text-primary hover:underline">
                          {customer.total_orders}
                        </Link>
                      </TableCell>
                      <TableCell>{formatPrice(customer.total_spent)}</TableCell>
                      <TableCell>
                        {customer.membership_tier ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: customer.membership_tier.color }}
                            />
                            <span className="font-medium text-sm">{customer.membership_tier.name}</span>
                            <span className="text-xs text-muted-foreground">({customer.membership_tier.discount_percentage}%)</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No tier assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[customer.status] || statusColors.active}>
                          {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(customer.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
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
                            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleViewProfile(customer)}>
                              <Eye className="h-4 w-4" />
                              View Profile
                            </DropdownMenuItem>
                            {canManage && (
                              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setLoginCustomerId(customer.id)}>
                                <KeyRound className="h-4 w-4" />
                                Sign-in & Projects
                              </DropdownMenuItem>
                            )}
                            {canManage && (
                              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleEditCustomer(customer)}>
                                <Pencil className="h-4 w-4" />
                                Edit Customer
                              </DropdownMenuItem>
                            )}
                            <Link href={`/orders?customer_id=${customer.id}&customer_name=${encodeURIComponent(customer.name)}`}>
                              <DropdownMenuItem className="gap-2">
                                <ShoppingBag className="h-4 w-4" />
                                View Orders
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleSendEmail(customer)}>
                              <Mail className="h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                                  onClick={() => handleDeleteClick(customer)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
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
      </div>

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer"
        description={`Are you sure you want to delete "${customerToDelete?.name}"? This action cannot be undone and will remove all their data.`}
      />

      <CustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        customer={selectedCustomer}
        onSave={handleCustomerSave}
        mode={dialogMode}
      />

      <ClientLoginDialog
        customerId={loginCustomerId}
        open={loginCustomerId !== null}
        onOpenChange={(o) => !o && setLoginCustomerId(null)}
      />

      <SendEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        customer={emailCustomer}
      />
    </DashboardLayout>
  )
}
