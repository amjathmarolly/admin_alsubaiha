"use client"

import { useState, useMemo, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { useCategories, type Category } from "@/lib/categories-context"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderTree,
  ChevronRight,
  FolderOpen,
  Folder,
  Package,
  Eye,
  Copy,
  Loader2,
  Upload,
  Image as ImageIcon,
  X,
} from "lucide-react"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { cn, normalizeImageUrl } from "@/lib/utils"

export default function CategoriesPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission("manage_products")
  const {
    categories,
    isLoading: categoriesLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    getRootCategories,
    getSubCategories,
    getFullCategoryName,
    getCategoryPath,
  } = useCategories()

  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState("tree")

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parentId: "",
    status: "active" as "active" | "inactive",
    image: "",
  })

  // Handlers for image file selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0])
      setFormData(prev => ({ ...prev, image: '' }))
    }
  }

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesLevel = levelFilter === "all" || cat.level.toString() === levelFilter
      const matchesStatus = statusFilter === "all" || cat.status === statusFilter
      return matchesSearch && matchesLevel && matchesStatus
    })
  }, [categories, searchQuery, levelFilter, statusFilter])

  const rootCategories = getRootCategories()

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedCategories(newExpanded)
  }

  const handleAddCategory = (parentId?: string) => {
    setSelectedCategory(null)
    setImageFile(null)
    setFormData({
      name: "",
      description: "",
      parentId: parentId || "none",
      status: "active",
      image: "",
    })
    setDialogOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category)
    setImageFile(null)
    setFormData({
      name: category.name,
      description: category.description || "",
      parentId: category.parentId || "none",
      status: category.status,
      image: category.image || "",
    })
    setDialogOpen(true)
  }

  const handleDuplicateCategory = (category: Category) => {
    setSelectedCategory(null)
    setImageFile(null)
    setFormData({
      name: `${category.name} (Copy)`,
      description: category.description || "",
      parentId: category.parentId || "none",
      status: category.status,
      image: category.image || "",
    })
    setDialogOpen(true)
  }

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (categoryToDelete) {
      try {
        await deleteCategory(categoryToDelete.id)
      } catch (error) {
        console.error("Failed to delete category:", error)
      }
      setCategoryToDelete(null)
    }
    setDeleteDialogOpen(false)
  }

  const handleSave = async () => {
    const actualParentId = formData.parentId === "none" ? null : formData.parentId
    const parentCategory = actualParentId ? categories.find(c => c.id === actualParentId) : null
    const level = parentCategory ? parentCategory.level + 1 : 0

    if (level > 2) {
      alert("Maximum category depth is 3 levels (Category > Sub-category > Child category)")
      return
    }

    if (!formData.name.trim()) {
      return
    }

    setIsSaving(true)
    setIsUploading(true)
    try {
      let finalImageUrl = formData.image

      if (imageFile) {
        const uploadFormData = new FormData()
        uploadFormData.append("file", imageFile)
        const res = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        })
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.urls && data.urls.length > 0) {
            finalImageUrl = data.urls[0]
          } else {
            alert("API success but no URL returned for image.")
            return
          }
        } else {
          const errText = await res.text()
          alert("Image upload failed: " + errText)
          return
        }
      }

      if (selectedCategory) {
        await updateCategory(selectedCategory.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          parentId: actualParentId,
          level,
          status: formData.status,
          image: finalImageUrl || null,
        })
      } else {
        await addCategory({
          name: formData.name.trim(),
          description: formData.description.trim(),
          parentId: actualParentId,
          level,
          status: formData.status,
          sortOrder: 0,
          image: finalImageUrl || null,
        })
      }
      setDialogOpen(false)
    } catch (error) {
      console.error("Failed to save category:", error)
    } finally {
      setIsSaving(false)
      setIsUploading(false)
    }
  }

  const getParentOptions = () => {
    const options: { id: string; name: string; level: number }[] = []

    // Add root option - use "none" instead of empty string
    options.push({ id: "none", name: "None (Root Category)", level: -1 })

    // Add all categories up to level 1 (so children can be at level 2 max)
    categories
      .filter((cat) => cat.level < 2 && cat.status === "active")
      .forEach((cat) => {
        options.push({
          id: cat.id,
          name: getFullCategoryName(cat.id),
          level: cat.level,
        })
      })

    return options
  }

  const renderCategoryTree = (parentId: string | null, depth: number = 0) => {
    const childCategories = categories.filter((cat) => cat.parentId === parentId)

    if (childCategories.length === 0) return null

    return childCategories.map((category) => {
      const hasChildren = categories.some((cat) => cat.parentId === category.id)
      const isExpanded = expandedCategories.has(category.id)

      return (
        <div key={category.id}>
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 hover:bg-secondary/50 transition-colors",
              depth > 0 && "ml-6"
            )}
            style={{ marginLeft: depth * 24 }}
          >
            <button
              type="button"
              onClick={() => toggleExpand(category.id)}
              className="flex h-6 w-6 items-center justify-center rounded hover:bg-secondary"
              disabled={!hasChildren}
            >
              {hasChildren ? (
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isExpanded && "rotate-90"
                  )}
                />
              ) : (
                <span className="w-4" />
              )}
            </button>

            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-primary" />
              ) : (
                <Folder className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <Package className="h-4 w-4 text-muted-foreground" />
            )}

            {category.image && (
              <div className="h-6 w-6 rounded overflow-hidden flex-shrink-0 bg-secondary border">
                <img src={normalizeImageUrl(category.image)} alt="" className="h-full w-full object-cover" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{category.name}</p>
              {category.description && (
                <p className="text-xs text-muted-foreground truncate">{category.description}</p>
              )}
            </div>

            <Badge variant="outline" className="text-xs">
              {category.productCount} products
            </Badge>

            <Badge
              className={cn(
                "text-xs",
                category.status === "active"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-gray-500/20 text-gray-400"
              )}
            >
              {category.status}
            </Badge>

            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {category.level < 2 && (
                    <DropdownMenuItem onClick={() => handleAddCategory(category.id)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Subcategory
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicateCategory(category)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDeleteClick(category)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isExpanded && renderCategoryTree(category.id, depth + 1)}
        </div>
      )
    })
  }

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 0:
        return "Category"
      case 1:
        return "Sub-category"
      case 2:
        return "Child"
      default:
        return "Unknown"
    }
  }

  const getLevelBadgeColor = (level: number) => {
    switch (level) {
      case 0:
        return "bg-blue-500/20 text-blue-400"
      case 1:
        return "bg-purple-500/20 text-purple-400"
      case 2:
        return "bg-orange-500/20 text-orange-400"
      default:
        return "bg-gray-500/20 text-gray-400"
    }
  }

  return (
    <DashboardLayout
      title="Categories"
      description="Organize your products with categories, sub-categories, and child categories."
      requiredPermission="view_products"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
                  <Folder className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Root Categories</p>
                  <p className="text-2xl font-bold">
                    {categories.filter((c) => c.level === 0).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                  <FolderTree className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sub-categories</p>
                  <p className="text-2xl font-bold">
                    {categories.filter((c) => c.level === 1).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/20">
                  <Package className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Child Categories</p>
                  <p className="text-2xl font-bold">
                    {categories.filter((c) => c.level === 2).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/20">
                  <Eye className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">
                    {categories.filter((c) => c.status === "active").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Category Management</CardTitle>
                <CardDescription>Create and organize your product categories</CardDescription>
              </div>
              {canManage && (
                <Button className="gap-2" onClick={() => handleAddCategory()}>
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <TabsList className="bg-secondary">
                  <TabsTrigger value="tree">Tree View</TabsTrigger>
                  <TabsTrigger value="list">List View</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-secondary w-64"
                    />
                  </div>
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-40 bg-secondary">
                      <SelectValue placeholder="Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="0">Categories</SelectItem>
                      <SelectItem value="1">Sub-categories</SelectItem>
                      <SelectItem value="2">Child Categories</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32 bg-secondary">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="tree" className="mt-0">
                <div className="rounded-lg border bg-card">
                  {rootCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">No categories yet</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create your first category to organize products
                      </p>
                      {canManage && (
                        <Button onClick={() => handleAddCategory()}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Category
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 space-y-1">
                      {renderCategoryTree(null)}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="list" className="mt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <p className="text-muted-foreground">No categories found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCategories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {category.image ? (
                                <div className="h-10 w-10 flex-shrink-0 rounded-md overflow-hidden bg-secondary border">
                                  <img src={normalizeImageUrl(category.image)} alt={category.name} className="h-full w-full object-cover" />
                                </div>
                              ) : (
                                <div className="h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-md bg-secondary border">
                                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{category.name}</p>
                                {category.description && (
                                  <p className="text-xs text-muted-foreground truncate max-w-xs md:max-w-[200px]">
                                    {category.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getLevelBadgeColor(category.level)}>
                              {getLevelLabel(category.level)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {category.parentId ? (
                              <span className="text-sm">
                                {getFullCategoryName(category.parentId)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{category.productCount}</TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                category.status === "active"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-gray-500/20 text-gray-400"
                              )}
                            >
                              {category.status}
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
                                  {category.level < 2 && (
                                    <DropdownMenuItem onClick={() => handleAddCategory(category.id)}>
                                      <Plus className="mr-2 h-4 w-4" />
                                      Add Subcategory
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicateCategory(category)}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteClick(category)}
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Category Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory
                ? "Update the category details below."
                : "Create a new category to organize your products."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Living Room"
                className="bg-secondary"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="parent">Parent Category</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) => setFormData({ ...formData, parentId: value })}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  {getParentOptions().map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      <span className="flex items-center">
                        {option.level >= 0 && (
                          <span className="text-muted-foreground mr-2">
                            {"--".repeat(option.level + 1)}
                          </span>
                        )}
                        {option.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select &quot;None&quot; to create a root category. Max depth: 3 levels.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this category..."
                className="bg-secondary resize-none"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label>Category Image</Label>
              {(formData.image || imageFile) ? (
                <div className="space-y-4">
                  <div className="relative group aspect-video rounded-md overflow-hidden bg-secondary border w-48">
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : formData.image}
                      alt="Category preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, image: '' }))
                        setImageFile(null)
                      }}
                      className="absolute top-1 right-1 bg-black/50 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="category-image-upload"
                    className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors border-muted-foreground/25 bg-secondary"
                  >
                    <div className="flex flex-col items-center justify-center pt-4 pb-4">
                      <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
                      <p className="mb-1 text-xs text-muted-foreground"><span className="font-semibold">Click to upload</span> image</p>
                    </div>
                  </label>
                  <input
                    id="category-image-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageFileChange}
                  />
                </div>
              )}
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
            <Button onClick={handleSave} disabled={!formData.name.trim() || isSaving || isUploading}>
              {isUploading || isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading ? "Uploading..." : "Saving..."}
                </>
              ) : (
                selectedCategory ? "Save Changes" : "Add Category"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        description={`Are you sure you want to delete "${categoryToDelete?.name}"? ${categories.some((c) => c.parentId === categoryToDelete?.id)
          ? "This will also delete all subcategories."
          : ""
          } This action cannot be undone.`}
      />
    </DashboardLayout>
  )
}
