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

export interface InventoryItem {
  id: string
  sku: string
  name: string
  stock: number
  reserved: number
  incoming: number
  reorderPoint: number
  status: string
}

interface InventoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: InventoryItem | null
  onSave: (data: { id?: string; adjustment: number; reason: string }) => void
  mode: "adjust" | "restock"
}

export function InventoryDialog({ open, onOpenChange, item, onSave, mode }: InventoryDialogProps) {
  const [formData, setFormData] = useState({
    adjustment: "",
    reason: "",
  })

  useEffect(() => {
    setFormData({ adjustment: "", reason: "" })
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: item?.id,
      adjustment: Number.parseInt(formData.adjustment),
      reason: formData.reason,
    })
    onOpenChange(false)
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{mode === "adjust" ? "Adjust Stock" : "Restock Item"}</DialogTitle>
          <DialogDescription>
            {mode === "adjust"
              ? `Current stock for ${item.name}: ${item.stock} units`
              : `Add incoming stock for ${item.name}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="rounded-lg bg-secondary p-3">
              <p className="text-sm text-muted-foreground">Product</p>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-secondary p-2">
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="font-bold">{item.stock}</p>
              </div>
              <div className="rounded-lg bg-secondary p-2">
                <p className="text-xs text-muted-foreground">Reserved</p>
                <p className="font-bold">{item.reserved}</p>
              </div>
              <div className="rounded-lg bg-secondary p-2">
                <p className="text-xs text-muted-foreground">Incoming</p>
                <p className="font-bold text-primary">{item.incoming}</p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adjustment">
                {mode === "adjust" ? "Adjustment (+/-)" : "Quantity to Add"}
              </Label>
              <Input
                id="adjustment"
                type="number"
                value={formData.adjustment}
                onChange={(e) => setFormData({ ...formData, adjustment: e.target.value })}
                placeholder={mode === "adjust" ? "e.g., -5 or +10" : "e.g., 20"}
                className="bg-secondary"
                required
              />
              {mode === "adjust" && formData.adjustment && (
                <p className="text-sm text-muted-foreground">
                  New stock: {item.stock + Number.parseInt(formData.adjustment || "0")} units
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) => setFormData({ ...formData, reason: value })}
                required
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {mode === "adjust" ? (
                    <>
                      <SelectItem value="damaged">Damaged Goods</SelectItem>
                      <SelectItem value="returned">Customer Return</SelectItem>
                      <SelectItem value="count">Inventory Count</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="purchase">Purchase Order</SelectItem>
                      <SelectItem value="transfer">Warehouse Transfer</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button type="submit">{mode === "adjust" ? "Apply Adjustment" : "Add Stock"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
