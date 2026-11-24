"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"

export type UserRole = "admin" | "manager" | "staff" | "viewer" | string

/** Cosmetic only (role comes from localStorage): the server enforces admin-only routes itself. */
export const isAdminRole = (role: string | undefined | null): boolean => /^admin/i.test(role ?? "")

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

export type Permission =
  | "view_dashboard"
  | "manage_products"
  | "view_products"
  | "manage_orders"
  | "view_orders"
  | "manage_customers"
  | "view_customers"
  | "manage_inventory"
  | "view_inventory"
  | "manage_shipping"
  | "view_shipping"
  | "manage_discounts"
  | "view_discounts"
  | "view_analytics"
  | "manage_settings"
  | "manage_roles"
  | "manage_team"
  | "export_data"
  | "view_our_work"
  | "manage_our_work"
  | "view_blogs"
  | "manage_blogs"
  | "view_atelier_live"
  | "manage_atelier_live"

export const ALL_PERMISSIONS: { key: Permission; label: string; category: string }[] = [
  { key: "view_dashboard", label: "View Dashboard", category: "Dashboard" },
  { key: "view_products", label: "View Products", category: "Products" },
  { key: "manage_products", label: "Manage Products", category: "Products" },
  { key: "view_orders", label: "View Orders", category: "Orders" },
  { key: "manage_orders", label: "Manage Orders", category: "Orders" },
  { key: "view_customers", label: "View Customers", category: "Customers" },
  { key: "manage_customers", label: "Manage Customers", category: "Customers" },
  { key: "view_inventory", label: "View Inventory", category: "Inventory" },
  { key: "manage_inventory", label: "Manage Inventory", category: "Inventory" },
  { key: "view_shipping", label: "View Shipping", category: "Shipping" },
  { key: "manage_shipping", label: "Manage Shipping", category: "Shipping" },
  { key: "view_discounts", label: "View Discounts", category: "Discounts" },
  { key: "manage_discounts", label: "Manage Discounts", category: "Discounts" },
  { key: "view_analytics", label: "View Analytics", category: "Analytics" },
  { key: "manage_settings", label: "Manage Settings", category: "Settings" },
  { key: "manage_roles", label: "Manage Roles", category: "Settings" },
  { key: "manage_team", label: "Manage Team", category: "Settings" },
  { key: "export_data", label: "Export Data", category: "Data" },
  { key: "view_our_work", label: "View Our Work", category: "Marketing" },
  { key: "manage_our_work", label: "Manage Our Work", category: "Marketing" },
  { key: "view_blogs", label: "View Blogs", category: "Marketing" },
  { key: "manage_blogs", label: "Manage Blogs", category: "Marketing" },
  { key: "view_atelier_live", label: "View Atelier Live", category: "Marketing" },
  { key: "manage_atelier_live", label: "Manage Atelier Live", category: "Marketing" },
]

