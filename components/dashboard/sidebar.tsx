"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth, type Permission } from "@/lib/auth-context"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  Box,
  Truck,
  Tag,
  LogOut,
  FolderTree,
  Camera,
  Briefcase,
  FileText,
  Crown,
  Palette,
  Hammer,
  Search,
  Clapperboard,
  HelpCircle,
  KeyRound,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission: Permission
}

const mainNavItems: NavItem[] = [
  { name: "Overview", href: "/", icon: LayoutDashboard, permission: "view_dashboard" },
  { name: "Blogs", href: "/blogs", icon: FileText, permission: "view_blogs" },
  { name: "Products", href: "/products", icon: Package, permission: "view_products" },
  { name: "Categories", href: "/categories", icon: FolderTree, permission: "view_products" },
  { name: "Orders", href: "/orders", icon: ShoppingCart, permission: "view_orders" },
  { name: "Customers", href: "/customers", icon: Users, permission: "view_customers" },
  { name: "Our Work", href: "/our-work", icon: Camera, permission: "view_our_work" },
  { name: "Atelier Live", href: "/atelier-live", icon: Hammer, permission: "view_atelier_live" },
  { name: "Factory Videos", href: "/factory-videos", icon: Clapperboard, permission: "view_our_work" },
  { name: "Projects", href: "/projects", icon: Briefcase, permission: "view_our_work" },
  { name: "Designers", href: "/designers", icon: Palette, permission: "view_our_work" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, permission: "view_analytics" },
  { name: "SEO", href: "/seo", icon: Search, permission: "view_products" },
  { name: "FAQ", href: "/faqs", icon: HelpCircle, permission: "view_products" },
]

const inventoryItems: NavItem[] = [
  { name: "Inventory", href: "/inventory", icon: Box, permission: "view_inventory" },
  { name: "Shipping", href: "/shipping", icon: Truck, permission: "view_shipping" },
  { name: "Discounts", href: "/discounts", icon: Tag, permission: "view_discounts" },
  { name: "Membership Plans", href: "/membership-plans", icon: Crown, permission: "manage_discounts" },
  { name: "Client Logins", href: "/client-logins", icon: KeyRound, permission: "manage_customers" },
]

export function Sidebar() {
  const pathname = usePathname()
  const { hasPermission, logout, user } = useAuth()
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false)

  const visibleMainNavItems = mainNavItems.filter((item) => hasPermission(item.permission))
  const visibleInventoryItems = inventoryItems.filter((item) => hasPermission(item.permission))

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
        <Link href="/" className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
          {/* <div className="flex h-8 w-8 items-center justify-center rounded-lg "> */}
          {/* <Box className="h-5 w-5 text-primary-foreground" /> */}
          {/* <img src="./al-subaiha-logo-v2.jpg" alt="" className="h-full w-full object-cover" /> */}

          {/* </div> */}
          <img src="./al-subaiha-logo-v2.jpg" alt="" className="h-full w-full object-cover" />

          {/* <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1920&h=800&fit=crop')" }}
        ></div> */}
          {/* <span className="text-lg font-semibold tracking-tight">Al Subaiha</span> */}
        </Link>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
          {visibleMainNavItems.length > 0 && (
            <div>
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Main
              </p>
              <ul className="space-y-1">
                {visibleMainNavItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {visibleInventoryItems.length > 0 && (
            <div>
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Inventory
              </p>
              <ul className="space-y-1">
                {visibleInventoryItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary"
                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {hasPermission("manage_settings") && (
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/settings"
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          )}
          <button
            type="button"
            onClick={() => setLogoutDialogOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out{user?.name ? `, ${user.name}` : ""}? You will need to sign in again to access your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={logout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
