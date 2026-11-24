"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useSeoSettings } from "./use-seo-settings"

export function TrackingTab() {
  const { settings, setSettings, save, saving } = useSeoSettings()
  if (!settings) return <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
  const t = settings.tracking
  const set = (k: keyof typeof t, v: string) => setSettings({ ...settings, tracking: { ...t, [k]: v } })
  const fields: { k: keyof typeof t; label: string; ph: string; hint: string }[] = [
    { k: "gtmId", label: "Google Tag Manager container ID", ph: "GTM-XXXXXXX", hint: "Loads every tag set up in Tag Manager. If GA4 is also set up inside Tag Manager, leave the GA4 field below empty to avoid counting visits twice." },
    { k: "googleAdsId", label: "Google Ads tag ID", ph: "AW-XXXXXXXXX", hint: "Google Ads → Tools → Data manager → Google tag" },
    { k: "ga4Id", label: "Google Analytics 4 measurement ID", ph: "G-XXXXXXXXXX", hint: "Admin → Data streams in Google Analytics. Leave empty if GA4 is already set up inside Tag Manager." },
    { k: "metaPixelId", label: "Meta (Facebook) Pixel ID", ph: "1234567890123456", hint: "Events Manager → Data sources" },
    { k: "gscVerification", label: "Google Search Console verification code", ph: "content value of the google-site-verification tag", hint: "Only the code, not the whole tag" },
    { k: "bingVerification", label: "Bing Webmaster verification code", ph: "content value of the msvalidate.01 tag", hint: "Only the code, not the whole tag" },
  ]
  return (
    <Card><CardContent className="space-y-4 p-4">
      <p className="text-sm text-muted-foreground">Saved here and published to the website via <code>/api/seo/site</code> (<code>tracking</code>), so adding a tag no longer needs a code change.</p>
      {fields.map((f) => (
        <div key={f.k} className="space-y-1.5">
          <Label htmlFor={f.k}>{f.label}</Label>
          <Input id={f.k} value={t[f.k]} onChange={(e) => set(f.k, e.target.value)} placeholder={f.ph} className="max-w-lg bg-secondary" />
          <p className="text-xs text-muted-foreground">{f.hint}</p>
        </div>
      ))}
      <Button disabled={saving} onClick={() => save({ tracking: t })}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button>
    </CardContent></Card>
  )
}
