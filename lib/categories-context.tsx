"use client"

import * as React from "react"

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  parentId: string | null
  level: number
  sortOrder: number
  image: string | null
  productCount: number
  status: "active" | "inactive"
  createdAt: string
  updatedAt: string
}

interface CategoriesContextType {
  categories: Category[]
  isLoading: boolean
  error: string | null
  refreshCategories: () => Promise<void>
  addCategory: (category: Omit<Category, "id" | "createdAt" | "updatedAt" | "slug" | "productCount">) => Promise<void>
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  getCategoryById: (id: string) => Category | undefined
  getCategoryPath: (id: string) => Category[]

  getChildCategories: (parentId: string | null) => Category[]
  getRootCategories: () => Category[]
  getSubCategories: (parentId: string) => Category[]
  getFullCategoryName: (id: string) => string
}

const CategoriesContext = React.createContext<CategoriesContextType | undefined>(undefined)

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = React.useState<Category[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refreshCategories = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch("/api/categories?flat=true&limit=1000")
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(errorData.error || "Failed to fetch categories")
        setCategories([])
        return
      }
      const response = await res.json()
      const transformedCategories = (response.data || []).map((apiCat: {
        id: string
        name: string
        slug: string
        description?: string
        parent_id: string | null
        level: number
        sort_order: number
        image: string | null
        product_count: number
        status: "active" | "inactive"
        created_at: string
        updated_at: string
      }): Category => ({
        id: apiCat.id,
        name: apiCat.name,
        slug: apiCat.slug,
        description: apiCat.description || undefined,
        parentId: apiCat.parent_id,
        level: apiCat.level,
        sortOrder: apiCat.sort_order,
        image: apiCat.image,
        productCount: apiCat.product_count,
        status: apiCat.status,
        createdAt: apiCat.created_at,
        updatedAt: apiCat.updated_at,
      }))
      setCategories(transformedCategories)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch categories")
      setCategories([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    refreshCategories()
  }, [refreshCategories])

  const addCategory = async (category: Omit<Category, "id" | "createdAt" | "updatedAt" | "slug" | "productCount">) => {
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: category.name,
          description: category.description,
          parentId: category.parentId,
          sortOrder: category.sortOrder,
          image: category.image,
          status: category.status,
        }),
      })
      if (!res.ok) throw new Error("Failed to add category")
      await refreshCategories()
    } catch (err) {
      console.error("Failed to add category:", err)
      throw err
    }
  }

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: updates.name,
          description: updates.description,
          parentId: updates.parentId,
          sortOrder: updates.sortOrder,
          image: updates.image,
          status: updates.status,
        }),
      })
      if (!res.ok) throw new Error("Failed to update category")
      await refreshCategories()
    } catch (err) {
      console.error("Failed to update category:", err)
      throw err
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete category")
      await refreshCategories()
    } catch (err) {
      console.error("Failed to delete category:", err)
      throw err
    }
  }

  const getCategoryById = (id: string) => {
    return categories.find((cat) => cat.id === id)
  }

  const getCategoryPath = (id: string): Category[] => {
    const path: Category[] = []
    let current = getCategoryById(id)

    while (current) {
      path.unshift(current)
      current = current.parentId ? getCategoryById(current.parentId) : undefined
    }

    return path
  }

  const getChildCategories = (parentId: string | null) => {
    return categories.filter((cat) => cat.parentId === parentId)
  }

  const getRootCategories = () => {
    return categories.filter((cat) => cat.parentId === null)
  }

  const getSubCategories = (parentId: string) => {
    return categories.filter((cat) => cat.parentId === parentId)
  }

  const getFullCategoryName = (id: string): string => {
    const path = getCategoryPath(id)
    return path.map((cat) => cat.name).join(" > ")
  }

  return (
    <CategoriesContext.Provider
      value={{
        categories,
        isLoading,
        error,
        refreshCategories,
        addCategory,
        updateCategory,
        deleteCategory,
        getCategoryById,
        getCategoryPath,
        getChildCategories,
        getRootCategories,
        getSubCategories,
        getFullCategoryName,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories() {
  const context = React.useContext(CategoriesContext)
  if (context === undefined) {
    throw new Error("useCategories must be used within a CategoriesProvider")
  }
  return context
}
