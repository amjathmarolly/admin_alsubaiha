"use client"

import { useCallback, useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"

import type { SeoSettings } from "@/lib/seo-tools"
export type { SeoSettings }

export function useSeoSettings() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<SeoSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/seo/settings")
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || "Failed")
        setSettings(d.settings)
      })
      .catch((e) => toast({ title: "Error", description: e.message, variant: "destructive" }))
  }, [toast])

  const save = useCallback(
    async (patch: Partial<SeoSettings>) => {
      setSaving(true)
      try {
        const res = await fetch("/api/seo/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error || "Failed")
        setSettings(d.settings)
        toast({ title: "Saved", description: d.revalidated ? "The website has been refreshed." : "The website will pick it up within about a minute." })
      } catch (e) {
        toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
      } finally {
        setSaving(false)
      }
    },
    [toast]
  )

  return { settings, setSettings, save, saving }
}
