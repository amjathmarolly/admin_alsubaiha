"use client"

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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

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

interface MembershipPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: MembershipPlan | null
  onComplete: () => void
}

const colors = [
  { name: "Blue", value: "blue" },
  { name: "Slate", value: "slate" },
  { name: "Yellow", value: "yellow" },
  { name: "Purple", value: "purple" },
  { name: "Pink", value: "pink" },
  { name: "Red", value: "red" },
  { name: "Green", value: "green" },
]

export function MembershipPlanDialog({
  open,
  onOpenChange,
  plan,
  onComplete,
}: MembershipPlanDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<MembershipPlan>>({
    name: "",
    tier_level: 1,
    description: "",
    min_purchase: 0,
    max_purchase: null,
    discount_percentage: 0,
    color: "blue",
    icon: "gem",
  })

  useEffect(() => {
    if (plan) {
      setFormData(plan)
    } else {
      setFormData({
        name: "",
        tier_level: 1,
        description: "",
        min_purchase: 0,
        max_purchase: null,
        discount_percentage: 0,
        color: "blue",
        icon: "gem",
      })
    }
  }, [plan, open])

  async function handleSubmit() {
    try {
      if (!formData.name || formData.tier_level === undefined) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      setLoading(true)

      const url = plan
        ? `/api/membership-plans/${plan.id}`
        : "/api/membership-plans"

      const method = plan ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: plan
            ? "Membership plan updated successfully"
            : "Membership plan created successfully",
        })
        onOpenChange(false)
        onComplete()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save membership plan",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error saving plan:", error)
      toast({
        title: "Error",
        description: "Failed to save membership plan",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {plan ? "Edit Membership Plan" : "Create Membership Plan"}
          </DialogTitle>
          <DialogDescription>
            {plan
              ? "Update the membership plan details"
              : "Create a new membership tier with discount settings"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Plan Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Gold"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          {/* Tier Level */}
          <div className="space-y-2">
            <Label htmlFor="tier">Tier Level *</Label>
            <Input
              id="tier"
              type="number"
              min="1"
              value={formData.tier_level || 1}
              onChange={(e) =>
                setFormData({ ...formData, tier_level: parseInt(e.target.value) })
              }
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe this membership tier..."
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
            />
          </div>

          {/* Min Purchase */}
          <div className="space-y-2">
            <Label htmlFor="minPurchase">Minimum Purchase (AED) *</Label>
            <Input
              id="minPurchase"
              type="number"
              min="0"
              step="0.01"
              value={formData.min_purchase || 0}
              onChange={(e) =>
                setFormData({ ...formData, min_purchase: parseFloat(e.target.value) })
              }
            />
          </div>

          {/* Max Purchase */}
          <div className="space-y-2">
            <Label htmlFor="maxPurchase">Maximum Purchase (AED)</Label>
            <Input
              id="maxPurchase"
              type="number"
              min="0"
              step="0.01"
              placeholder="Leave empty for unlimited"
              value={formData.max_purchase || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_purchase: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
            />
          </div>

          {/* Discount Percentage */}
          <div className="space-y-2">
            <Label htmlFor="discount">Discount Percentage *</Label>
            <Input
              id="discount"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.discount_percentage || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  discount_percentage: parseFloat(e.target.value),
                })
              }
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Select value={formData.color} onValueChange={(value) =>
              setFormData({ ...formData, color: value })
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colors.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    {color.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {plan ? "Update Plan" : "Create Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
