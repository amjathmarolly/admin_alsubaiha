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
import { Switch } from "@/components/ui/switch"

export interface Discount {
  id: string
  code: string
  type: string
  value: number
  usageCount: number
  usageLimit: number | null
  minPurchase: number
  status: string
  expiresAt: string | null
}

interface DiscountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  discount?: Discount | null
  onSave: (discount: Partial<Discount> & { id?: string }) => void
}

export function DiscountDialog({ open, onOpenChange, discount, onSave }: DiscountDialogProps) {
  const [formData, setFormData] = useState({
    code: "",
    type: "percentage",
    value: "",
    usageLimit: "",
    minPurchase: "",
    expiresAt: "",
    hasLimit: false,
    hasExpiry: false,
  })

  useEffect(() => {
    if (discount) {
      setFormData({
        code: discount.code,
        type: discount.type,
        value: discount.value.toString(),
        usageLimit: discount.usageLimit?.toString() || "",
        minPurchase: discount.minPurchase.toString(),
        expiresAt: discount.expiresAt || "",
        hasLimit: discount.usageLimit !== null,
        hasExpiry: discount.expiresAt !== null,
      })
    } else {
      setFormData({
        code: "",
        type: "percentage",
        value: "",
        usageLimit: "",
        minPurchase: "",
        expiresAt: "",
        hasLimit: false,
        hasExpiry: false,
      })
    }
  }, [discount, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: discount?.id,
      code: formData.code.toUpperCase(),
      type: formData.type,
      value: formData.type === "shipping" ? 0 : Number.parseFloat(formData.value),
      usageLimit: formData.hasLimit ? Number.parseInt(formData.usageLimit) : null,
      minPurchase: Number.parseFloat(formData.minPurchase) || 0,
      expiresAt: formData.hasExpiry ? formData.expiresAt : null,
      usageCount: discount?.usageCount || 0,
      status: discount?.status || "Active",
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{discount ? "Edit Discount" : "Create Discount"}</DialogTitle>
          <DialogDescription>
            {discount ? "Update the discount code details." : "Set up a new promotional discount code."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Discount Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., SUMMER20"
                className="bg-secondary uppercase"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Discount Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage Off</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="shipping">Free Shipping</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.type !== "shipping" && (
                <div className="grid gap-2">
                  <Label htmlFor="value">
                    {formData.type === "percentage" ? "Percentage (%)" : "Amount ($)"}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder={formData.type === "percentage" ? "e.g., 20" : "e.g., 50"}
                    className="bg-secondary"
                    required
                    min="0"
                    max={formData.type === "percentage" ? "100" : undefined}
                  />
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minPurchase">Minimum Purchase ($)</Label>
              <Input
                id="minPurchase"
                type="number"
                value={formData.minPurchase}
                onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                placeholder="e.g., 100"
                className="bg-secondary"
                min="0"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="hasLimit">Usage Limit</Label>
                <p className="text-xs text-muted-foreground">Limit the number of times this code can be used</p>
              </div>
              <Switch
                id="hasLimit"
                checked={formData.hasLimit}
                onCheckedChange={(checked) => setFormData({ ...formData, hasLimit: checked })}
              />
            </div>
            {formData.hasLimit && (
              <div className="grid gap-2">
                <Label htmlFor="usageLimit">Maximum Uses</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  placeholder="e.g., 1000"
                  className="bg-secondary"
                  required
                  min="1"
                />
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="hasExpiry">Expiration Date</Label>
                <p className="text-xs text-muted-foreground">Set when this discount expires</p>
              </div>
              <Switch
                id="hasExpiry"
                checked={formData.hasExpiry}
                onCheckedChange={(checked) => setFormData({ ...formData, hasExpiry: checked })}
              />
            </div>
            {formData.hasExpiry && (
              <div className="grid gap-2">
                <Label htmlFor="expiresAt">Expires On</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="bg-secondary"
                  required
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button type="submit">{discount ? "Save Changes" : "Create Discount"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
