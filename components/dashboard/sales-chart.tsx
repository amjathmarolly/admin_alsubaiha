"use client"

import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCurrency } from "@/lib/currency-context"

const salesData = [
  { month: "Jan", revenue: 18500 },
  { month: "Feb", revenue: 22300 },
  { month: "Mar", revenue: 19800 },
  { month: "Apr", revenue: 28400 },
  { month: "May", revenue: 32100 },
  { month: "Jun", revenue: 26700 },
  { month: "Jul", revenue: 35200 },
  { month: "Aug", revenue: 38900 },
  { month: "Sep", revenue: 31400 },
  { month: "Oct", revenue: 42300 },
  { month: "Nov", revenue: 48700 },
  { month: "Dec", revenue: 52100 },
]

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "#4dabcf",
  },
}

export function SalesChart() {
  const { formatPrice, currencyInfo } = useCurrency()
  
  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>Monthly revenue and order trends</CardDescription>
        </div>
        <Select defaultValue="12months">
          <SelectTrigger className="w-36 bg-secondary">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="12months">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-[300px] w-full"
        >
          <AreaChart
            data={salesData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4dabcf" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4dabcf" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#666"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#666"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${currencyInfo.symbol}${value / 1000}k`}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              formatter={(value) => [formatPrice(Number(value)), "Revenue"]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#4dabcf"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
