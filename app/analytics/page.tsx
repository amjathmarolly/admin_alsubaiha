"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts"
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Eye } from "lucide-react"
import { ExportDialog } from "@/components/dashboard/export-dialog"

const analyticsExportFields = [
  { key: "month", label: "Month", default: true },
  { key: "revenue", label: "Revenue", default: true },
  { key: "target", label: "Target", default: true },
]

const revenueData = [
  { month: "Jan", revenue: 18500, target: 20000 },
  { month: "Feb", revenue: 22300, target: 21000 },
  { month: "Mar", revenue: 19800, target: 22000 },
  { month: "Apr", revenue: 28400, target: 25000 },
  { month: "May", revenue: 32100, target: 28000 },
  { month: "Jun", revenue: 26700, target: 30000 },
  { month: "Jul", revenue: 35200, target: 32000 },
  { month: "Aug", revenue: 38900, target: 35000 },
  { month: "Sep", revenue: 31400, target: 36000 },
  { month: "Oct", revenue: 42300, target: 38000 },
  { month: "Nov", revenue: 48700, target: 42000 },
  { month: "Dec", revenue: 52100, target: 45000 },
]

const trafficData = [
  { day: "Mon", visitors: 2400, pageViews: 4200 },
  { day: "Tue", visitors: 1398, pageViews: 3200 },
  { day: "Wed", visitors: 3800, pageViews: 5100 },
  { day: "Thu", visitors: 3908, pageViews: 5800 },
  { day: "Fri", visitors: 4800, pageViews: 7200 },
  { day: "Sat", visitors: 3800, pageViews: 5500 },
  { day: "Sun", visitors: 4300, pageViews: 6100 },
]

const conversionData = [
  { week: "W1", rate: 2.4 },
  { week: "W2", rate: 2.8 },
  { week: "W3", rate: 3.1 },
  { week: "W4", rate: 2.9 },
  { week: "W5", rate: 3.4 },
  { week: "W6", rate: 3.2 },
  { week: "W7", rate: 3.8 },
  { week: "W8", rate: 4.1 },
]

const topPages = [
  { page: "/products/velvet-sofa", views: 12450, conversion: 4.2 },
  { page: "/products/oak-dining-table", views: 9820, conversion: 3.8 },
  { page: "/collections/living-room", views: 8340, conversion: 2.9 },
  { page: "/products/ergonomic-chair", views: 7120, conversion: 5.1 },
  { page: "/collections/bedroom", views: 6890, conversion: 3.2 },
]

export default function AnalyticsPage() {
  const { hasPermission } = useAuth()
  const canExport = hasPermission("export_data")
  
  return (
    <DashboardLayout
      title="Analytics"
      description="Monitor your store's performance and insights."
      requiredPermission="view_analytics"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Performance Overview</h2>
          <div className="flex gap-2">
            {canExport && (
              <ExportDialog
                title="Analytics"
                data={revenueData}
                fields={analyticsExportFields}
                filename="analytics"
              />
            )}
            <Select defaultValue="30days">
              <SelectTrigger className="w-40 bg-secondary">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="12months">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-primary/10 p-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Revenue</p>
              </div>
              <p className="mt-2 text-2xl font-bold">$284,720</p>
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                <span>+18.2% vs last period</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <ShoppingCart className="h-4 w-4 text-blue-400" />
                </div>
                <p className="text-sm text-muted-foreground">Orders</p>
              </div>
              <p className="mt-2 text-2xl font-bold">1,847</p>
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                <span>+12.5% vs last period</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <Users className="h-4 w-4 text-amber-400" />
                </div>
                <p className="text-sm text-muted-foreground">Visitors</p>
              </div>
              <p className="mt-2 text-2xl font-bold">48,293</p>
              <div className="mt-1 flex items-center gap-1 text-xs text-red-400">
                <TrendingDown className="h-3 w-3" />
                <span>-3.1% vs last period</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <Eye className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-sm text-muted-foreground">Conversion</p>
              </div>
              <p className="mt-2 text-2xl font-bold">3.82%</p>
              <div className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                <span>+0.4% vs last period</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Target</CardTitle>
              <CardDescription>Monthly revenue compared to targets</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  revenue: { label: "Revenue", color: "#4dabcf" },
                  target: { label: "Target", color: "#50b8a0" },
                }}
                className="h-[300px] w-full"
              >
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4dabcf" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4dabcf" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="month" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="revenue" stroke="#4dabcf" strokeWidth={2} fill="url(#revenueGradient)" />
                  <Line type="monotone" dataKey="target" stroke="#50b8a0" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Website Traffic</CardTitle>
              <CardDescription>Visitors and page views this week</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  visitors: { label: "Visitors", color: "#4dabcf" },
                  pageViews: { label: "Page Views", color: "#d4a855" },
                }}
                className="h-[300px] w-full"
              >
                <BarChart data={trafficData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="day" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="visitors" fill="#4dabcf" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pageViews" fill="#d4a855" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Rate</CardTitle>
              <CardDescription>Weekly conversion trend</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  rate: { label: "Conversion Rate", color: "#50b8a0" },
                }}
                className="h-[200px] w-full"
              >
                <LineChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="week" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="rate" stroke="#50b8a0" strokeWidth={2} dot={{ fill: "#50b8a0", r: 4 }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
              <CardDescription>Most visited pages this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPages.map((page, index) => (
                  <div key={page.page} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium">{page.page}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-sm text-muted-foreground">
                        {page.views.toLocaleString()} views
                      </span>
                      <span className="text-sm text-primary">{page.conversion}% conv</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
