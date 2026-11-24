"use client"

import React from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { useAuth, type Permission } from "@/lib/auth-context"
import { Loader2, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface DashboardLayoutProps {
  children: React.ReactNode
  title: string
  description: string
  requiredPermission?: Permission
}

export function DashboardLayout({ children, title, description, requiredPermission }: DashboardLayoutProps) {
  const { user, isLoading, hasPermission } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null // Auth context will redirect to login
  }

  // Check if user has permission to view this page
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 pl-64">
          <Header />
          <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
            <div className="text-center">
              <ShieldAlert className="mx-auto h-16 w-16 text-muted-foreground" />
              <h1 className="mt-4 text-2xl font-bold">Access Denied</h1>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to access this page.
              </p>
              <Button asChild className="mt-6">
                <Link href="/">Go to Dashboard</Link>
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 pl-64">
        <Header />
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
