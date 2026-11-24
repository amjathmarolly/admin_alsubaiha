"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, ShoppingCart, Package, Users, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOrders } from "@/lib/orders-context"
import { useCustomers } from "@/lib/customers-context"
import { useProducts } from "@/lib/products-context"
import { useCurrency } from "@/lib/currency-context"

export function StatsCards() {
  const { orders, isLoading: ordersLoading } = useOrders()
  const { customers, isLoading: customersLoading } = useCustomers()
  const { products, isLoading: productsLoading } = useProducts()
  const { formatPrice } = useCurrency()

  const isLoading = ordersLoading || customersLoading || productsLoading

  // Calculate stats from real data
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
  const totalOrders = orders.length
  const totalProductsSold = orders.reduce((sum, order) => sum + order.items_count, 0)
  const totalCustomers = customers.length

  const stats = [
    {
      title: "Total Revenue",
      value: formatPrice(totalRevenue),
      change: "+12.5%",
      trend: "up" as const,
      icon: DollarSign,
      description: "vs last month",
    },
    {
      title: "Orders",
      value: totalOrders.toLocaleString(),
      change: "+8.2%",
      trend: "up" as const,
      icon: ShoppingCart,
      description: "vs last month",
    },
    {
      title: "Products Sold",
      value: totalProductsSold.toLocaleString(),
      change: "-2.4%",
      trend: "down" as const,
      icon: Package,
      description: "vs last month",
    },
    {
      title: "Customers",
      value: totalCustomers.toLocaleString(),
      change: "+18.7%",
      trend: "up" as const,
      icon: Users,
      description: "total",
    },
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-card">
            <CardContent className="flex items-center justify-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className="rounded-lg bg-secondary p-2">
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{stat.value}</div>
            <div className="mt-1 flex items-center gap-1 text-xs">
              {stat.trend === "up" ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span
                className={cn(
                  "font-medium",
                  stat.trend === "up" ? "text-green-500" : "text-red-500"
                )}
              >
                {stat.change}
              </span>
              <span className="text-muted-foreground">{stat.description}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
