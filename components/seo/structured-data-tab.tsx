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