export interface RoleDefinition {
  id: string
  name: string
  description: string
  permissions: Permission[]
  isSystem: boolean
  color: string
  createdAt: string
  memberCount?: number
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  roleId?: string
  status: "active" | "invited" | "inactive"
  avatar?: string
  lastActive?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  hasPermission: (permission: Permission) => boolean
  permissions: Permission[]
  roles: RoleDefinition[]
  teamMembers: TeamMember[]
  refreshRoles: () => Promise<void>
  refreshTeamMembers: () => Promise<void>
  addRole: (role: Omit<RoleDefinition, "id" | "createdAt" | "isSystem">) => Promise<void>
  updateRole: (id: string, role: Partial<RoleDefinition>) => Promise<void>
  deleteRole: (id: string) => Promise<void>
  addTeamMember: (member: Omit<TeamMember, "id">) => Promise<void>
  updateTeamMember: (id: string, member: Partial<TeamMember>) => Promise<void>
  removeTeamMember: (id: string) => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

// Demo users
const demoUsers: Record<string, { id: string; name: string; role: string; permissions: Permission[] }> = {
  "admin@alsubaiha.com": {
    id: "1",
    name: "Alsubaiha Admin",
    role: "admin",
    permissions: ALL_PERMISSIONS.map(p => p.key)
  },
  "manager@alsubaiha.com": {
    id: "2",
    name: "Alsubaiha Manager",
    role: "manager",
    permissions: ["view_dashboard", "manage_products", "view_products", "manage_orders", "view_orders", "view_customers", "manage_customers", "view_inventory", "view_analytics", "export_data", "view_our_work", "manage_our_work", "view_blogs", "manage_blogs"]
  },
  "staff@alsubaiha.com": {
    id: "3",
    name: "Alsubaiha Staff",
    role: "staff",
    permissions: ["view_dashboard", "view_products", "view_orders", "manage_orders", "view_customers", "view_inventory", "view_our_work", "view_blogs"]
  },
  "viewer@alsubaiha.com": {
    id: "4",
    name: "Alsubaiha Viewer",
    role: "viewer",
    permissions: ["view_dashboard", "view_products", "view_orders", "view_customers", "view_our_work", "view_blogs"]
  },
}


const defaultRoles: RoleDefinition[] = [
  {
    id: "role-admin",
    name: "Admin",
    description: "Full access to all features",
    permissions: ALL_PERMISSIONS.map(p => p.key),
    isSystem: true,
    color: "red",
    createdAt: "2024-01-01",
    memberCount: 1,
  },
  {
    id: "role-manager",
    name: "Manager",
    description: "Manage products, orders, and customers",
    permissions: ["view_dashboard", "manage_products", "view_products", "manage_orders", "view_orders", "view_customers", "manage_customers", "view_inventory", "view_analytics", "export_data", "view_our_work", "manage_our_work"],
    isSystem: true,
    color: "blue",
    createdAt: "2024-01-01",
    memberCount: 1,
  },
  {
    id: "role-staff",
    name: "Staff",
    description: "Basic access to view and process orders",
    permissions: ["view_dashboard", "view_products", "view_orders", "manage_orders", "view_customers", "view_inventory", "view_our_work"],
    isSystem: true,
    color: "green",
    createdAt: "2024-01-01",
    memberCount: 1,
  },
  {
    id: "role-viewer",
    name: "Viewer",
    description: "Read-only access",
    permissions: ["view_dashboard", "view_products", "view_orders", "view_customers", "view_our_work"],
    isSystem: false,
    color: "gray",
    createdAt: "2024-01-01",
    memberCount: 1,
  },
]

const defaultTeamMembers: TeamMember[] = [
  { id: "1", name: "Alsubaiha Admin", email: "admin@alsubaiha.com", role: "Admin", roleId: "role-admin", status: "active", lastActive: "2024-01-15" },
  { id: "2", name: "Alsubaiha Manager", email: "manager@alsubaiha.com", role: "Manager", roleId: "role-manager", status: "active", lastActive: "2024-01-15" },
  { id: "3", name: "Alsubaiha Staff", email: "staff@alsubaiha.com", role: "Staff", roleId: "role-staff", status: "active", lastActive: "2024-01-14" },
  { id: "4", name: "Alsubaiha Viewer", email: "viewer@alsubaiha.com", role: "Viewer", roleId: "role-viewer", status: "active", lastActive: "2024-01-13" },
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [permissions, setPermissions] = React.useState<Permission[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [roles, setRoles] = React.useState<RoleDefinition[]>(defaultRoles)
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>(defaultTeamMembers)
  const router = useRouter()
  const pathname = usePathname()

  // Load saved state from localStorage on mount
  React.useEffect(() => {
    try {
      const savedUser = localStorage.getItem("furnish_user")
      const savedPermissions = localStorage.getItem("furnish_permissions")
      const savedRoles = localStorage.getItem("furnish_roles")
      const savedTeam = localStorage.getItem("furnish_team")
      const appVersion = localStorage.getItem("furnish_version")

      if (appVersion !== "1.2") {
        // Clear old cached data to get new permissions
        localStorage.removeItem("furnish_user")
        localStorage.removeItem("furnish_permissions")
        localStorage.setItem("furnish_version", "1.2")
        setIsLoading(false)
        return
      }

      if (savedUser) {
        setUser(JSON.parse(savedUser))
        // The saved user is only a cache: if the server no longer has a session
        // (expired cookie), sign out instead of showing a dashboard that can't save.
        fetch("/api/auth/me", { credentials: "include" })
          .then((res) => {
            if (res.status === 401) {
              localStorage.removeItem("furnish_user")
              localStorage.removeItem("furnish_permissions")
              setUser(null)
              setPermissions([])
            }
          })
          .catch(() => {})
      }
      if (savedPermissions) {
        setPermissions(JSON.parse(savedPermissions))
      }
      if (savedRoles) {
        setRoles(JSON.parse(savedRoles))
      }
      if (savedTeam) {
        setTeamMembers(JSON.parse(savedTeam))
      }
    } catch {
      // Ignore errors
    }
    setIsLoading(false)
  }, [])

  // Handle redirects
  React.useEffect(() => {
    if (!isLoading && !user && pathname !== "/login" && pathname !== "/setup") {
      router.replace("/login")
    }
  }, [user, isLoading, pathname, router])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const emailLower = email.toLowerCase().trim()

      // Try calling the API first
      console.log("[v0] Attempting login with API:", emailLower)
      
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important: Include cookies
        body: JSON.stringify({
          email: emailLower,
          password,
        }),
      })

