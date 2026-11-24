"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Legend } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const categoryData = [
  { category: "Sofas", value: 35, fill: "#4dabcf" },
  { category: "Tables", value: 25, fill: "#50b8a0" },
  { category: "Chairs", value: 20, fill: "#d4a855" },
  { category: "Beds", value: 12, fill: "#cf7a4d" },
  { category: "Storage", value: 8, fill: "#8b7bcf" },
]

const chartConfig = {
  value: { label: "Sales" },
  Sofas: { label: "Sofas", color: "#4dabcf" },
  Tables: { label: "Tables", color: "#50b8a0" },
  Chairs: { label: "Chairs", color: "#d4a855" },
  Beds: { label: "Beds", color: "#cf7a4d" },
  Storage: { label: "Storage", color: "#8b7bcf" },
}

export function CategoriesChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales by Category</CardTitle>
        <CardDescription>Distribution of sales across furniture types</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="h-[300px] w-full"
        >
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="category"
            />
            <ChartTooltip content={<ChartTooltipContent nameKey="category" />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
