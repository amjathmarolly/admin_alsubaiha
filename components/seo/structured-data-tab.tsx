"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ExternalLink, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSeoSettings } from "./use-seo-settings"

interface Entry { key: string; label: string }

export function StructuredDataTab() {
  const { toast } = useToast()
  const { settings, setSettings, save, saving } = useSeoSettings()
  const [products, setProducts] = useState<Entry[]>([])
  const [slug, setSlug] = useState("")
  const [json, setJson] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/seo/entries?type=product").then((r) => r.json()).then((d) => {
      setProducts(d.entries ?? [])
      if (d.entries?.[0]) setSlug(d.entries[0].key)
    }).catch(() => {})
  }, [])

  const preview = async (type: string, key: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/seo/structured-data?type=${type}&key=${encodeURIComponent(key)}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Failed")
      setJson(JSON.stringify(d.jsonLd, null, 2))
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (!settings) return <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
  const o = settings.org
  const setOrg = (patch: Partial<typeof o>) => setSettings({ ...settings, org: { ...o, ...patch } })

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card><CardContent className="space-y-4 p-4">
        <div>
          <h3 className="font-medium">Business details</h3>
          <p className="text-sm text-muted-foreground">Used for the Organization schema on the home page and the Brand/currency on every product.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Business name</Label><Input value={o.name} onChange={(e) => setOrg({ name: e.target.value })} className="bg-secondary" /></div>
          <div className="space-y-1.5"><Label>Website URL</Label><Input value={o.url} onChange={(e) => setOrg({ url: e.target.value })} className="bg-secondary" /></div>
          <div className="space-y-1.5"><Label>Logo URL</Label><Input value={o.logo} onChange={(e) => setOrg({ logo: e.target.value })} placeholder="https://…/logo.png" className="bg-secondary" /></div>
          <div className="space-y-1.5"><Label>Price currency</Label><Input value={settings.currency} maxLength={3} onChange={(e) => setSettings({ ...settings, currency: e.target.value.toUpperCase() })} className="bg-secondary" /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={o.phone} onChange={(e) => setOrg({ phone: e.target.value })} className="bg-secondary" /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input value={o.email} onChange={(e) => setOrg({ email: e.target.value })} className="bg-secondary" /></div>
          <div className="space-y-1.5"><Label>Legal name</Label><Input value={o.legalName} onChange={(e) => setOrg({ legalName: e.target.value })} placeholder="As on the trade licence" className="bg-secondary" /></div>
          <div className="space-y-1.5"><Label>Founded (year or date)</Label><Input value={o.foundingDate} onChange={(e) => setOrg({ foundingDate: e.target.value })} placeholder="1994" className="bg-secondary" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Showroom / factory photo URL</Label><Input value={o.image} onChange={(e) => setOrg({ image: e.target.value })} placeholder="Shown in Google's business result. Defaults to the logo." className="bg-secondary" /></div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div>
            <h4 className="text-sm font-medium">Address and location</h4>
            <p className="text-xs text-muted-foreground">With an address, the website marks Al Subaiha as a local furniture store for Google Maps and local search.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label>Street address</Label><Input value={o.address.streetAddress} onChange={(e) => setOrg({ address: { ...o.address, streetAddress: e.target.value } })} placeholder="Building, street, area" className="bg-secondary" /></div>
            <div className="space-y-1.5"><Label>City</Label><Input value={o.address.addressLocality} onChange={(e) => setOrg({ address: { ...o.address, addressLocality: e.target.value } })} placeholder="Sharjah" className="bg-secondary" /></div>
            <div className="space-y-1.5"><Label>Emirate / region</Label><Input value={o.address.addressRegion} onChange={(e) => setOrg({ address: { ...o.address, addressRegion: e.target.value } })} placeholder="Sharjah" className="bg-secondary" /></div>
            <div className="space-y-1.5"><Label>P.O. Box / postal code</Label><Input value={o.address.postalCode} onChange={(e) => setOrg({ address: { ...o.address, postalCode: e.target.value } })} className="bg-secondary" /></div>
            <div className="space-y-1.5"><Label>Country code</Label><Input value={o.address.addressCountry} maxLength={2} onChange={(e) => setOrg({ address: { ...o.address, addressCountry: e.target.value.toUpperCase() } })} placeholder="AE" className="bg-secondary" /></div>
            <div className="space-y-1.5"><Label>Latitude</Label><Input value={(o.geo.latitude ?? "") as any} onChange={(e) => setOrg({ geo: { ...o.geo, latitude: e.target.value as unknown as number } })} placeholder="25.3…" className="bg-secondary" /></div>
            <div className="space-y-1.5"><Label>Longitude</Label><Input value={(o.geo.longitude ?? "") as any} onChange={(e) => setOrg({ geo: { ...o.geo, longitude: e.target.value as unknown as number } })} placeholder="55.6…" className="bg-secondary" /></div>
          </div>
        </div>

        <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Opening hours (one per line)</Label>
            <Textarea rows={3} value={o.openingHours.join("\n")} onChange={(e) => setOrg({ openingHours: e.target.value.split("\n") })} placeholder={"Sa-Th 08:00-18:00"} className="bg-secondary font-mono text-xs" />
            <p className="text-xs text-muted-foreground">Days: Mo Tu We Th Fr Sa Su. Example: <code>Sa-Th 08:00-18:00</code></p>
          </div>
          <div className="space-y-1.5">
            <Label>Areas served (one per line)</Label>
            <Textarea rows={3} value={o.areaServed.join("\n")} onChange={(e) => setOrg({ areaServed: e.target.value.split("\n") })} placeholder={"Dubai\nAbu Dhabi\nSharjah"} className="bg-secondary" />
          </div>
          <div className="space-y-1.5"><Label>Price range</Label><Input value={o.priceRange} onChange={(e) => setOrg({ priceRange: e.target.value })} placeholder="$$$" className="bg-secondary" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5"><Label>Google rating</Label><Input value={(o.rating.value ?? "") as any} onChange={(e) => setOrg({ rating: { ...o.rating, value: e.target.value as unknown as number } })} placeholder="4.6" className="bg-secondary" /></div>
            <div className="space-y-1.5"><Label>Reviews</Label><Input value={(o.rating.count ?? "") as any} onChange={(e) => setOrg({ rating: { ...o.rating, count: e.target.value as unknown as number } })} placeholder="115" className="bg-secondary" /></div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Social profiles (one URL per line)</Label>
          <Textarea rows={4} value={o.sameAs.join("\n")} onChange={(e) => setOrg({ sameAs: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} placeholder={"https://instagram.com/…\nhttps://facebook.com/…"} className="bg-secondary" />
        </div>
        <Button disabled={saving} onClick={() => save({ org: o, currency: settings.currency })}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save</Button>
      </CardContent></Card>

      <Card><CardContent className="space-y-3 p-4">
        <div>
          <h3 className="font-medium">Preview JSON-LD</h3>
          <p className="text-sm text-muted-foreground">The website fetches <code>/api/seo/structured-data?type=…&key=…</code> and embeds the result in a <code>&lt;script type="application/ld+json"&gt;</code>.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={slug} onChange={(e) => setSlug(e.target.value)} className="h-9 min-w-0 flex-1 rounded-md border bg-secondary px-3 text-sm">
            {products.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <Button variant="outline" size="sm" disabled={!slug || loading} onClick={() => preview("product", slug)}>Product</Button>
          <Button variant="outline" size="sm" disabled={loading} onClick={() => preview("page", "/")}>Home</Button>
        </div>
        <Textarea readOnly rows={16} value={json} placeholder="Pick a product or Home and press the button." className="bg-secondary font-mono text-xs" />
        <a className="inline-flex items-center gap-1 text-xs underline" target="_blank" rel="noreferrer" href="https://search.google.com/test/rich-results">
          Test live pages in Google's Rich Results Test <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent></Card>
    </div>
  )
}
