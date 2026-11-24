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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCategories } from "@/lib/categories-context"
import { ChevronRight, X, Upload, Loader2, Youtube, Instagram } from "lucide-react"

export interface Product {
  id: string
  name: string
  category: string
  categoryId?: string
  designerId?: string
  designerName?: string
  price: number
  stock: number
  status: string
  description?: string
  image: string
  images?: string[]
}

interface ProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  onSave: (product: Omit<Product, "id" | "status" | "image"> & { id?: string; categoryId?: string; designerId?: string; images?: string[]; image?: string }) => void
}

export function ProductDialog({ open, onOpenChange, product, onSave }: ProductDialogProps) {
  const { categories, getFullCategoryName, getCategoryById } = useCategories()
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    designerId: "",
    price: "",
    stock: "",
    description: "",
  })
  const [designers, setDesigners] = useState<{ id: string; name: string }[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [instagramUrl, setInstagramUrl] = useState("")

  useEffect(() => {
    const fetchDesigners = async () => {
      try {
        const res = await fetch("/api/designers?limit=100")
        if (res.ok) {
          const json = await res.json()
          setDesigners(json.data || [])
        }
      } catch (err) {
        console.error("Failed to fetch designers in product dialog:", err)
      }
    }
    if (open) {
      fetchDesigners()
    }
  }, [open])

  // Matches regular watch URLs, youtu.be short links, embeds, and Shorts
  // (youtube.com/shorts/<id>) — Shorts videos use the same 11-char ID scheme.
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|shorts\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  const getInstagramId = (url: string) => {
    const regExp = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|reels)\/([^/?#&]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  }

  const addYoutubeLink = () => {
    if (!youtubeUrl.trim()) return;
    const id = getYoutubeId(youtubeUrl);
    if (!id) {
        alert("Invalid YouTube URL");
        return;
    }

    setExistingImages(prev => [...prev, youtubeUrl]);
    setYoutubeUrl("");
  }

  const addInstagramLink = () => {
    if (!instagramUrl.trim()) return;
    const id = getInstagramId(instagramUrl);
    if (!id) {
        alert("Invalid Instagram URL");
        return;
    }

    setExistingImages(prev => [...prev, instagramUrl]);
    setInstagramUrl("");
  }

  // Get all leaf categories (categories without children) for product assignment
  const leafCategories = categories.filter(
    (cat) => !categories.some((c) => c.parentId === cat.id) && cat.status === "active"
  )

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        categoryId: product.categoryId || "",
        designerId: product.designerId || "",
        price: product.price.toString(),
        stock: product.stock.toString(),
        description: product.description || "",
      })
      setExistingImages(product.images && product.images.length > 0
        ? product.images
        : (product.image && product.image !== "/placeholder.svg" ? [product.image] : []))
      setFiles([])
    } else {
      setFormData({
        name: "",
        categoryId: "",
        designerId: "",
        price: "",
        stock: "",
        description: "",
      })
      setExistingImages([])
      setFiles([])
    }
  }, [product, open])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)

    try {
      let uploadedUrls: string[] = []

      if (files.length > 0) {
        const formData = new FormData()
        files.forEach((file) => {
          formData.append("file", file)
        })

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            uploadedUrls = data.urls
          }
        }
      }

      const allImages = [...existingImages, ...uploadedUrls]

      const selectedCategory = getCategoryById(formData.categoryId)
      onSave({
        id: product?.id,
        name: formData.name,
        category: selectedCategory ? selectedCategory.name : formData.categoryId,
        categoryId: formData.categoryId,
        designerId: formData.designerId === "none" || !formData.designerId ? undefined : formData.designerId,
        price: Number.parseFloat(formData.price),
        stock: Number.parseInt(formData.stock),
        description: formData.description,
        images: allImages,
        image: allImages.length > 0 ? allImages[0] : undefined,
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to upload images:", error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            {product ? "Update the product details below." : "Fill in the details to add a new product."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Velvet Sofa - Navy"
                className="bg-secondary"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="designer">Designer (Optional)</Label>
              <Select
                value={formData.designerId || "none"}
                onValueChange={(value) => setFormData({ ...formData, designerId: value })}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select designer (none)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / No Designer</SelectItem>
                  {designers.map((designer) => (
                    <SelectItem key={designer.id} value={designer.id}>
                      {designer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  required
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {leafCategories.length === 0 ? (
                      <SelectItem value="" disabled>
                        No categories available
                      </SelectItem>
                    ) : (
                      leafCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-1 text-sm">
                            {getFullCategoryName(cat.id).split(" > ").map((part, idx, arr) => (
                              <span key={part} className="flex items-center">
                                <span className={idx === arr.length - 1 ? "font-medium" : "text-muted-foreground"}>
                                  {part}
                                </span>
                                {idx < arr.length - 1 && (
                                  <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground" />
                                )}
                              </span>
                            ))}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="bg-secondary"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stock">Stock Quantity</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
                className="bg-secondary"
                required
                min="0"
              />
            </div>

            <div className="grid gap-2">
              <Label>Product Images</Label>
              <div className="flex flex-col gap-4">
                {(existingImages.length > 0 || files.length > 0) && (
                  <div className="grid grid-cols-4 gap-2">
                    {existingImages.map((url, index) => {
                      const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
                      const ytId = isYoutube ? getYoutubeId(url) : null;
                      const isInstagram = !isYoutube && url.includes('instagram.com');

                      return (
                        <div key={`existing-${index}`} className="relative group aspect-square rounded-md overflow-hidden bg-secondary border">
                          {isYoutube ? (
                            <div className="w-full h-full relative">
                              <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="YT" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <Youtube className="w-8 h-8 text-white opacity-80" />
                              </div>
                            </div>
                          ) : isInstagram ? (
                            <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-orange-400/20">
                              <Instagram className="w-8 h-8 text-pink-500" />
                            </div>
                          ) : (
                            <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
                            className="absolute top-1 right-1 bg-black/50 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                    {files.map((file, index) => (
                      <div key={`file-${index}`} className="relative group aspect-square rounded-md overflow-hidden bg-secondary border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(file)} alt={`New upload ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-1 right-1 bg-black/50 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-center w-full">
                  <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors border-muted-foreground/25">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG or WEBP (MAX. 5MB)</p>
                    </div>
                    <input id="image-upload" type="file" className="hidden" multiple accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Paste YouTube link (video or Shorts)"
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
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste Instagram link (post or reel)"
                    className="bg-secondary"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addInstagramLink();
                        }
                    }}
                  />
                  <Button type="button" onClick={addInstagramLink} variant="secondary">Add</Button>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description..."
                className="bg-secondary resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent" disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? "Uploading..." : (product ? "Save Changes" : "Add Product")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
