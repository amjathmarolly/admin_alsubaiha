import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeImageUrl(value: string | null | undefined): string {
  if (!value) return "/placeholder.svg"

  const trimmed = value.trim()
  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return "/placeholder.svg"
  }

  if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(trimmed)) {
    return trimmed
  }

  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  const base = (typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_ADMIN_URL || process.env.NEXT_PUBLIC_APP_URL || ""
  ).replace(/\/$/, "")

  return base ? `${base}${normalized}` : normalized
}
