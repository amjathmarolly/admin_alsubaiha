"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { CategoriesChart } from "@/components/dashboard/categories-chart"
import { RecentOrders } from "@/components/dashboard/recent-orders"
import { TopProducts } from "@/components/dashboard/top-products"
import { useAuth } from "@/lib/auth-context"

export default function Dashboard() {
  const { user } = useAuth()
  
  return (
    <DashboardLayout
      title="Dashboard"
      description={`Welcome back${user?.name ? `, ${user.name}` : ""}! Here's what's happening with your store.`}
      requiredPermission="view_dashboard"
    >
      <div className="space-y-6">
        <StatsCards />

        <div className="grid gap-6 lg:grid-cols-3">
          <SalesChart />
          <CategoriesChart />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <RecentOrders />
          <TopProducts />
        </div>
      </div>
    </DashboardLayout>
  )
}
