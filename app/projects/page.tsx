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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    Video,
    Youtube,
    Image as ImageIcon,
    Upload,
    Loader2,
    X,
    MapPin,
    Check,
    ChevronsUpDown
} from "lucide-react"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { cn } from "@/lib/utils"

export interface Hotspot {
    id: string
    x: number
    y: number
    product_id?: string
    product_name?: string
    product_slug?: string
    product_price?: string
    product_image?: string
}

export interface ProjectWork {
    id: string
    type: "image" | "video"
    image_url: string
    thumbnail_url: string | null
    title: string
    subheading: string | null
    location: string | null
    description: string | null
    category: string | null
    year: string | null
    sort_order: number
    status: "active" | "inactive"
    hotspots: Hotspot[] | null
    gallery_images: string[] | null | any
    created_at: string
}

export default function ProjectsPage() {
    const { hasPermission } = useAuth()
    const canManage = hasPermission("view_our_work")

    const [items, setItems] = useState<ProjectWork[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [hotspotsDialogOpen, setHotspotsDialogOpen] = useState(false)

    const [selectedItem, setSelectedItem] = useState<ProjectWork | null>(null)
    const [itemToDelete, setItemToDelete] = useState<ProjectWork | null>(null)

    const [mediaFile, setMediaFile] = useState<File | null>(null)
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
    const [galleryFiles, setGalleryFiles] = useState<File[]>([])
    const [isUploading, setIsUploading] = useState(false)

    const [formData, setFormData] = useState({
        type: "image" as "image" | "video",
        image_url: "",
        thumbnail_url: "",
        title: "",
        subheading: "",
        location: "",
        description: "",
        category: "",
        year: "",
        sortOrder: 0,
        status: "active" as "active" | "inactive",
        gallery_images: [] as string[],
    })

    const [currentHotspots, setCurrentHotspots] = useState<Hotspot[]>([])
    const [pendingHotspot, setPendingHotspot] = useState<Hotspot | null>(null)
    const [comboboxOpen, setComboboxOpen] = useState(false)
    const [youtubeUrl, setYoutubeUrl] = useState("")

    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    const addYoutubeLink = () => {
        if (!youtubeUrl.trim()) return;
        const id = getYoutubeId(youtubeUrl);
        if (!id) {
            alert("Invalid YouTube URL");
            return;
        }

        // Add to gallery_images
        setFormData(prev => ({
            ...prev,
            gallery_images: [...prev.gallery_images, youtubeUrl]
        }));
        setYoutubeUrl("");
    }

    const fetchItems = useCallback(async () => {
        try {
            setIsLoading(true)
            const res = await fetch("/api/projects?limit=100")
            if (res.ok) {
                const data = await res.json()
                setItems(data.data || [])
            }
        } catch (error) {
            console.error("Failed to fetch projects items", error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const fetchProducts = useCallback(async () => {
        try {
            const res = await fetch("/api/products?limit=1000") // large limit to get all for dropdown
            if (res.ok) {
                const data = await res.json()
                setProducts(data.data || [])
            }
        } catch (error) {
            console.error("Failed to fetch products", error)
        }
    }, [])

    useEffect(() => {
        fetchItems()
        fetchProducts()
    }, [fetchItems, fetchProducts])

    const handleAddItem = () => {
        setSelectedItem(null)
        setMediaFile(null)
        setThumbnailFile(null)
        setGalleryFiles([])
        setFormData({
            type: "image",
            image_url: "",
            thumbnail_url: "",
            title: "",
            subheading: "",
            location: "",
            description: "",
            category: "",
            year: "",
            sortOrder: 0,
            status: "active",
            gallery_images: [],
        })
        setDialogOpen(true)
    }

    const handleEditItem = (item: ProjectWork) => {
        setSelectedItem(item)
        setMediaFile(null)
        setThumbnailFile(null)
        setGalleryFiles([])
        let gImages = item.gallery_images;
        try {
            while (typeof gImages === 'string') {
                gImages = JSON.parse(gImages);
            }
        } catch (e) { }
        if (!Array.isArray(gImages)) gImages = [];

        setFormData({
            type: item.type,
            image_url: item.image_url || "",
            thumbnail_url: item.thumbnail_url || "",
            title: item.title,
            subheading: item.subheading || "",
            location: item.location || "",
            description: item.description || "",
            category: item.category || "",
            year: item.year || "",
            sortOrder: item.sort_order,
            status: item.status,
            gallery_images: gImages,
        })
        setDialogOpen(true)
    }

    const handleManageHotspots = (item: ProjectWork) => {
        setSelectedItem(item)
        let h: any = item.hotspots;
        try {
            while (typeof h === 'string' && (h.startsWith('[') || h.startsWith('"'))) {
                h = JSON.parse(h);
            }
        } catch (e) {
            console.error("Failed to parse hotspots in handleManageHotspots", e);
        }
        setCurrentHotspots(Array.isArray(h) ? h : [])
        setPendingHotspot(null)
        setHotspotsDialogOpen(true)
    }

    const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setMediaFile(e.target.files[0])
            setFormData(prev => ({ ...prev, image_url: '' }))
        }
    }

    const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setThumbnailFile(e.target.files[0])
            setFormData(prev => ({ ...prev, thumbnail_url: '' }))
        }
    }

    const handleGalleryFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setGalleryFiles(prev => [...prev, ...Array.from(e.target.files as FileList)])
        }
        e.target.value = ''
    }

    const removeGalleryImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            gallery_images: prev.gallery_images.filter((_, i) => i !== index)
        }))
    }

    const removeGalleryFile = (index: number) => {
        setGalleryFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleDeleteClick = (item: ProjectWork) => {
        setItemToDelete(item)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (itemToDelete) {
            try {
                const res = await fetch(`/api/projects/${itemToDelete.id}`, {
                    method: "DELETE"
                })
                if (res.ok) {
                    await fetchItems()
                }
            } catch (error) {
                console.error("Failed to delete project:", error)
            }
            setItemToDelete(null)
        }
        setDeleteDialogOpen(false)
    }

    const handleSaveHotspots = async () => {
        if (!selectedItem) return;
        setIsSaving(true)
        try {
            let h: any = selectedItem.hotspots;
            while (typeof h === 'string' && (h.startsWith('[') || h.startsWith('"'))) {
                h = JSON.parse(h);
            }

            let gImages = selectedItem.gallery_images;
            while (typeof gImages === 'string' && (gImages.startsWith('[') || gImages.startsWith('"'))) {
                gImages = JSON.parse(gImages);
            }

            const payload = {
                title: selectedItem.title,
                subheading: selectedItem.subheading,
                location: selectedItem.location,
                description: selectedItem.description,
                category: selectedItem.category,
                year: selectedItem.year,
                type: selectedItem.type,
                image_url: selectedItem.image_url,
                thumbnail_url: selectedItem.thumbnail_url,
                status: selectedItem.status,
                sortOrder: selectedItem.sort_order,
                hotspots: currentHotspots,
                gallery_images: gImages
            }
            const res = await fetch(`/api/projects/${selectedItem.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })
            if (res.ok) {
                await fetchItems()
                setHotspotsDialogOpen(false)
            } else {
                alert("Failed to save hotspots.")
            }
        } catch (e) {
            console.error("Failed to save hotspots", e)
        } finally {
            setIsSaving(false)
        }
    }

    const handleSave = async () => {
        if (!formData.title.trim() || (!formData.image_url.trim() && !mediaFile)) {
            return
        }

        setIsSaving(true)
        setIsUploading(true)
        try {
            let finalMediaUrl = formData.image_url
            let finalThumbnailUrl = formData.thumbnail_url

            if (mediaFile) {
                const uploadFormData = new FormData()
                uploadFormData.append("file", mediaFile)
                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: uploadFormData,
                })
                if (res.ok) {
                    const data = await res.json()
                    if (data.success && data.urls && data.urls.length > 0) {
                        finalMediaUrl = data.urls[0]
                    } else {
                        alert("API success but no URL returned for media.")
                        return
                    }
                } else {
                    const errText = await res.text()
                    alert("Media upload failed: " + errText)
                    return
                }
            }

            if (thumbnailFile) {
                const uploadFormData = new FormData()
                uploadFormData.append("file", thumbnailFile)
                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: uploadFormData,
                })
                if (res.ok) {
                    const data = await res.json()
                    if (data.success && data.urls && data.urls.length > 0) {
                        finalThumbnailUrl = data.urls[0]
                    } else {
                        alert("API success but no URL returned for thumbnail.")
                    }
                } else {
                    const errText = await res.text()
                    alert("Thumbnail upload failed: " + errText)
                    return
                }
            }

            const finalGalleryUrls = [...formData.gallery_images]
            if (galleryFiles.length > 0) {
                for (const file of galleryFiles) {
                    const uploadFormData = new FormData()
                    uploadFormData.append("file", file)
                    const res = await fetch("/api/upload", {
                        method: "POST",
                        body: uploadFormData,
                    })
                    if (res.ok) {
                        const data = await res.json()
                        if (data.success && data.urls && data.urls.length > 0) {
                            finalGalleryUrls.push(data.urls[0])
                        }
                    }
                }
            }

            let saveHotspots: any = selectedItem?.hotspots || null;
            try {
                while (typeof saveHotspots === 'string' && (saveHotspots.startsWith('[') || saveHotspots.startsWith('"'))) {
                    saveHotspots = JSON.parse(saveHotspots);
                }
            } catch (e) {
                console.error("Failed to parse hotspots for saving", e);
            }

            const payload = {
                ...formData,
                image_url: finalMediaUrl,
                thumbnail_url: finalThumbnailUrl,
                gallery_images: finalGalleryUrls,
                hotspots: saveHotspots
            }

            if (selectedItem) {
                const res = await fetch(`/api/projects/${selectedItem.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                })
                if (res.ok) {
                    await fetchItems()
                    setGalleryFiles([])
                    setDialogOpen(false)
                } else {
                    const errData = await res.text()
                    alert("Failed to update project: " + errData)
                }
            } else {
                const res = await fetch("/api/projects", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                })
                if (res.ok) {
                    await fetchItems()
                    setGalleryFiles([])
                    setDialogOpen(false)
                } else {
                    const errData = await res.text()
                    alert("Failed to save project: " + errData)
                }
            }
        } catch (error) {
            console.error("Failed to save project:", error)
            alert("Unexpected error occurred while saving: " + String(error))
        } finally {
            setIsSaving(false)
            setIsUploading(false)
        }
    }


    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setPendingHotspot({ id: `hotspot_${Date.now()}`, x, y });
    }

    return (
        <DashboardLayout
            title="Projects"
            description="Manage the featured projects displayed on your website."
            requiredPermission="view_our_work"
        >
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Featured Projects</CardTitle>
                                <CardDescription>Add cinematic and residential projects</CardDescription>
                            </div>
                            {canManage && (
                                <Button className="gap-2" onClick={handleAddItem}>
                                    <Plus className="h-4 w-4" />
                                    Add New Project
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">Media</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Hotspots</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12">
                                            <p className="text-muted-foreground">Loading projects...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12">
                                            <p className="text-muted-foreground">No projects found</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map((item) => {
                                        let h: any = item.hotspots;
                                        try {
                                            while (typeof h === 'string' && (h.startsWith('[') || h.startsWith('"'))) {
                                                h = JSON.parse(h);
                                            }
                                        } catch (e) { }
                                        const parsedHotspots = Array.isArray(h) ? h : [];

                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="h-10 w-10 flex items-center justify-center rounded-md bg-secondary overflow-hidden shrink-0">
                                                        {item.type === 'image' ? (
                                                            <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                                                        ) : (
                                                            item.thumbnail_url ? (
                                                                <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <Video className="w-5 h-5 text-muted-foreground" />
                                                            )
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{item.title}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">
                                                        {item.category || "N/A"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">
                                                        {item.type === 'video' ? <Video className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                                                        {item.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {item.type === 'image' && (
                                                        <Badge variant="secondary" className="gap-1.5 cursor-pointer hover:bg-secondary/80" onClick={() => handleManageHotspots(item)}>
                                                            <MapPin className="h-3 w-3" />
                                                            {parsedHotspots.length} maps
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={cn(
                                                            item.status === "active"
                                                                ? "bg-emerald-500/20 text-emerald-400"
                                                                : "bg-gray-500/20 text-gray-400"
                                                        )}
                                                    >
                                                        {item.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {canManage && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                {item.type === 'image' && (
                                                                    <DropdownMenuItem onClick={() => handleManageHotspots(item)}>
                                                                        <MapPin className="mr-2 h-4 w-4" />
                                                                        Hotspots
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => handleDeleteClick(item)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* General Project Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                {/* ... (Existing dialog UI kept exactly the same to save space in code render, since user doesn't see this fully we can just append it normally) ... */}
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedItem ? "Edit Project" : "Add Project"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedItem
                                ? "Update the details for this project."
                                : "Add a new project to your website."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Minimalist Apartment"
                                className="bg-secondary"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="subheading">Subheading</Label>
                            <Input
                                id="subheading"
                                value={formData.subheading}
                                onChange={(e) => setFormData({ ...formData, subheading: e.target.value })}
                                placeholder="e.g., Luxury Residential Project"
                                className="bg-secondary"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="category">Category</Label>
                                <Input
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="e.g., Interior Design"
                                    className="bg-secondary"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="location">Location</Label>
                                <Input
                                    id="location"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="e.g., Dubai Marina, UAE"
                                    className="bg-secondary"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="year">Year</Label>
                            <Input
                                id="year"
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                placeholder="e.g., 2024"
                                className="bg-secondary"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="type">Media Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value: "image" | "video") => {
                                    setFormData(prev => ({ ...prev, type: value, image_url: '' }))
                                    setMediaFile(null)
                                }}
                            >
                                <SelectTrigger className="bg-secondary">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="image">Image</SelectItem>
                                    <SelectItem value="video">Upload Video</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Media *</Label>

                            {(formData.image_url || mediaFile) ? (
                                <div className="space-y-4">
                                    <div className="relative group aspect-video rounded-md overflow-hidden bg-secondary border">
                                        {formData.type === 'video' || (mediaFile && mediaFile.type.startsWith('video/')) ? (
                                            <video
                                                src={mediaFile ? URL.createObjectURL(mediaFile) : formData.image_url}
                                                className="w-full h-full object-contain"
                                                controls
                                            />
                                        ) : (
                                            <img
                                                src={mediaFile ? URL.createObjectURL(mediaFile) : formData.image_url}
                                                alt="Media preview"
                                                className="w-full h-full object-contain"
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, image_url: '' }))
                                                setMediaFile(null)
                                            }}
                                            className="absolute top-2 right-2 bg-black/50 hover:bg-black text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 shadow-sm border rounded-md">
                                            <Input
                                                id="url"
                                                value={formData.image_url || (mediaFile ? mediaFile.name : '')}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, image_url: e.target.value })
                                                    setMediaFile(null)
                                                }}
                                                placeholder={formData.type === 'video' ? "https://.../video.mp4" : "https://.../image.jpg"}
                                                className="border-0 bg-secondary"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center w-full">
                                    <label
                                        htmlFor="portfolio-media-upload"
                                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors border-muted-foreground/25 bg-secondary"
                                    >
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-muted-foreground">{formData.type === 'video' ? 'MP4, WebM' : 'PNG, JPG or WEBP'}</p>
                                        </div>
                                    </label>
                                    <input
                                        id="portfolio-media-upload"
                                        type="file"
                                        className="hidden"
                                        accept={formData.type === 'video' ? "video/*" : "image/*"}
                                        onChange={handleMediaFileChange}
                                    />
                                </div>
                            )}
                        </div>

                        {formData.type === 'video' && (
                            <div className="grid gap-2">
                                <Label>Video Thumbnail (Optional)</Label>
                                {(formData.thumbnail_url || thumbnailFile) ? (
                                    <div className="space-y-4">
                                        <div className="relative group aspect-video rounded-md overflow-hidden bg-secondary border w-48">
                                            <img
                                                src={thumbnailFile ? URL.createObjectURL(thumbnailFile) : formData.thumbnail_url}
                                                alt="Thumbnail preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, thumbnail_url: '' }))
                                                    setThumbnailFile(null)
                                                }}
                                                className="absolute top-1 right-1 bg-black/50 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                        <div className="flex-1 shadow-sm border rounded-md">
                                            <Input
                                                id="thumbnail"
                                                value={formData.thumbnail_url || (thumbnailFile ? thumbnailFile.name : '')}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, thumbnail_url: e.target.value })
                                                    setThumbnailFile(null)
                                                }}
                                                placeholder="https://.../thumbnail.jpg"
                                                className="border-0 bg-secondary"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center w-full">
                                        <label
                                            htmlFor="portfolio-thumbnail-upload"
                                            className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors border-muted-foreground/25 bg-secondary"
                                        >
                                            <div className="flex flex-col items-center justify-center pt-4 pb-4">
                                                <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
                                                <p className="mb-1 text-xs text-muted-foreground"><span className="font-semibold">Click to upload</span> thumbnail</p>
                                            </div>
                                        </label>
                                        <input
                                            id="portfolio-thumbnail-upload"
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleThumbnailFileChange}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Short creative description..."
                                className="bg-secondary resize-none"
                                rows={3}
                            />
                        </div>

                        <div className="grid gap-2 border-t pt-4 mt-2">
                            <Label>Secondary Gallery Images (Optional)</Label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                {formData.gallery_images.map((url: string, i: number) => {
                                    const isVideo = url.match(/\.(mp4|webm|mov|ogg)$|^data:video/i);
                                    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
                                    const ytId = isYoutube ? getYoutubeId(url) : null;

                                    return (
                                        <div key={`url-${i}`} className="relative group aspect-square rounded-md overflow-hidden bg-secondary border">
                                            {isYoutube ? (
                                                <div className="w-full h-full relative">
                                                    <img
                                                        src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                                                        className="w-full h-full object-cover"
                                                        alt="YouTube thumb"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                        <Youtube className="w-8 h-8 text-white opacity-80" />
                                                    </div>
                                                </div>
                                            ) : isVideo ? (
                                                <video src={url} className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={url} alt="Gallery image" className="w-full h-full object-cover" />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeGalleryImage(i)}
                                                className="absolute top-1 right-1 bg-black/50 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )
                                })}
                                {galleryFiles.map((f, i) => {
                                    const isVideo = f.type.startsWith('video/');
                                    return (
                                        <div key={`file-${i}`} className="relative group aspect-square rounded-md overflow-hidden bg-secondary border opacity-80">
                                            {isVideo ? (
                                                <video src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={URL.createObjectURL(f)} alt="Gallery pending" className="w-full h-full object-cover" />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeGalleryFile(i)}
                                                className="absolute top-1 right-1 bg-black/50 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                            <div className="absolute inset-x-0 bottom-0 bg-black/50 p-1 text-[10px] text-white text-center truncate">Pending</div>
                                        </div>
                                    )
                                })}

                                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors border-muted-foreground/25 bg-secondary">
                                    <Plus className="w-6 h-6 text-muted-foreground" />
                                    <input type="file" multiple className="hidden" accept="image/*,video/*" onChange={handleGalleryFilesChange} />
                                </label>
                            </div>
                        </div>

                        <div className="grid gap-2 border-t pt-4">
                            <Label>Add YouTube Video</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Paste YouTube link (e.g., https://www.youtube.com/watch?v=...)"
                                    className="bg-secondary"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addYoutubeLink();
                                        }
                                    }}
                                />
                                <Button type="button" onClick={addYoutubeLink} variant="secondary">Add</Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="sortOrder">Sort Order</Label>
                                <Input
                                    id="sortOrder"
                                    type="number"
                                    value={formData.sortOrder}
                                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                                    className="bg-secondary"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value: "active" | "inactive") =>
                                        setFormData({ ...formData, status: value })
                                    }
                                >
                                    <SelectTrigger className="bg-secondary">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            className="bg-transparent"
                            disabled={isSaving || isUploading}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={!formData.title.trim() || (!formData.image_url.trim() && !mediaFile) || isSaving || isUploading}>
                            {isUploading || isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {isUploading ? "Uploading..." : "Saving..."}
                                </>
                            ) : (
                                selectedItem ? "Save Changes" : "Add Project"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteConfirm}
                title="Delete Project"
                description={`Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be undone.`}
            />

            {/* Hotspots Dialog */}
            <Dialog open={hotspotsDialogOpen} onOpenChange={setHotspotsDialogOpen}>
                <DialogContent className="sm:max-w-[1200px] w-[95vw] h-[90vh] md:h-[80vh] flex flex-col md:flex-row gap-0 p-0 overflow-hidden" aria-describedby="Map hotspots dialog">
                    <div className="w-full md:flex-1 bg-black flex items-center justify-center relative min-h-[50vh]">
                        {selectedItem?.image_url && (
                            <div className="relative cursor-crosshair max-h-[80vh]" onClick={handleImageClick}>
                                <img
                                    src={selectedItem.image_url}
                                    alt="Map Hotspot"
                                    className="w-full max-h-[80vh] object-contain pointer-events-none"
                                />

                                {/* Render Active Hotspots */}
                                {currentHotspots.map((hs, i) => (
                                    <div
                                        key={hs.id}
                                        className="absolute w-6 h-6 -ml-3 -mt-3 bg-accent rounded-full text-black flex items-center justify-center text-xs font-bold ring-2 ring-white cursor-pointer hover:scale-110 transition-transform"
                                        style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPendingHotspot(hs);
                                        }}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </div>
                                ))}

                                {/* Render Pending Hotspot */}
                                {pendingHotspot && (
                                    <div
                                        className="absolute w-8 h-8 -ml-4 -mt-4 bg-white rounded-full text-black flex items-center justify-center ring-4 ring-accent animate-pulse"
                                        style={{ left: `${pendingHotspot.x}%`, top: `${pendingHotspot.y}%` }}
                                    >
                                        <Plus className="w-5 h-5 text-accent" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="w-full md:w-[400px] shrink-0 bg-background border-l p-6 flex flex-col h-[50vh] md:h-full overflow-y-auto">
                        <div className="mb-6">
                            <h3 className="text-xl font-heading mb-1">Map Hotspots</h3>
                            <p className="text-sm text-muted-foreground">Click anywhere on the image to drop a pinpoint. Link it to a product to allow users to buy directly.</p>
                        </div>

                        {pendingHotspot ? (
                            <div className="space-y-4 flex-1">
                                <div className="space-y-2">
                                    <Label>Select Product</Label>
                                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={comboboxOpen}
                                                className="w-full justify-between bg-secondary font-normal"
                                            >
                                                {pendingHotspot.product_id
                                                    ? <span className="truncate">{pendingHotspot.product_name}</span>
                                                    : "Search products..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[350px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search products..." />
                                                <CommandList>
                                                    <CommandEmpty>No product found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {products.map((p) => (
                                                            <CommandItem
                                                                key={p.id}
                                                                value={`${p.name} ${p.id}`}
                                                                onSelect={() => {
                                                                    setPendingHotspot({
                                                                        ...pendingHotspot,
                                                                        product_id: p.id,
                                                                        product_name: p.name,
                                                                        product_slug: p.slug,
                                                                        product_price: p.price,
                                                                        product_image: p.images && p.images[0] ? p.images[0] : null
                                                                    })
                                                                    setComboboxOpen(false)
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4 flex-shrink-0",
                                                                        pendingHotspot.product_id === p.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                <div className="flex items-center gap-2 truncate">
                                                                    {p.images?.[0] && (
                                                                        <img src={p.images[0]} alt="" className="w-6 h-6 object-cover rounded bg-muted flex-shrink-0" />
                                                                    )}
                                                                    <span className="truncate flex-1">{p.name}</span>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {pendingHotspot.product_name && (
                                    <div className="p-3 bg-secondary rounded-md flex items-center gap-3">
                                        {pendingHotspot.product_image && (
                                            <img src={pendingHotspot.product_image} alt="preview" className="w-10 h-10 object-cover rounded bg-muted" />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium">{pendingHotspot.product_name}</p>
                                            <p className="text-xs text-muted-foreground">${pendingHotspot.product_price}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-4">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => {
                                            // Handle delete pending
                                            setCurrentHotspots(currentHotspots.filter(h => h.id !== pendingHotspot.id));
                                            setPendingHotspot(null);
                                        }}
                                    >
                                        Remove
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        disabled={!pendingHotspot.product_id}
                                        onClick={() => {
                                            const filtered = currentHotspots.filter(h => h.id !== pendingHotspot.id);
                                            setCurrentHotspots([...filtered, pendingHotspot]);
                                            setPendingHotspot(null);
                                        }}
                                    >
                                        Apply
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1">
                                {currentHotspots.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2 opacity-60">
                                        <MapPin className="w-8 h-8 mx-auto" />
                                        <p className="text-sm">No hotposts added.<br />Click on the image to add one.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <Label className="text-xs uppercase text-muted-foreground">Active Hotspots ({currentHotspots.length})</Label>
                                        {currentHotspots.map(hs => (
                                            <div key={hs.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg cursor-pointer hover:bg-secondary/80" onClick={() => setPendingHotspot(hs)}>
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-6 h-6 bg-accent text-black rounded-full flex items-center justify-center shrink-0">
                                                        <Check size={12} />
                                                    </div>
                                                    <p className="text-sm font-medium truncate">{hs.product_name || "Unlinked Pin"}</p>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentHotspots(currentHotspots.filter(h => h.id !== hs.id));
                                                }}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="pt-6 mt-auto flex gap-2">
                            <Button variant="ghost" onClick={() => setHotspotsDialogOpen(false)} className="flex-1">Cancel</Button>
                            <Button onClick={handleSaveHotspots} disabled={isSaving} className="flex-1">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Map"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    )
}
