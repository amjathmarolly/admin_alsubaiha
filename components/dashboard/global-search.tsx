"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Warehouse,
  Truck,
  Tags,
  Settings,
  LayoutDashboard,
  Search,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"

const pages = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, description: "Overview and stats" },
  { name: "Products", href: "/products", icon: Package, description: "Manage products" },
  { name: "Orders", href: "/orders", icon: ShoppingCart, description: "View orders" },
  { name: "Customers", href: "/customers", icon: Users, description: "Customer list" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, description: "Performance metrics" },
  { name: "Inventory", href: "/inventory", icon: Warehouse, description: "Stock levels" },
  { name: "Shipping", href: "/shipping", icon: Truck, description: "Shipment tracking" },
  { name: "Discounts", href: "/discounts", icon: Tags, description: "Promo codes" },
  { name: "Settings", href: "/settings", icon: Settings, description: "App settings" },
]

const recentSearches = [
  { type: "product", name: "Oslo Modern Sofa", href: "/products?search=Oslo%20Modern%20Sofa" },
  { type: "order", name: "ORD-7842", href: "/orders?search=ORD-7842" },
  { type: "customer", name: "Emma Wilson", href: "/customers?search=Emma%20Wilson" },
]

const quickActions = [
  { name: "Add New Product", href: "/products?action=add", icon: Package },
  { name: "Create Order", href: "/orders?action=add", icon: ShoppingCart },
  { name: "Add Customer", href: "/customers?action=add", icon: Users },
  { name: "Create Discount", href: "/discounts?action=add", icon: Tags },
]

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <Button
        variant="outline"
        className="relative w-80 justify-start bg-secondary text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Search products, orders...
        <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">Ctrl</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search products, orders, customers..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Quick Actions">
            {quickActions.map((action) => (
              <CommandItem
                key={action.name}
                onSelect={() => runCommand(() => router.push(action.href))}
              >
                <action.icon className="mr-2 h-4 w-4" />
                {action.name}
              </CommandItem>
            ))}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Pages">
            {pages.map((page) => (
              <CommandItem
                key={page.href}
                onSelect={() => runCommand(() => router.push(page.href))}
              >
                <page.icon className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>{page.name}</span>
                  <span className="text-xs text-muted-foreground">{page.description}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Recent Searches">
            {recentSearches.map((item) => (
              <CommandItem
                key={item.name}
                onSelect={() => runCommand(() => router.push(item.href))}
              >
                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{item.name}</span>
                <span className="ml-2 text-xs text-muted-foreground capitalize">
                  ({item.type})
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
