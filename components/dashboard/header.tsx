"use client"

import { GlobalSearch } from "@/components/dashboard/global-search"
import { Notifications } from "@/components/dashboard/notifications"
import { ProfileMenu } from "@/components/dashboard/profile-menu"

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2">
        <Notifications />
        <ProfileMenu />
      </div>
    </header>
  )
}
