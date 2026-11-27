"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, MoreHorizontal, Filter, Pencil, Trash2, Eye, ChevronRight, Loader2, Sparkles, UploadCloud, ImageIcon, Ruler } from "lucide-react"
import { ProductOptionsDialog } from "@/components/dashboard/product-options-dialog"
import { ProductDialog, type Product } from "@/components/dashboard/product-dialog"
import { GenerateDescriptionDialog } from "@/components/dashboard/generate-description-dialog"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { ExportDialog } from "@/components/dashboard/export-dialog"
import { BulkImportDialog } from "@/components/dashboard/bulk-import-dialog"
import { useCategories } from "@/lib/categories-context"
import { productsAPI, type Product as APIProduct } from "@/lib/api-client"
import { useCurrency } from "@/lib/currency-context"
import { normalizeImageUrl } from "@/lib/utils"

const productExportFields = [
  { key: "id", label: "Product ID", default: true },
  { key: "name", label: "Product Name", default: true },
  { key: "category", label: "Category", default: true },
  { key: "price", label: "Price", default: true },
  { key: "stock", label: "Stock", default: true },
  { key: "status", label: "Status", default: true },
]

function getStatus(stock: number): string {
  if (stock === 0) return "Out of Stock"
  if (stock <= 5) return "Low Stock"
  return "In Stock"
}

function transformProduct(apiProduct: APIProduct): Product {
  return {
    id: apiProduct.id,
    name: apiProduct.name,
    category: apiProduct.category_name || "",
    categoryId: apiProduct.category_id || undefined,
    designerId: apiProduct.designer_id || undefined,
    price: apiProduct.price,
    stock: apiProduct.stock,
    status: getStatus(apiProduct.stock),
    description: apiProduct.description || undefined,
    image: apiProduct.image || apiProduct.images?.[0] || "/placeholder.svg",
    images: apiProduct.images || (apiProduct.image ? [apiProduct.image] : []),
  }
}

export default function ProductsPage() {
  const { hasPermission } = useAuth()
  const { categories, getFullCategoryName, getRootCategories, refreshCategories } = useCategories()
  const { formatPrice } = useCurrency()
  const canManage = hasPermission("manage_products")
  const canExport = hasPermission("export_data")

  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [optionsProduct, setOptionsProduct] = useState<Product | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await productsAPI.list({
        search: searchQuery || undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        limit: 1000,
      })
      setProducts(response.data.map(transformProduct))
    } catch (error) {
      console.error("Failed to fetch products:", error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, categoryFilter])

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchProducts()
    }, 300)
    return () => clearTimeout(debounce)
  }, [fetchProducts])

  const handleAddProduct = () => {
    setSelectedProduct(null)
    setDialogOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setDialogOpen(true)
  }

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (productToDelete) {
      try {
        await productsAPI.delete(productToDelete.id)
        await fetchProducts()
        await refreshCategories()
      } catch (error) {
        console.error("Failed to delete product:", error)
      }
      setProductToDelete(null)
    }
    setDeleteDialogOpen(false)
  }

  const handleSaveProduct = async (productData: Omit<Product, "id" | "status" | "image"> & { id?: string; categoryId?: string; designerId?: string; images?: string[]; image?: string }) => {
    try {
      if (productData.id) {
        await productsAPI.update(productData.id, {
          name: productData.name,
          price: productData.price,
          stock: productData.stock,
          categoryId: productData.categoryId || null,
          designerId: productData.designerId || null,
          description: productData.description || null,
          images: productData.images,
          image: productData.image,
        })
      } else {
        await productsAPI.create({
          sku: `SKU-${Date.now()}`,
          name: productData.name,
          price: productData.price,
          stock: productData.stock,
          categoryId: productData.categoryId || null,
          designerId: productData.designerId || null,
          description: productData.description || null,
          status: "active",
          images: productData.images,
          image: productData.image,
        })
      }
      await fetchProducts()
      await refreshCategories()
    } catch (error) {
      console.error("Failed to save product:", error)
    }
  }

  return (
    <DashboardLayout
      title="Products"
      description="Manage your furniture inventory and product catalog."
      requiredPermission="view_products"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 bg-secondary">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getRootCategories().map((rootCat) => (
                  <SelectItem key={rootCat.id} value={rootCat.id}>
                    {rootCat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 shrink-0 hidden sm:flex"
              onClick={() => setGenerateDialogOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              Generate Render Description
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="sm:hidden"
              onClick={() => setGenerateDialogOpen(true)}
              title="Generate Render Description"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            {canExport && (
              <ExportDialog
                title="Products"
                data={products as unknown as Record<string, unknown>[]}
                fields={productExportFields}
                filename="products"
              />
            )}
            {canManage && (
              <>
                <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
                  <UploadCloud className="h-4 w-4" />
                  Import
                </Button>
                <Button className="gap-2" onClick={handleAddProduct}>
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              </>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product Catalog ({products.length} products)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <div className="h-10 w-10 rounded-lg overflow-hidden border bg-secondary shrink-0">
                              <img
                                src={normalizeImageUrl(product.image)}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                              <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href="/categories"
                          className="hover:text-primary hover:underline flex items-center gap-1 text-sm"
                        >
                          {product.categoryId ? (
                            getFullCategoryName(product.categoryId).split(" > ").map((part, idx, arr) => (
                              <span key={`${product.id}-${part}-${idx}`} className="flex items-center">
                                <span className={idx === arr.length - 1 ? "font-medium" : "text-muted-foreground text-xs"}>
                                  {part}
                                </span>
                                {idx < arr.length - 1 && (
                                  <ChevronRight className="h-3 w-3 mx-0.5 text-muted-foreground" />
                                )}
                              </span>
                            ))
                          ) : (
                            product.category || "Uncategorized"
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>{formatPrice(product.price)}</TableCell>
                      <TableCell>{product.stock} units</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            product.status === "In Stock"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : product.status === "Low Stock"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400"
                          }
                        >
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2">
                              <Eye className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuItem className="gap-2" onClick={() => handleEditProduct(product)}>
                                  <Pencil className="h-4 w-4" />
                                  Edit Product
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2" onClick={() => setOptionsProduct(product)}>
                                  <Ruler className="h-4 w-4" />
                                  Sizes & Materials
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2 text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteClick(product)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {products.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No products found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <GenerateDescriptionDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
      />

      <BulkImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => {
          fetchProducts()
          refreshCategories()
        }}
      />

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
        onSave={handleSaveProduct}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        description={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
      />
      <ProductOptionsDialog product={optionsProduct} onOpenChange={(o) => !o && setOptionsProduct(null)} />
    </DashboardLayout>
  )
}
