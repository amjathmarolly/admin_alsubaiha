"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Save, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Img { url: string; product: string; slug: string; alt: string }

export function ImagesTab() {
  const { toast } = useToast()
  const [images, setImages] = useState<Img[]>([])
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [onlyMissing, setOnlyMissing] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/seo/images")
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Failed")
      setImages(d.images)
      setEdits({})
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])
  useEffect(() => { load() }, [load])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return images.filter((i) => (!q || i.product.toLowerCase().includes(q)) && (!onlyMissing || !i.alt || i.url in edits))
  }, [images, search, onlyMissing, edits])

  const dirty = Object.keys(edits).length

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/seo/images", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: Object.entries(edits).map(([url, alt]) => ({ url, alt })) }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Failed")
      toast({ title: "Alt text saved", description: `${dirty} image(s) updated.` })
      load()
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const missing = images.filter((i) => !i.alt).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className="bg-secondary pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} /> Only missing alt text ({missing})
        </label>
        <Button className="ml-auto" onClick={save} disabled={!dirty || saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save {dirty ? `(${dirty})` : ""}
        </Button>
      </div>
      <Card><CardContent className="p-0">
        {loading ? <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          : shown.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No images to show.</p> : (
          <ul className="divide-y">
            {shown.slice(0, 200).map((i) => (
              <li key={i.url} className="flex items-center gap-4 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.url} alt="" className="h-14 w-14 shrink-0 rounded-md border object-cover" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium">{i.product}</p>
                  <Input
                    value={edits[i.url] ?? i.alt}
                    onChange={(e) => setEdits({ ...edits, [i.url]: e.target.value })}
                    placeholder="Describe the image, e.g. “Grey three-seater sofa in a living room”"
                    maxLength={255}
                    className="h-9 bg-secondary"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>
      {shown.length > 200 && <p className="text-xs text-muted-foreground">Showing the first 200. Use search to narrow down.</p>}
      <p className="text-xs text-muted-foreground">Alt text is published to the website through <code>/api/seo/site</code> (<code>imageAlt</code>, keyed by image URL).</p>
    </div>
  )
}
