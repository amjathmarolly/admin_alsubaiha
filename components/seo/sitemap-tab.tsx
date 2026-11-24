"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ExternalLink, Loader2, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSeoSettings } from "./use-seo-settings"

interface Url { type: string; label: string; path: string; noindex: boolean; excluded: boolean }

export function SitemapTab() {
  const { toast } = useToast()
  const { settings, setSettings, save, saving } = useSeoSettings()
  const [urls, setUrls] = useState<Url[] | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/seo/sitemap?admin=1")
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || "Failed")
        setUrls(d.urls)
      })
      .catch((e) => toast({ title: "Error", description: e.message, variant: "destructive" }))
  }, [toast])

  const excluded = useMemo(() => new Set(settings?.sitemapExclude ?? []), [settings])
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (urls ?? []).filter((u) => !q || u.label.toLowerCase().includes(q) || u.path.toLowerCase().includes(q))
  }, [urls, search])

  if (!settings || !urls) return <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>

  const toggle = (path: string, include: boolean) => {
    const next = new Set(excluded)
    include ? next.delete(path) : next.add(path)
    setSettings({ ...settings, sitemapExclude: [...next] })
  }
  const included = urls.filter((u) => !u.noindex && !excluded.has(u.path)).length

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-medium">Sitemap</h3>
            <p className="text-sm text-muted-foreground">{included} of {urls.length} URLs included. Pages marked noindex are always left out.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild><a href="/api/seo/sitemap?format=xml" target="_blank" rel="noreferrer">View XML <ExternalLink className="ml-1 h-3 w-3" /></a></Button>
            <Button size="sm" disabled={saving} onClick={() => save({ sitemapExclude: settings.sitemapExclude })}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save sitemap
            </Button>
          </div>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search URLs" className="bg-secondary pl-9" />
        </div>
        <Card><CardContent className="max-h-[420px] overflow-y-auto p-0">
          <ul className="divide-y">
            {shown.slice(0, 400).map((u) => (
              <li key={`${u.type}:${u.path}`} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.path}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {u.noindex && <Badge variant="destructive">noindex</Badge>}
                  <Switch checked={!u.noindex && !excluded.has(u.path)} disabled={u.noindex} onCheckedChange={(v) => toggle(u.path, v)} />
                </div>
              </li>
            ))}
          </ul>
        </CardContent></Card>
        <p className="text-xs text-muted-foreground">
          Google no longer accepts sitemap "pings". Submit <code>/sitemap.xml</code> once in Search Console and it re-reads it on its own. The website can serve <code>/api/seo/sitemap?format=xml</code> as its <code>sitemap.xml</code>.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">robots.txt</h3>
        <Textarea rows={9} value={settings.robotsTxt} onChange={(e) => setSettings({ ...settings, robotsTxt: e.target.value })} className="bg-secondary font-mono text-sm" />
        <div className="flex items-center gap-2">
          <Button disabled={saving} onClick={() => save({ robotsTxt: settings.robotsTxt })}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save robots.txt
          </Button>
          <p className="text-xs text-muted-foreground">A wrong rule here (e.g. <code>Disallow: /</code>) can remove the whole site from Google.</p>
        </div>
      </section>
    </div>
  )
}
