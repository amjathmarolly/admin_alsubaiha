"use client"

import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2 } from "lucide-react"
import { useOrders } from "@/lib/orders-context"
import { useCurrency } from "@/lib/currency-context"
import { formatDistanceToNow } from "date-fns"

const statusStyles: Record<string, string> = {
  delivered: "bg-green-500/10 text-green-500 border-green-500/20",
  shipped: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  processing: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  confirmed: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  pending: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  refunded: "bg-purple-500/10 text-purple-500 border-purple-500/20",
}

export function RecentOrders() {
  const { orders, isLoading } = useOrders()
  const { formatPrice } = useCurrency()
  
  // Get the 5 most recent orders
  const recentOrders = orders.slice(0, 5)

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest customer orders and status</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-primary" asChild>
          <Link href="/orders">
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No orders yet
          </div>
        ) : (
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders?search=${order.order_number}`}
                className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-xs font-medium text-muted-foreground">
                    {(order.customer_name || "U").split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-medium">{order.customer_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{order.order_number || order.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(order.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusStyles[order.status] || statusStyles.pending}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
