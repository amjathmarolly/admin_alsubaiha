"use client"

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react"

export interface Product {
  id: string
  sku: string | null
  slug: string | null
  name: string
  description: string | null
  price: number
  compare_price: number | null
  cost_price: number | null
  category_id: string | null
  category_name: string | null
  category_path: string | null
  barcode: string | null
  stock: number
  reserved_stock: number
  available_stock: number
  low_stock_threshold: number
  status: "active" | "draft" | "archived"
  featured: boolean
  image: string | null
  images: string[]
  weight: number | null
  dimensions: Record<string, unknown> | null
  tags: string[]
  attributes: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

interface ProductsResponse {
  data: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface ProductsContextType {
  products: Product[]
  isLoading: boolean
  error: string | null
  pagination: ProductsResponse["pagination"] | null
  addProduct: (product: {
    sku?: string
    name: string
    description?: string
    price: number
    comparePrice?: number
    costPrice?: number
    categoryId?: string
    stock?: number
    reservedStock?: number
    lowStockThreshold?: number
    status?: string
    featured?: boolean
    image?: string
    images?: string[]
    barcode?: string
    weight?: number
    dimensions?: Record<string, unknown>
    tags?: string[]
    attributes?: Record<string, unknown>
  }) => Promise<Product>
  updateProduct: (id: string, data: Partial<{
    name: string
    slug: string
    description: string
    price: number
    comparePrice: number
    costPrice: number
    categoryId: string
    stock: number
    reservedStock: number
    lowStockThreshold: number
    status: string
    featured: boolean
    image: string
    images: string[]
    barcode: string
    weight: number
    dimensions: Record<string, unknown>
    tags: string[]
    attributes: Record<string, unknown>
  }>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  refreshProducts: () => Promise<void>
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined)

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<ProductsResponse["pagination"] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch("/api/products?limit=100")
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(errorData.error || "Failed to fetch products")
        setProducts([])
        setPagination(null)
        return
      }
      const data: ProductsResponse = await res.json()
      setProducts(data.data || [])
      setPagination(data.pagination || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch products")
      setProducts([])
      setPagination(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const addProduct = useCallback(async (productData: {
    sku?: string
    name: string
    description?: string
    price: number
    comparePrice?: number
    costPrice?: number
    categoryId?: string
    stock?: number
    reservedStock?: number
    lowStockThreshold?: number
    status?: string
    featured?: boolean
    image?: string
    images?: string[]
    barcode?: string
    weight?: number
    dimensions?: Record<string, unknown>
    tags?: string[]
    attributes?: Record<string, unknown>
  }) => {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    })
    if (!res.ok) throw new Error("Failed to create product")
    const newProduct = await res.json()
    await fetchProducts()
    return newProduct
  }, [fetchProducts])

  const updateProduct = useCallback(async (id: string, data: Partial<{
    name: string
    slug: string
    description: string
    price: number
    comparePrice: number
    costPrice: number
    categoryId: string
    stock: number
    reservedStock: number
    lowStockThreshold: number
    status: string
    featured: boolean
    image: string
    images: string[]
    barcode: string
    weight: number
    dimensions: Record<string, unknown>
    tags: string[]
    attributes: Record<string, unknown>
  }>) => {
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Failed to update product")
    await fetchProducts()
  }, [fetchProducts])

  const deleteProduct = useCallback(async (id: string) => {
    const res = await fetch(`/api/products/${id}`, {
      method: "DELETE",
    })
    if (!res.ok) throw new Error("Failed to delete product")
    await fetchProducts()
  }, [fetchProducts])

  return (
    <ProductsContext.Provider
      value={{
        products,
        isLoading,
        error,
        pagination,
        addProduct,
        updateProduct,
        deleteProduct,
        refreshProducts: fetchProducts,
      }}
    >
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  const context = useContext(ProductsContext)
  if (!context) {
    throw new Error("useProducts must be used within a ProductsProvider")
  }
  return context
}
