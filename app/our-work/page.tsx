"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Plus,
    MoreHorizontal,
    Pencil,
    Trash2,
    Video,
    Image as ImageIcon,
    Upload,
    Loader2,
    X,
    Link as LinkIcon
} from "lucide-react"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { cn } from "@/lib/utils"

export interface OurWork {
    id: string
    type: "photo" | "video"
    url: string
    thumbnail: string | null
    title: string
    description: string | null
    sort_order: number
    status: "active" | "inactive"
    created_at: string
}

// Helper to extract YouTube ID
const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// Helper to extract Instagram Reel ID
const getInstagramId = (url: string) => {
    const regExp = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|reels)\/([^/?#&]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
};

export default function OurWorkPage() {
    const { hasPermission } = useAuth()
    const canManage = hasPermission("manage_our_work")

    const [items, setItems] = useState<OurWork[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<OurWork | null>(null)
    const [itemToDelete, setItemToDelete] = useState<OurWork | null>(null)

    const [mediaFile, setMediaFile] = useState<File | null>(null)
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isYoutubeMode, setIsYoutubeMode] = useState(false)
    const [isInstagramMode, setIsInstagramMode] = useState(false)

    const [formData, setFormData] = useState({
        type: "photo" as "photo" | "video",
        url: "",
        thumbnail: "",
        title: "",
        description: "",
        sortOrder: 0,
        status: "active" as "active" | "inactive",
    })

    const fetchItems = useCallback(async () => {
        try {
            setIsLoading(true)
            const res = await fetch("/api/our-work?limit=100")
            if (res.ok) {
                const data = await res.json()
                setItems(data.data || [])
            }
        } catch (error) {
            console.error("Failed to fetch our work items", error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchItems()
    }, [fetchItems])

    const handleAddItem = () => {
        setSelectedItem(null)
        setMediaFile(null)
        setThumbnailFile(null)
        setIsYoutubeMode(false)
        setIsInstagramMode(false)
        setFormData({
            type: "photo",
            url: "",
            thumbnail: "",
            title: "",
            description: "",
            sortOrder: 0,
            status: "active",
        })
        setDialogOpen(true)
    }

    const handleEditItem = (item: OurWork) => {
        setSelectedItem(item)
        setMediaFile(null)
        setThumbnailFile(null)
        setIsYoutubeMode(!!getYouTubeId(item.url))
        setIsInstagramMode(!!getInstagramId(item.url))
        setFormData({
            type: item.type,
            url: item.url,
            thumbnail: item.thumbnail || "",
            title: item.title,
            description: item.description || "",
            sortOrder: item.sort_order,
            status: item.status,
        })
        setDialogOpen(true)
    }

    const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setMediaFile(e.target.files[0])
            setFormData(prev => ({ ...prev, url: '' })) // Clear URL if new file chosen
        }
    }

    const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setThumbnailFile(e.target.files[0])
            setFormData(prev => ({ ...prev, thumbnail: '' })) // Clear thumbnail URL if new file chosen
        }
    }

    const handleDeleteClick = (item: OurWork) => {
        setItemToDelete(item)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (itemToDelete) {
            try {
                const res = await fetch(`/api/our-work/${itemToDelete.id}`, {
                    method: "DELETE"
                })
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
        if (!formData.title.trim() || (!formData.url.trim() && !mediaFile)) {
            return
        }

        setIsSaving(true)
        setIsUploading(true)
        try {
            let finalMediaUrl = formData.url
            let finalThumbnailUrl = formData.thumbnail

            // Upload main media file if selected
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

            // Upload thumbnail file if selected
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

            const payload = {
                ...formData,
                url: finalMediaUrl,
                thumbnail: finalThumbnailUrl
            }

            if (selectedItem) {
                const res = await fetch(`/api/our-work/${selectedItem.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                })
                if (res.ok) {
                    await fetchItems()
                    setDialogOpen(false)
                } else {
                    const errData = await res.text()
                    alert("Failed to update item: " + errData)
                }
            } else {
                const res = await fetch("/api/our-work", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                })
                if (res.ok) {
                    await fetchItems()
                    setDialogOpen(false)
                } else {
                    const errData = await res.text()
                    alert("Failed to save item: " + errData)
                }
            }
        } catch (error) {
            console.error("Failed to save item:", error)
            alert("Unexpected error occurred while saving: " + String(error))
        } finally {
            setIsSaving(false)
            setIsUploading(false)
        }
    }

    return (
        <DashboardLayout
            title="Our Work"
            description="Manage the photos and videos displayed in the Our Work section on the homepage."
            requiredPermission="view_our_work"
        >
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Portfolio Items</CardTitle>
                                <CardDescription>Add beautiful shots of completed interior designs</CardDescription>
                            </div>
                            {canManage && (
                                <Button className="gap-2" onClick={handleAddItem}>
                                    <Plus className="h-4 w-4" />
                                    Add New Item
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
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
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
                                                    {item.type === 'photo' ? (
                                                        <img src={item.url} alt={item.title} className="h-full w-full object-cover" />
                                                    ) : (
                                                        item.thumbnail ? (
                                                            <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
                                                        ) : getYouTubeId(item.url) ? (
                                                            <img src={`https://img.youtube.com/vi/${getYouTubeId(item.url)}/maxresdefault.jpg`} alt={item.title} className="h-full w-full object-cover" />
                                                        ) : getInstagramId(item.url) ? (
                                                            <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-orange-400/20">
                                                                <LinkIcon className="w-5 h-5 text-pink-500" />
                                                            </div>
                                                        ) : (
                                                            <Video className="w-5 h-5 text-muted-foreground" />
                                                        )
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{item.title}</p>
                                                    {item.description && (
                                                        <p className="text-xs text-muted-foreground truncate max-w-xs md:max-w-md">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {item.type === 'video' ? (
                                                        getYouTubeId(item.url) ? <LinkIcon className="w-3 h-3 mr-1" /> :
                                                        getInstagramId(item.url) ? <LinkIcon className="w-3 h-3 mr-1 text-pink-500" /> :
                                                        <Video className="w-3 h-3 mr-1" />
                                                    ) : <ImageIcon className="w-3 h-3 mr-1" />}
                                                    {item.type === 'video' && getYouTubeId(item.url) ? 'YouTube' :
                                                     item.type === 'video' && getInstagramId(item.url) ? 'Instagram' : item.type}
                                                </Badge>
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
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedItem ? "Edit Portfolio Item" : "Add Portfolio Item"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedItem
                                ? "Update the details for this item."
                                : "Add a new media item to show in your portfolio."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
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
                            <Label htmlFor="type">Media Type</Label>
                            <Select
                                value={isYoutubeMode ? "youtube" : isInstagramMode ? "instagram" : formData.type}
                                onValueChange={(value: "photo" | "video" | "youtube" | "instagram") => {
                                    if (value === "youtube") {
                                        setIsYoutubeMode(true)
                                        setIsInstagramMode(false)
                                        setFormData(prev => ({ ...prev, type: "video", url: '' }))
                                    } else if (value === "instagram") {
                                        setIsInstagramMode(true)
                                        setIsYoutubeMode(false)
                                        setFormData(prev => ({ ...prev, type: "video", url: '' }))
                                    } else {
                                        setIsYoutubeMode(false)
                                        setIsInstagramMode(false)
                                        setFormData(prev => ({ ...prev, type: value as "photo" | "video", url: '' }))
                                    }
                                }}
                            >
                                <SelectTrigger className="bg-secondary">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="photo">Photo</SelectItem>
                                    <SelectItem value="video">Upload Video</SelectItem>
                                    <SelectItem value="youtube">YouTube Link</SelectItem>
                                    <SelectItem value="instagram">Instagram Reel</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>{isYoutubeMode ? "YouTube URL *" : isInstagramMode ? "Instagram Reel URL *" : "Media *"}</Label>

                            {(formData.url || mediaFile || isYoutubeMode || isInstagramMode) ? (
                                <div className="space-y-4">
                                    {(isYoutubeMode || isInstagramMode) && !formData.url ? (
                                        <div className="flex-1 shadow-sm border rounded-md">
                                            <Input
                                                id="link-url"
                                                value={formData.url}
                                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                                placeholder={isInstagramMode ? "https://www.instagram.com/reel/..." : "https://www.youtube.com/watch?v=..."}
                                                className="border-0 bg-secondary"
                                            />
                                        </div>
                                    ) : null}

                                    {(formData.url || mediaFile) && (
                                        <div className="relative group aspect-video rounded-md overflow-hidden bg-secondary border">
                                            {isYoutubeMode && getYouTubeId(formData.url) ? (
                                                <iframe
                                                    src={`https://www.youtube.com/embed/${getYouTubeId(formData.url)}`}
                                                    title="YouTube preview"
                                                    className="w-full h-full border-0"
                                                    allowFullScreen
                                                />
                                            ) : isInstagramMode && getInstagramId(formData.url) ? (
                                                <iframe
                                                    src={`https://www.instagram.com/reel/${getInstagramId(formData.url)}/embed/`}
                                                    title="Instagram Reel preview"
                                                    className="w-full h-full border-0"
                                                    allowFullScreen
                                                />
                                            ) : formData.type === 'video' || (mediaFile && mediaFile.type.startsWith('video/')) ? (
                                                <video
                                                    src={mediaFile ? URL.createObjectURL(mediaFile) : formData.url}
                                                    className="w-full h-full object-contain"
                                                    controls
                                                />
                                            ) : (
                                                <img
                                                    src={mediaFile ? URL.createObjectURL(mediaFile) : formData.url}
                                                    alt="Media preview"
                                                    className="w-full h-full object-contain"
                                                />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, url: '' }))
                                                    setMediaFile(null)
                                                }}
                                                className="absolute top-2 right-2 bg-black/50 hover:bg-black text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}

                                    {(!isYoutubeMode && !isInstagramMode) && (formData.url || mediaFile) && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 shadow-sm border rounded-md">
                                                <Input
                                                    id="url"
                                                    value={formData.url || (mediaFile ? mediaFile.name : '')}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, url: e.target.value })
                                                        setMediaFile(null)
                                                    }}
                                                    placeholder={formData.type === 'video' ? "https://.../video.mp4" : "https://.../image.jpg"}
                                                    className="border-0 bg-secondary"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {(isYoutubeMode || isInstagramMode) && formData.url && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 shadow-sm border rounded-md">
                                                <Input
                                                    id="link-url-filled"
                                                    value={formData.url}
                                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                                    placeholder={isInstagramMode ? "https://www.instagram.com/reel/..." : "https://www.youtube.com/watch?v=..."}
                                                    className="border-0 bg-secondary"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : isInstagramMode ? (
                                <div className="flex-1 shadow-sm border rounded-md">
                                    <Input
                                        id="instagram-url-initial"
                                        value={formData.url}
                                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                        placeholder="https://www.instagram.com/reel/..."
                                        className="border-0 bg-secondary"
                                    />
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

                        {(formData.type === 'video' || isInstagramMode) && (
                            <div className="grid gap-2">
                                <Label>{isInstagramMode ? "Reel Thumbnail (Recommended)" : "Video Thumbnail (Optional)"}</Label>
                                {(formData.thumbnail || thumbnailFile) ? (
                                    <div className="space-y-4">
                                        <div className="relative group aspect-video rounded-md overflow-hidden bg-secondary border w-48">
                                            <img
                                                src={thumbnailFile ? URL.createObjectURL(thumbnailFile) : formData.thumbnail}
                                                alt="Thumbnail preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, thumbnail: '' }))
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
                                                value={formData.thumbnail || (thumbnailFile ? thumbnailFile.name : '')}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, thumbnail: e.target.value })
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
                        <Button onClick={handleSave} disabled={!formData.title.trim() || (!formData.url.trim() && !mediaFile) || isSaving || isUploading}>
                            {isUploading || isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {isUploading ? "Uploading..." : "Saving..."}
                                </>
                            ) : (
                                selectedItem ? "Save Changes" : "Add Item"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DeleteDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleDeleteConfirm}
                title="Delete Item"
                description={`Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be undone.`}
            />
        </DashboardLayout>
    )
}
