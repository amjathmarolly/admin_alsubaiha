// API Client for Furnish Dashboard
// Provides typed methods for all API endpoints

const API_BASE = "/api"

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// ============================================
// PRODUCTS API
// ============================================
export interface Product {
  id: string
  sku: string | null
  name: string
  description: string | null
  price: number
  compare_price: number | null
  cost: number | null
  category_id: string | null
  category_name: string | null
  designer_id?: string | null
  designer_name?: string | null
  barcode: string | null
  stock: number
  low_stock_threshold: number
  status: "active" | "draft" | "archived"
  image: string | null
  images: string[]
  weight: number | null
  dimensions: Record<string, unknown> | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ProductFilters extends PaginationParams {
  search?: string
  category?: string
  designerId?: string
  status?: string
  minPrice?: number
  maxPrice?: number
}

export interface ProductCreateInput {
  sku?: string
  name: string
  description?: string | null
  price: number
  comparePrice?: number | null
  cost?: number | null
  categoryId?: string | null
  designerId?: string | null
  stock?: number
  lowStockThreshold?: number
  status?: "active" | "draft" | "archived"
  image?: string
  images?: string[]
  barcode?: string
  weight?: number
  dimensions?: Record<string, unknown>
  tags?: string[]
}

export interface ProductUpdateInput {
  name?: string
  description?: string | null
  price?: number
  comparePrice?: number | null
  cost?: number | null
  categoryId?: string | null
  designerId?: string | null
  stock?: number
  lowStockThreshold?: number
  status?: "active" | "draft" | "archived"
  image?: string
  images?: string[]
  barcode?: string
  weight?: number
  dimensions?: Record<string, unknown>
  tags?: string[]
}

export const productsAPI = {
  list: (params?: ProductFilters) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          searchParams.set(key, String(value))
        }
      })
    }
    const query = searchParams.toString()
    return fetchAPI<PaginatedResponse<Product>>(`/products${query ? `?${query}` : ""}`)
  },

  get: (id: string) => fetchAPI<Product>(`/products/${id}`),

  create: (data: ProductCreateInput) =>
    fetchAPI<Product>("/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: ProductUpdateInput) =>
    fetchAPI<Product>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/products/${id}`, {
      method: "DELETE",
    }),

  bulkCreate: (products: any[]) =>
    fetchAPI<{ success: boolean; imported: number; skipped: number; errors?: string[] }>("/products/bulk", {
      method: "POST",
      body: JSON.stringify({ products }),
    }),
}

// ============================================
// CATEGORIES API
// ============================================
export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  parent_name: string | null
  level: number
  status: "active" | "inactive"
  product_count: number
  child_count: number
  children?: Category[]
  created_at: string
  updated_at: string
}

export interface CategoryFilters extends PaginationParams {
  search?: string
  parentId?: string | null
  level?: number
  status?: string
  flat?: boolean
}

export const categoriesAPI = {
  list: (params?: CategoryFilters) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          searchParams.set(key, String(value))
        }
      })
    }
    const query = searchParams.toString()
    return fetchAPI<PaginatedResponse<Category>>(`/categories${query ? `?${query}` : ""}`)
  },

  get: (id: string) => fetchAPI<Category & { path: string; children: Category[] }>(`/categories/${id}`),

  create: (data: Partial<Category>) =>
    fetchAPI<Category>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Category>) =>
    fetchAPI<Category>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean; deletedCount: number }>(`/categories/${id}`, {
      method: "DELETE",
    }),
}

// ============================================
// ORDERS API
// ============================================
export interface Order {
  id: string
  order_number: string
  customer_id: string | null
  customer_email: string | null
  customer_name: string | null
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded"
  payment_status: "pending" | "paid" | "failed" | "refunded"
  payment_method: string | null
  subtotal: number
  discount_amount: number
  shipping_amount: number
  tax_amount: number
  total: number
  discount_id: string | null
  shipping_address: Address | null
  billing_address: Address | null
  notes: string | null
  items_count: number
  items?: OrderItem[]
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  sku: string | null
  product_name: string
  quantity: number
  unit_price: number
  total: number
}

export interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

export interface OrderFilters extends PaginationParams {
  search?: string
  status?: string
  paymentStatus?: string
  customerId?: string
  startDate?: string
  endDate?: string
}

export const ordersAPI = {
  list: (params?: OrderFilters) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          searchParams.set(key, String(value))
        }
      })
    }
    const query = searchParams.toString()
    return fetchAPI<PaginatedResponse<Order>>(`/orders${query ? `?${query}` : ""}`)
  },

  get: (id: string) => fetchAPI<Order & { items: OrderItem[] }>(`/orders/${id}`),

  create: (data: {
    customerId?: string
    items: Array<{ productId?: string; sku?: string; name: string; quantity: number; unitPrice: number }>
    discountId?: string
    shippingAmount?: number
    taxAmount?: number
    shippingAddress?: Address
    billingAddress?: Address
    notes?: string
    paymentMethod?: string
  }) =>
    fetchAPI<Order>("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Order>) =>
    fetchAPI<Order>(`/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/orders/${id}`, {
      method: "DELETE",
    }),
}

// ============================================
// CUSTOMERS API
// ============================================
export interface Customer {
  id: string
  email: string
  name: string
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string
  status: "active" | "inactive"
  total_orders: number
  total_spent: number
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface CustomerFilters extends PaginationParams {
  search?: string
  status?: string
  minSpent?: number
  maxSpent?: number
}

export const customersAPI = {
  list: (params?: CustomerFilters) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          searchParams.set(key, String(value))
        }
      })
    }
    const query = searchParams.toString()
    return fetchAPI<PaginatedResponse<Customer>>(`/customers${query ? `?${query}` : ""}`)
  },

  get: (id: string) => fetchAPI<Customer & { recentOrders: Order[] }>(`/customers/${id}`),

  create: (data: Partial<Customer>) =>
    fetchAPI<Customer>("/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Customer>) =>
    fetchAPI<Customer>(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/customers/${id}`, {
      method: "DELETE",
    }),
}

