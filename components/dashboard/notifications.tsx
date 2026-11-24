"use client"

import * as React from "react"
import Link from "next/link"
import { Bell, Package, ShoppingCart, Users, AlertTriangle, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: "order" | "product" | "customer" | "alert"
  title: string
  description: string
  time: string
  read: boolean
  href: string
}

const initialNotifications: Notification[] = [
  {
    id: "1",
    type: "order",
    title: "New Order Received",
    description: "Order #ORD-7845 from Emma Wilson - $2,490",
    time: "2 min ago",
    read: false,
    href: "/orders?search=ORD-7845",
  },
  {
    id: "2",
    type: "alert",
    title: "Low Stock Alert",
    description: "Oslo Modern Sofa is running low (5 units left)",
    time: "15 min ago",
    read: false,
    href: "/inventory?search=Oslo",
  },
  {
    id: "3",
    type: "customer",
    title: "New Customer Registered",
    description: "Michael Chen just created an account",
    time: "1 hour ago",
    read: false,
    href: "/customers?search=Michael%20Chen",
  },
  {
    id: "4",
    type: "order",
    title: "Order Delivered",
    description: "Order #ORD-7838 has been delivered successfully",
    time: "2 hours ago",
    read: true,
    href: "/orders?search=ORD-7838",
  },
  {
    id: "5",
    type: "product",
    title: "Product Review",
    description: "Copenhagen Dining Table received a 5-star review",
    time: "3 hours ago",
    read: true,
    href: "/products?search=Copenhagen",
  },
  {
    id: "6",
    type: "alert",
    title: "Payment Failed",
    description: "Order #ORD-7843 payment was declined",
    time: "5 hours ago",
    read: true,
    href: "/orders?search=ORD-7843",
  },
]

const iconMap = {
  order: ShoppingCart,
  product: Package,
  customer: Users,
  alert: AlertTriangle,
}

const colorMap = {
  order: "bg-blue-500/10 text-blue-500",
  product: "bg-green-500/10 text-green-500",
  customer: "bg-purple-500/10 text-purple-500",
  alert: "bg-orange-500/10 text-orange-500",
}

export function Notifications() {
  const [notifications, setNotifications] = React.useState(initialNotifications)
  const [open, setOpen] = React.useState(false)
  
  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h4 className="font-semibold">Notifications</h4>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
            </p>
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <Check className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const Icon = iconMap[notification.type]
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative flex gap-3 p-4 transition-colors hover:bg-secondary/50",
                      !notification.read && "bg-primary/5"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        colorMap[notification.type]
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Link
                        href={notification.href}
                        onClick={() => {
                          markAsRead(notification.id)
                          setOpen(false)
                        }}
                        className="block"
                      >
                        <p className="text-sm font-medium leading-tight">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.time}
                        </p>
                      </Link>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeNotification(notification.id)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove</span>
                    </Button>
                    {!notification.read && (
                      <div className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
        
        {notifications.length > 0 && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={clearAll}
            >
              Clear all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
