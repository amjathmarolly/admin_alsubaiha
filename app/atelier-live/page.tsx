"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Pencil, Trash2, Globe, Lock, Loader2 } from "lucide-react"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { cn } from "@/lib/utils"

interface AtelierItem {
    id: string
    title: string
    category: string | null
    manufacturing_stage: string
    material: string | null
    dimensions: string | null
    image_url: string
    slug: string | null
    client_name: string | null
    order_number: string | null
    price: number | null
    internal_notes: string | null
    send_to_public_website: number | boolean
    status: "active" | "inactive"
    sort_order: number
    created_at: string
}

const STAGE_OPTIONS = [
    "Cutting",
    "Framing",
    "Carpentry",
    "Upholstery",
    "Polishing",
    "Finishing",
    "Quality Check",
    "Packaging",
    "Completed",
]

const emptyForm = {
    title: "",
    category: "",
    manufacturingStage: STAGE_OPTIONS[0],
    material: "",
    dimensions: "",
    imageUrl: "",
    slug: "",
    clientName: "",
    orderNumber: "",
    price: "",
    internalNotes: "",
    sendToPublicWebsite: false,
    status: "active" as "active" | "inactive",
    sortOrder: 0,
}

export default function AtelierLivePage() {
    const { hasPermission } = useAuth()
    const canManage = hasPermission("manage_atelier_live")

    const [items, setItems] = useState<AtelierItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<AtelierItem | null>(null)
    const [itemToDelete, setItemToDelete] = useState<AtelierItem | null>(null)

    const [imageFile, setImageFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    const [formData, setFormData] = useState(emptyForm)

    const fetchItems = useCallback(async () => {
        try {
            setIsLoading(true)
            const res = await fetch("/api/atelier-items?limit=100")
            if (res.ok) {
                const data = await res.json()
                setItems(data.data || [])
            }
        } catch (error) {
            console.error("Failed to fetch atelier items", error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchItems()
    }, [fetchItems])

    const handleAddItem = () => {
        setSelectedItem(null)
        setImageFile(null)
        setFormData(emptyForm)
        setDialogOpen(true)
    }

    const handleEditItem = (item: AtelierItem) => {
        setSelectedItem(item)
        setImageFile(null)
        setFormData({
            title: item.title,
            category: item.category || "",
            manufacturingStage: item.manufacturing_stage,
            material: item.material || "",
            dimensions: item.dimensions || "",
            imageUrl: item.image_url,
            slug: item.slug || "",
            clientName: item.client_name || "",
            orderNumber: item.order_number || "",
            price: item.price != null ? String(item.price) : "",
            internalNotes: item.internal_notes || "",
            sendToPublicWebsite: Boolean(item.send_to_public_website),
            status: item.status,
            sortOrder: item.sort_order,
        })
        setDialogOpen(true)
    }

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0])
            setFormData((prev) => ({ ...prev, imageUrl: "" }))
        }
    }

    const handleDeleteClick = (item: AtelierItem) => {
        setItemToDelete(item)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (itemToDelete) {
            try {
                const res = await fetch(`/api/atelier-items/${itemToDelete.id}`, { method: "DELETE" })
                if (res.ok) {
                    await fetchItems()
                }
            } catch (error) {
                console.error("Failed to delete item:", error)
            }
            setItemToDelete(null)
        }
        setDeleteDialogOpen(false)
    }

    const handleSave = async () => {
        if (!formData.title.trim() || !formData.manufacturingStage || (!formData.imageUrl.trim() && !imageFile)) {
            alert("Title, manufacturing stage, and a photo are required.")
            return
        }

        setIsSaving(true)
        setIsUploading(true)
        try {
            let finalImageUrl = formData.imageUrl

            if (imageFile) {
                const uploadFormData = new FormData()
                uploadFormData.append("file", imageFile)
                const res = await fetch("/api/upload", { method: "POST", body: uploadFormData })
                if (res.ok) {
                    const data = await res.json()
                    if (data.success && data.urls?.length) {
                        finalImageUrl = data.urls[0]
                    } else {
                        alert("Upload succeeded but no URL was returned.")
                        return
                    }
                } else {
                    alert("Image upload failed: " + (await res.text()))
                    return
                }
            }

            const payload = {
                title: formData.title,
                category: formData.category || null,
                manufacturingStage: formData.manufacturingStage,
                material: formData.material || null,
                dimensions: formData.dimensions || null,
                imageUrl: finalImageUrl,
                slug: formData.slug || null,
                clientName: formData.clientName || null,
                orderNumber: formData.orderNumber || null,
                price: formData.price ? Number(formData.price) : null,
                internalNotes: formData.internalNotes || null,
                sendToPublicWebsite: formData.sendToPublicWebsite,
                status: formData.status,
                sortOrder: formData.sortOrder,
            }

            const url = selectedItem ? `/api/atelier-items/${selectedItem.id}` : "/api/atelier-items"
            const method = selectedItem ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                await fetchItems()
                setDialogOpen(false)
            } else {
                alert(`Failed to save item: ${await res.text()}`)
            }
        } catch (error) {
            console.error("Failed to save item:", error)
            alert("Unexpected error occurred while saving: " + String(error))
        } finally {
            setIsSaving(false)
            setIsUploading(false)
        }
    }

    const publishBadge = (item: AtelierItem) => {
        if (!item.send_to_public_website || item.status !== "active") {
            return (
                <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" /> Private
                </Badge>
            )
        }
        return (
            <Badge className="gap-1 bg-emerald-500/20 text-emerald-400">
                <Globe className="h-3 w-3" /> Live on site
            </Badge>
        )
    }

    return (
        <DashboardLayout
            title="Atelier Live"
            description="Approve manufacturing photos to publish on the public /atelier-live page. Only checked, active items are ever sent to the website — client, order, and price fields never leave this dashboard."
            requiredPermission="view_atelier_live"
        >
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Manufacturing Items</CardTitle>
                                <CardDescription>Behind-the-scenes factory photos, staged for public approval</CardDescription>
                            </div>
                            {canManage && (
                                <Button className="gap-2" onClick={handleAddItem}>
                                    <Plus className="h-4 w-4" />
                                    Add Item
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">Photo</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>Publish status</TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <p className="text-muted-foreground">Loading items...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <p className="text-muted-foreground">No items found</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="h-10 w-10 flex items-center justify-center rounded-md bg-secondary overflow-hidden shrink-0">
                                                    <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium">{item.title}</p>
                                                {item.category && (
                                                    <p className="text-xs text-muted-foreground">{item.category}</p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{item.manufacturing_stage}</Badge>
                                            </TableCell>
                                            <TableCell>{publishBadge(item)}</TableCell>
                                            <TableCell>
                                                {canManage && (
                                                    <div className="flex items-center gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedItem ? "Edit Item" : "Add Item"}</DialogTitle>
                        <DialogDescription>
                            Public fields may be shown on the website. Private fields never leave this dashboard.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-2">
                        <div className="space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Public-safe details</p>

                            <div className="space-y-2">
                                <Label>Item / product name</Label>
                                <Input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} placeholder="Sofa Frame" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Input value={formData.category} onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))} placeholder="Living Room" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Manufacturing stage</Label>
                                    <Select value={formData.manufacturingStage} onValueChange={(v) => setFormData((p) => ({ ...p, manufacturingStage: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {STAGE_OPTIONS.map((s) => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Material (optional)</Label>
                                    <Input value={formData.material} onChange={(e) => setFormData((p) => ({ ...p, material: e.target.value }))} placeholder="Oak frame" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Dimensions (optional)</Label>
                                    <Input value={formData.dimensions} onChange={(e) => setFormData((p) => ({ ...p, dimensions: e.target.value }))} placeholder="220 x 90 x 85 cm" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Photo</Label>
                                <input type="file" accept="image/*" onChange={handleImageFileChange} className="text-sm" />
                                {formData.imageUrl && !imageFile && (
                                    <img src={formData.imageUrl} alt="" className="h-20 w-20 object-cover rounded-md mt-2" />
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 rounded-md border border-dashed p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                                <Lock className="h-3.5 w-3.5" /> Private — never sent to the website
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Client name</Label>
                                    <Input value={formData.clientName} onChange={(e) => setFormData((p) => ({ ...p, clientName: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Order number</Label>
                                    <Input value={formData.orderNumber} onChange={(e) => setFormData((p) => ({ ...p, orderNumber: e.target.value }))} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Price</Label>
                                <Input type="number" value={formData.price} onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Internal notes</Label>
                                <Textarea value={formData.internalNotes} onChange={(e) => setFormData((p) => ({ ...p, internalNotes: e.target.value }))} rows={2} />
                            </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-md border p-4">
                            <Checkbox
                                id="sendToPublicWebsite"
                                checked={formData.sendToPublicWebsite}
                                onCheckedChange={(checked) => setFormData((p) => ({ ...p, sendToPublicWebsite: Boolean(checked) }))}
                            />
                            <div>
                                <Label htmlFor="sendToPublicWebsite" className="font-medium">Send to Public Website</Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Publishes this photo to alsubaiha.ae/atelier-live using only the public-safe details above.
                                    Client, order, price, and notes are excluded automatically. Uncheck to remove it from the site.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedItem ? "Save changes" : "Add item"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteConfirm}
                title="Delete atelier item"
                description={`This will remove "${itemToDelete?.title}" from the dashboard${itemToDelete?.send_to_public_website ? " and unpublish it from the website" : ""}.`}
            />
        </DashboardLayout>
    )
}
