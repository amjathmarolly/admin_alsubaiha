"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Crown, MoreHorizontal, Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react"
import { MembershipPlanDialog } from "@/components/dashboard/membership-plan-dialog"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface MembershipPlan {
  id: string
  name: string
  tier_level: number
  description: string
  min_purchase: number
  max_purchase: number | null
  discount_percentage: number
  color: string
  icon: string
  status: "active" | "inactive"
  created_at: string
}

export default function MembershipPlansPage() {
  const { hasPermission } = useAuth()
  const { toast } = useToast()
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Check permission
  if (!hasPermission("manage_discounts")) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don&apos;t have permission to manage membership plans.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  // Fetch membership plans
  useEffect(() => {
    fetchPlans()
  }, [])

  async function fetchPlans() {
    try {
      setLoading(true)
      const response = await fetch("/api/membership-plans")
      const data = await response.json()

      if (data.success) {
        setPlans(data.data)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch membership plans",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching plans:", error)
      toast({
        title: "Error",
        description: "Failed to fetch membership plans",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusToggle(plan: MembershipPlan) {
    try {
      const response = await fetch(`/api/membership-plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...plan,
          status: plan.status === "active" ? "inactive" : "active",
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPlans(plans.map((p) => (p.id === plan.id ? { ...p, status: plan.status === "active" ? "inactive" : "active" } : p)))
        toast({
          title: "Success",
          description: `Membership plan ${plan.status === "active" ? "deactivated" : "activated"}`,
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to update status",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error toggling status:", error)
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      })
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/membership-plans/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        setPlans(plans.filter((p) => p.id !== id))
        setDeleteDialogOpen(false)
        setDeletingId(null)
        toast({
          title: "Success",
          description: "Membership plan deleted successfully",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete membership plan",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error deleting plan:", error)
      toast({
        title: "Error",
        description: "Failed to delete membership plan",
        variant: "destructive",
      })
    }
  }

  function handleEditComplete() {
    setEditingPlan(null)
    setDialogOpen(false)
    fetchPlans()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Membership Plans</h1>
            <p className="text-muted-foreground">Manage customer loyalty tiers and discounts</p>
          </div>
          <Button onClick={() => { setEditingPlan(null); setDialogOpen(true) }} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Plan
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{plans.length}</div>
              <p className="text-xs text-muted-foreground">Active and inactive</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{plans.filter((p) => p.status === "active").length}</div>
              <p className="text-xs text-muted-foreground">Currently available</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Max Discount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.max(...plans.map((p) => p.discount_percentage), 0)}%</div>
              <p className="text-xs text-muted-foreground">Highest tier discount</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tiers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{plans.length}</div>
              <p className="text-xs text-muted-foreground">Loyalty levels</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Membership Tiers
            </CardTitle>
            <CardDescription>Create and manage membership plans with automatic tier assignment based on purchase history</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : plans.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-center">
                <div>
                  <Crown className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">No membership plans yet</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Purchase Range (AED)</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: getColorValue(plan.color) }}
                            />
                            {plan.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Level {plan.tier_level}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {plan.min_purchase.toLocaleString()} - {plan.max_purchase ? plan.max_purchase.toLocaleString() : "Unlimited"}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">{plan.discount_percentage}%</TableCell>
                        <TableCell>
                          <Switch
                            checked={plan.status === "active"}
                            onCheckedChange={() => handleStatusToggle(plan)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingPlan(plan)
                                  setDialogOpen(true)
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeletingId(plan.id)
                                  setDeleteDialogOpen(true)
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader>
            <CardTitle className="text-lg text-amber-900 flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-600" />
              How It Works
            </CardTitle>
            <CardDescription className="text-amber-800">
              Understanding the membership tier system and automatic rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 p-4 rounded-lg bg-white/60 border border-amber-100">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-sm">1</div>
                  <p className="font-semibold text-amber-900">Automatic Assignment</p>
                </div>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Customers are automatically assigned to membership tiers based on their total purchase history.
                </p>
              </div>
              
              <div className="space-y-2 p-4 rounded-lg bg-white/60 border border-amber-100">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-sm">2</div>
                  <p className="font-semibold text-amber-900">Discount Application</p>
                </div>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Discounts are applied at checkout based on the customer&apos;s current tier automatically.
                </p>
              </div>
              
              <div className="space-y-2 p-4 rounded-lg bg-white/60 border border-amber-100">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-sm">3</div>
                  <p className="font-semibold text-amber-900">Tier Progression</p>
                </div>
                <p className="text-sm text-amber-800 leading-relaxed">
                  As customers spend more, they automatically move to higher tiers and unlock greater discounts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <MembershipPlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        plan={editingPlan}
        onComplete={handleEditComplete}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Membership Plan"
        description={`Are you sure you want to delete this membership plan? This action cannot be undone.`}
        onConfirm={() => deletingId && handleDelete(deletingId)}
        isLoading={false}
      />
    </DashboardLayout>
  )
}

function getColorValue(colorName: string): string {
  const colors: Record<string, string> = {
    blue: "#3b82f6",
    slate: "#64748b",
    yellow: "#eab308",
    purple: "#a855f7",
    pink: "#ec4899",
    red: "#ef4444",
    green: "#22c55e",
    gray: "#6b7280",
  }
  return colors[colorName] || "#6b7280"
}