// ============================================
// INVENTORY API
// ============================================
export interface InventoryItem {
  product_id: string
  product_name: string
  product_sku: string | null
  category_name: string | null
  stock: number
  low_stock_threshold: number
  available: number
  status: "in_stock" | "low_stock" | "out_of_stock"
  updated_at: string
}

export interface InventoryFilters extends PaginationParams {
  search?: string
  status?: string
  category?: string
}

export const inventoryAPI = {
  list: (params?: InventoryFilters) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          searchParams.set(key, String(value))
        }
      })
    }
    const query = searchParams.toString()
    return fetchAPI<PaginatedResponse<InventoryItem>>(`/inventory${query ? `?${query}` : ""}`)
  },

  adjust: (data: {
    productId: string
    adjustment: number
    type: "adjustment" | "restock" | "sale" | "return" | "transfer" | "count"
    reason?: string
    userId?: string
  }) =>
    fetchAPI<{
      productId: string
      quantityBefore: number
      quantityAfter: number
      adjustment: number
      type: string
    }>("/inventory", {
      method: "POST",
      body: JSON.stringify(data),
    }),
}

// ============================================
// SHIPPING API
// ============================================
export interface Shipment {
  id: string
  order_id: string
  carrier: string | null
  tracking_number: string | null
  status: "pending" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "failed"
  estimated_delivery: string | null
  actual_delivery: string | null
  weight: number | null
  dimensions: { length: number; width: number; height: number } | null
  shipping_cost: number | null
  label_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ShipmentFilters extends PaginationParams {
  search?: string
  status?: string
  carrier?: string
}

export const shippingAPI = {
  list: (params?: ShipmentFilters) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          searchParams.set(key, String(value))
        }
      })
    }
    const query = searchParams.toString()
    return fetchAPI<PaginatedResponse<Shipment>>(`/shipping${query ? `?${query}` : ""}`)
  },

  get: (id: string) => fetchAPI<Shipment>(`/shipping/${id}`),

  create: (data: Partial<Shipment> & { orderId: string }) =>
    fetchAPI<Shipment>("/shipping", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Shipment>) =>
    fetchAPI<Shipment>(`/shipping/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/shipping/${id}`, {
      method: "DELETE",
    }),
}

// ============================================
// DISCOUNTS API
// ============================================
export interface Discount {
  id: string
  code: string
  description: string | null
  type: "percentage" | "fixed" | "shipping"
  value: number
  min_purchase: number
  max_uses: number | null
  used_count: number
  status: "active" | "inactive" | "expired"
  starts_at: string | null
  expires_at: string | null
  applies_to: string[] | null
  created_at: string
  updated_at: string
}

export interface DiscountFilters extends PaginationParams {
  search?: string
  status?: string
  type?: string
}