      console.log("[v0] API response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Login successful via API:", data)

        const newUser: User = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          avatar: data.user.avatar,
        }

        setUser(newUser)
        setPermissions(data.permissions || [])

        localStorage.setItem("furnish_user", JSON.stringify(newUser))
        localStorage.setItem("furnish_permissions", JSON.stringify(data.permissions || []))

        return true
      }

      return false
    } catch (error) {
      console.error("[v0] Login error:", error)

      return false
    }
  }

  const logout = () => {
    setUser(null)
    setPermissions([])
    localStorage.removeItem("furnish_user")
    localStorage.removeItem("furnish_permissions")
    router.push("/login")
  }

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission)
  }

  const refreshRoles = async () => {
    // For now, just use local state
  }

  const refreshTeamMembers = async () => {
    // For now, just use local state
  }

  const addRole = async (role: Omit<RoleDefinition, "id" | "createdAt" | "isSystem">) => {
    const newRole: RoleDefinition = {
      ...role,
      id: `role-${Date.now()}`,
      isSystem: false,
      createdAt: new Date().toISOString().split("T")[0],
    }
    const newRoles = [...roles, newRole]
    setRoles(newRoles)
    localStorage.setItem("furnish_roles", JSON.stringify(newRoles))
  }

  const updateRole = async (id: string, updates: Partial<RoleDefinition>) => {
    const newRoles = roles.map(r => r.id === id ? { ...r, ...updates } : r)
    setRoles(newRoles)
    localStorage.setItem("furnish_roles", JSON.stringify(newRoles))
  }

  const deleteRole = async (id: string) => {
    const newRoles = roles.filter(r => r.id !== id)
    setRoles(newRoles)
    localStorage.setItem("furnish_roles", JSON.stringify(newRoles))
  }

  const addTeamMember = async (member: Omit<TeamMember, "id">) => {
    const newMember: TeamMember = {
      ...member,
      id: `member-${Date.now()}`,
    }
    const newMembers = [...teamMembers, newMember]
    setTeamMembers(newMembers)
    localStorage.setItem("furnish_team", JSON.stringify(newMembers))
  }

  const updateTeamMember = async (id: string, updates: Partial<TeamMember>) => {
    const newMembers = teamMembers.map(m => m.id === id ? { ...m, ...updates } : m)
    setTeamMembers(newMembers)
    localStorage.setItem("furnish_team", JSON.stringify(newMembers))
  }

  const removeTeamMember = async (id: string) => {
    const newMembers = teamMembers.filter(m => m.id !== id)
    setTeamMembers(newMembers)
    localStorage.setItem("furnish_team", JSON.stringify(newMembers))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        hasPermission,
        permissions,
        roles,
        teamMembers,
        refreshRoles,
        refreshTeamMembers,
        addRole,
        updateRole,
        deleteRole,
        addTeamMember,
        updateTeamMember,
        removeTeamMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useAuth()
  return hasPermission(permission)
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<string, string> = {
    admin: "Administrator",
    manager: "Manager",
    staff: "Staff",
    viewer: "Viewer",
  }
  return labels[role] || role
}

export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<string, string> = {
    admin: "bg-red-500/10 text-red-500 border-red-500/20",
    manager: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    staff: "bg-green-500/10 text-green-500 border-green-500/20",
    viewer: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    red: "bg-red-500/10 text-red-500 border-red-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    green: "bg-green-500/10 text-green-500 border-green-500/20",
    yellow: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    orange: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    pink: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    gray: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  }
  return colors[role] || colors.gray
}

export const ROLE_COLORS = [
  { value: "red", label: "Red", class: "bg-red-500" },
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "pink", label: "Pink", class: "bg-pink-500" },
  { value: "gray", label: "Gray", class: "bg-gray-500" },
]
