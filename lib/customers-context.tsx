"use client"

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react"

export interface MembershipTier {
  id: string
  name: string
  tier_level: number
  min_purchase: number
  max_purchase: number | null
  discount_percentage: number
  color: string
  icon: string | null
  status: string
}

export interface Customer {
  id: string
  email: string
  name: string
  phone: string | null
  avatar: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string
  status: "active" | "inactive" | "blocked"
  total_orders: number
  total_spent: number
  notes: string | null
  tags: string[]
  membership_tier_id: string | null
  membership_tier: MembershipTier | null
  created_at: string
  updated_at: string
}

interface CustomersResponse {
  data: Customer[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface CustomersContextType {
  customers: Customer[]
  isLoading: boolean
  error: string | null
  pagination: CustomersResponse["pagination"] | null
  addCustomer: (customer: {
    email: string
    name: string
    phone?: string
    avatar?: string
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    status?: string
    notes?: string
    tags?: string[]
  }) => Promise<Customer>
  updateCustomer: (id: string, data: Partial<{
    name: string
    phone: string
    avatar: string
    addressLine1: string
    addressLine2: string
    city: string
    state: string
    postalCode: string
    country: string
    status: string
    notes: string
    tags: string[]
  }>) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
  refreshCustomers: () => Promise<void>
}

const CustomersContext = createContext<CustomersContextType | undefined>(undefined)

export function CustomersProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [pagination, setPagination] = useState<CustomersResponse["pagination"] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch("/api/customers?limit=100")
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        setError(errorData.error || "Failed to fetch customers")
        setCustomers([])
        setPagination(null)
        return
      }
      const data: CustomersResponse = await res.json()
      setCustomers(data.data || [])
      setPagination(data.pagination || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch customers")
      setCustomers([])
      setPagination(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const addCustomer = useCallback(async (customerData: {
    email: string
    name: string
    phone?: string
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    status?: string
    notes?: string
    tags?: string[]
  }) => {
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customerData),
    })
    if (!res.ok) throw new Error("Failed to create customer")
    const newCustomer = await res.json()
    await fetchCustomers()
    return newCustomer
  }, [fetchCustomers])

  const updateCustomer = useCallback(async (id: string, data: Partial<{
    name: string
    phone: string
    addressLine1: string
    addressLine2: string
    city: string
    state: string
    postalCode: string
    country: string
    status: string
    notes: string
    tags: string[]
  }>) => {
    const res = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error("Failed to update customer")
    await fetchCustomers()
  }, [fetchCustomers])

  const deleteCustomer = useCallback(async (id: string) => {
    const res = await fetch(`/api/customers/${id}`, {
      method: "DELETE",
    })
    if (!res.ok) throw new Error("Failed to delete customer")
    await fetchCustomers()
  }, [fetchCustomers])

  return (
    <CustomersContext.Provider
      value={{
        customers,
        isLoading,
        error,
        pagination,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        refreshCustomers: fetchCustomers,
      }}
    >
      {children}
    </CustomersContext.Provider>
  )
}

export function useCustomers() {
  const context = useContext(CustomersContext)
  if (!context) {
    throw new Error("useCustomers must be used within a CustomersProvider")
  }
  return context
}