export const discountsAPI = {
  list: (params?: DiscountFilters) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          searchParams.set(key, String(value))
        }
      })
    }
    const query = searchParams.toString()
    return fetchAPI<PaginatedResponse<Discount>>(`/discounts${query ? `?${query}` : ""}`)
  },

  get: (id: string) => fetchAPI<Discount & { usageStats: { total_uses: number; total_savings: number; unique_customers: number } }>(`/discounts/${id}`),

  create: (data: Partial<Discount>) =>
    fetchAPI<Discount>("/discounts", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Discount>) =>
    fetchAPI<Discount>(`/discounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/discounts/${id}`, {
      method: "DELETE",
    }),

  validate: (code: string, orderTotal: number) =>
    fetchAPI<{ valid: boolean; discount: Discount | null; discountAmount: number }>(`/discounts/${code}?validate=true&orderTotal=${orderTotal}`),
}

// ============================================
// AUTH API
// ============================================
export interface User {
  id: string
  email: string
  name: string
  avatar: string | null
  role: string
  roleId: string | null
}

export interface AuthResponse {
  user: User
  permissions: string[]
}

export const authAPI = {
  login: (email: string, password: string) =>
    fetchAPI<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    fetchAPI<{ success: boolean }>("/auth/logout", {
      method: "POST",
    }),

  me: () => fetchAPI<AuthResponse>("/auth/me"),
}

// ============================================
// ROLES API
// ============================================
export interface Role {
  id: string
  name: string
  description: string | null
  color: string
  is_system: boolean
  permissions: string[]
  member_count: number
  created_at: string
  updated_at: string
}

export const rolesAPI = {
  list: () => fetchAPI<{ data: Role[] }>("/roles"),

  get: (id: string) => fetchAPI<Role & { members: Array<{ id: string; name: string; email: string; avatar: string | null }> }>(`/roles/${id}`),

  create: (data: { name: string; description?: string; color?: string; permissions?: string[] }) =>
    fetchAPI<Role>("/roles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Role>) =>
    fetchAPI<Role>(`/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/roles/${id}`, {
      method: "DELETE",
    }),
}

// ============================================
// TEAM API
// ============================================
export interface TeamMember {
  id: string
  user_id: string | null
  name: string
  email: string
  role_id: string | null
  role_name: string | null
  status: "active" | "invited" | "inactive"
  invited_by: string | null
  invited_at: string
  joined_at: string | null
  last_active: string | null
}

export const teamAPI = {
  list: () => fetchAPI<{ data: TeamMember[] }>("/team"),

  get: (id: string) => fetchAPI<TeamMember>(`/team/${id}`),

  invite: (data: { name: string; email: string; roleId?: string; invitedBy?: string }) =>
    fetchAPI<TeamMember>("/team", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; roleId?: string; status?: string }) =>
    fetchAPI<TeamMember>(`/team/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    fetchAPI<{ success: boolean }>(`/team/${id}`, {
      method: "DELETE",
    }),
}

// ============================================
// ANALYTICS API (Dashboard Stats)
// ============================================
export const analyticsAPI = {
  getDashboardStats: () =>
    fetchAPI<{
      totalRevenue: number
      revenueChange: number
      totalOrders: number
      ordersChange: number
      totalCustomers: number
      customersChange: number
      averageOrderValue: number
      aovChange: number
    }>("/analytics/dashboard"),

  getRevenueChart: (period: "7d" | "30d" | "90d" | "1y") =>
    fetchAPI<Array<{ date: string; revenue: number; orders: number }>>(`/analytics/revenue?period=${period}`),

  getTopProducts: (limit?: number) =>
    fetchAPI<Array<{ id: string; name: string; revenue: number; quantity: number }>>(`/analytics/top-products?limit=${limit || 10}`),

  getCategoryBreakdown: () =>
    fetchAPI<Array<{ category: string; revenue: number; percentage: number }>>("/analytics/categories"),
}

// ============================================
// BLOGS API
// ============================================
export interface Blog {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  category: string | null
  author: string | null
  image: string | null
  video_url: string | null
  gallery_images?: string[] | null
  schema_data?: string | null
  status: "active" | "draft" | "archived"
  created_at: string
  updated_at: string
}

export interface BlogFilters extends PaginationParams {
  search?: string
  status?: string
}

export const blogsAPI = {
  list: (params?: BlogFilters) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          searchParams.set(key, String(value))
        }
      })
    }
    const query = searchParams.toString()
    return fetchAPI<PaginatedResponse<Blog>>(`/blogs${query ? `?${query}` : ""}`)
  },

  get: (id: string) => fetchAPI<Blog>(`/blogs/${id}`),

  create: (data: Partial<Blog>) =>
    fetchAPI<Blog>("/blogs", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Blog>) =>
    fetchAPI<Blog>(`/blogs/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchAPI<{ success: boolean }>(`/blogs/${id}`, {
      method: "DELETE",
    }),
}
