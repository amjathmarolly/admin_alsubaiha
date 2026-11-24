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
import { Badge } from "@/components/ui/badge"
import { Truck, MapPin, Package, Clock } from "lucide-react"

export interface Shipment {
  id: string
  orderId: string
  customer: string
  destination: string
  carrier: string
  tracking: string
  status: string
  estimatedDelivery: string
}

interface ShippingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipment?: Shipment | null
  onSave: (data: Partial<Shipment> & { id?: string }) => void
  mode: "create" | "edit" | "view"
}

const statusColors: Record<string, string> = {
  Pending: "bg-slate-500/20 text-slate-400",
  "In Transit": "bg-blue-500/20 text-blue-400",
  "Out for Delivery": "bg-amber-500/20 text-amber-400",
  Delivered: "bg-emerald-500/20 text-emerald-400",
}

export function ShippingDialog({ open, onOpenChange, shipment, onSave, mode }: ShippingDialogProps) {
  const [formData, setFormData] = useState({
    orderId: "",
    customer: "",
    destination: "",
    carrier: "",
    tracking: "",
    status: "Pending",
    estimatedDelivery: "",
  })

  useEffect(() => {
    if (shipment) {
      setFormData({
        orderId: shipment.orderId,
        customer: shipment.customer,
        destination: shipment.destination,
        carrier: shipment.carrier,
        tracking: shipment.tracking,
        status: shipment.status,
        estimatedDelivery: shipment.estimatedDelivery,
      })
    } else {
      setFormData({
        orderId: "",
        customer: "",
        destination: "",
        carrier: "",
        tracking: "",
        status: "Pending",
        estimatedDelivery: "",
      })
    }
  }, [shipment, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: shipment?.id,
      ...formData,
    })
    onOpenChange(false)
  }

  if (mode === "view" && shipment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Shipment Details</DialogTitle>
            <DialogDescription>{shipment.id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Badge className={statusColors[shipment.status]}>{shipment.status}</Badge>
              <p className="text-sm text-muted-foreground">Order: {shipment.orderId}</p>
            </div>
            <div className="grid gap-4">
              <div className="flex items-start gap-3 rounded-lg bg-secondary p-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{shipment.customer}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-secondary p-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Destination</p>
                  <p className="font-medium">{shipment.destination}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-secondary p-3">
                <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Carrier</p>
                  <p className="font-medium">{shipment.carrier}</p>
                  <code className="mt-1 block rounded bg-background px-2 py-1 text-xs">{shipment.tracking}</code>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-secondary p-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Delivery</p>
                  <p className="font-medium">
                    {new Date(shipment.estimatedDelivery).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Update Shipment" : "Create Shipment"}</DialogTitle>
          <DialogDescription>
            {mode === "edit" ? "Update the shipment details." : "Enter shipment details for the order."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="orderId">Order ID</Label>
                <Input
                  id="orderId"
                  value={formData.orderId}
                  onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                  placeholder="e.g., ORD-7823"
                  className="bg-secondary"
                  required
                  disabled={mode === "edit"}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customer">Customer</Label>
                <Input
                  id="customer"
                  value={formData.customer}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  placeholder="e.g., John Doe"
                  className="bg-secondary"
                  required
                  disabled={mode === "edit"}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="e.g., Los Angeles, CA"
                className="bg-secondary"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="carrier">Carrier</Label>
                <Select
                  value={formData.carrier}
                  onValueChange={(value) => setFormData({ ...formData, carrier: value })}
                  required
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FedEx">FedEx</SelectItem>
                    <SelectItem value="UPS">UPS</SelectItem>
                    <SelectItem value="USPS">USPS</SelectItem>
                    <SelectItem value="DHL">DHL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Transit">In Transit</SelectItem>
                    <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                value={formData.tracking}
                onChange={(e) => setFormData({ ...formData, tracking: e.target.value })}
                placeholder="e.g., FX847291038"
                className="bg-secondary"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="estimatedDelivery">Estimated Delivery</Label>
              <Input
                id="estimatedDelivery"
                type="date"
                value={formData.estimatedDelivery}
                onChange={(e) => setFormData({ ...formData, estimatedDelivery: e.target.value })}
                className="bg-secondary"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button type="submit">{mode === "edit" ? "Update Shipment" : "Create Shipment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
