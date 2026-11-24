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
import { Youtube, X, Plus, Video, Image as ImageIcon, Loader2, Upload } from "lucide-react"
import { RichEditor } from "./rich-editor"
import { type Blog } from "@/lib/api-client"

interface BlogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  blog?: Blog | null
  onSave: (blogData: Partial<Blog>) => Promise<void>
}

export function BlogDialog({ open, onOpenChange, blog, onSave }: BlogDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    category: "",
    author: "",
    excerpt: "",
    content: "",
    video_url: "",
    gallery_images: [] as string[],
    schema_data: "",
    status: "active" as "active" | "draft" | "archived",
  })
  const [image, setImage] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (blog) {
      let gImages = blog.gallery_images;
      try {
        while (typeof gImages === 'string' && (gImages.startsWith('[') || gImages.startsWith('"'))) {
          gImages = JSON.parse(gImages);
        }
      } catch (e) { }
      if (!Array.isArray(gImages)) gImages = [];

      setFormData({
        title: blog.title,
        slug: blog.slug,
        category: blog.category || "",
        author: blog.author || "",
        excerpt: blog.excerpt || "",
        content: blog.content || "",
        video_url: blog.video_url || "",
        gallery_images: gImages,
        schema_data: blog.schema_data || "",
        status: blog.status || "active",
      })
      setImage(blog.image || null)
      setFile(null)
      setGalleryFiles([])
    } else {
      setFormData({
        title: "",
        slug: "",
        category: "",
        author: "Al Subaiha Editorial",
        excerpt: "",
        content: "",
        video_url: "",
        gallery_images: [],
        schema_data: "",
        status: "active",
      })
      setImage(null)
      setFile(null)
      setGalleryFiles([])
    }
  }, [blog, open])

  // Auto-generate slug from title
  useEffect(() => {
    if (!blog && formData.title) {
      const generatedSlug = formData.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
      setFormData(prev => ({ ...prev, slug: generatedSlug }))
    }
  }, [formData.title, blog])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setImage(URL.createObjectURL(e.target.files[0]))
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

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  const addYoutubeLink = () => {
    if (!youtubeUrl.trim()) return;
    const id = getYouTubeId(youtubeUrl);
    if (!id) {
      alert("Invalid YouTube URL");
      return;
    }

    setFormData(prev => ({
      ...prev,
      gallery_images: [...prev.gallery_images, youtubeUrl]
    }));
    setYoutubeUrl("");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)

    try {
      let imageUrl = image

      if (file) {
        const uploadData = new FormData()
        uploadData.append("file", file)

        const res = await fetch("/api/upload", {
          method: "POST",
          body: uploadData,
        })

        if (res.ok) {
          const data = await res.json()
          if (data.success && data.urls.length > 0) {
            imageUrl = data.urls[0]
          }
        }
      }

      const finalGalleryUrls = [...formData.gallery_images]
      if (galleryFiles.length > 0) {
        for (const f of galleryFiles) {
          const uploadData = new FormData()
          uploadData.append("file", f)
          const res = await fetch("/api/upload", {
            method: "POST",
            body: uploadData,
          })
          if (res.ok) {
            const data = await res.json()
            if (data.success && data.urls && data.urls.length > 0) {
              finalGalleryUrls.push(data.urls[0])
            }
          }
        }
      }

      await onSave({
        ...formData,
        image: imageUrl,
        gallery_images: finalGalleryUrls,
        schema_data: formData.schema_data,
        id: blog?.id,
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save blog:", error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{blog ? "Edit Blog Post" : "Create New Blog Post"}</DialogTitle>
          <DialogDescription>
            Post articles about products, design trends, and company updates.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., The Future of Sustainable Design"
                  className="bg-secondary"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="future-sustainable-design"
                  className="bg-secondary"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Design Trends"
                  className="bg-secondary"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Author name"
                  className="bg-secondary"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Article Status</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={formData.status === "active" ? "default" : "outline"}
                  className={formData.status === "active" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  onClick={() => setFormData({ ...formData, status: "active" })}
                >
                  Active / Published
                </Button>
                <Button
                  type="button"
                  variant={formData.status === "draft" ? "default" : "outline"}
                  className={formData.status === "draft" ? "bg-amber-600 hover:bg-amber-700" : ""}
                  onClick={() => setFormData({ ...formData, status: "draft" })}
                >
                  Save as Draft
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt / Summary</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="A brief summary of the post..."
                className="bg-secondary resize-none"
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="image">Featured Image</Label>
              <div className="flex flex-col gap-4">
                {image && (
                  <div className="relative group aspect-[21/9] rounded-md overflow-hidden bg-secondary border">
                    <img src={image} alt="Featured" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImage(null); setFile(null); }}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {!image && (
                  <label htmlFor="blog-image" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors border-muted-foreground/25">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground"><span className="font-semibold">Upload cover image</span></p>
                    </div>
                    <input id="blog-image" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-4 border rounded-lg p-4 bg-secondary/30">
              <Label className="text-base">Media Gallery (Multi-Video & Images)</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gallery-upload" className="text-xs text-muted-foreground">Upload Images</Label>
                  <label htmlFor="gallery-upload" className="flex items-center justify-center w-full h-10 border border-dashed rounded-md cursor-pointer hover:bg-secondary transition-colors border-muted-foreground/25 bg-background">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium">Click to upload</span>
                    </div>
                    <input id="gallery-upload" type="file" className="hidden" accept="image/*" multiple onChange={handleGalleryFilesChange} />
                  </label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="yt-url" className="text-xs text-muted-foreground">Add YouTube Link</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Youtube className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="yt-url"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="YouTube URL..."
                        className="pl-8 h-10 text-xs bg-background"
                      />
                    </div>
                    <Button type="button" size="sm" onClick={addYoutubeLink} className="h-10">Add</Button>
                  </div>
                </div>
              </div>

              {/* Gallery Preview */}
              {(formData.gallery_images.length > 0 || galleryFiles.length > 0) && (
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {formData.gallery_images.map((url, index) => {
                    const isYT = url.includes('youtube.com') || url.includes('youtu.be');
                    const ytId = isYT ? getYouTubeId(url) : null;
                    return (
                      <div key={`existing-${index}`} className="relative group aspect-square rounded-md overflow-hidden bg-background border">
                        {isYT ? (
                          <div className="w-full h-full relative">
                            <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} className="w-full h-full object-cover" alt="YT" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Youtube className="w-6 h-6 text-red-600 fill-red-600" />
                            </div>
                          </div>
                        ) : (
                          <img src={url} className="w-full h-full object-cover" alt="Gallery" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(index)}
                          className="absolute top-1 right-1 bg-black/50 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                  {galleryFiles.map((f, index) => (
                    <div key={`new-${index}`} className="relative group aspect-square rounded-md overflow-hidden bg-background border">
                      <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="New" />
                      <div className="absolute top-1 left-1 bg-emerald-500 text-[8px] text-white px-1 rounded shadow-sm">NEW</div>
                      <button
                        type="button"
                        onClick={() => removeGalleryFile(index)}
                        className="absolute top-1 right-1 bg-black/50 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="video_url">Main Feature Video URL (Optional)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Video className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="video_url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    placeholder="https://youtube.com/..."
                    className="pl-10 bg-secondary"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schema_data">Schema.org Data (JSON-LD)</Label>
              <Textarea
                id="schema_data"
                value={formData.schema_data}
                onChange={(e) => setFormData({ ...formData, schema_data: e.target.value })}
                placeholder='{"@context": "https://schema.org", "@type": "BlogPosting", ...}'
                className="bg-secondary resize-none font-mono text-xs"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">Add structured data for SEO (JSON-LD format)</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">Article Content (Classic Editor)</Label>
              <RichEditor
                value={formData.content}
                onChange={(val) => setFormData({ ...formData, content: val })}
                placeholder="Write your article here..."
                className="min-h-[400px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent" disabled={isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? "Saving..." : (blog ? "Update Post" : "Publish Post")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
