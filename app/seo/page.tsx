"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { BulkTools } from "@/components/seo/bulk-tools"
import { SocialPreview } from "@/components/seo/social-preview"
import { AuditTab } from "@/components/seo/audit-tab"
import { ImagesTab } from "@/components/seo/images-tab"
import { RedirectsTab } from "@/components/seo/redirects-tab"
import { NotFoundTab } from "@/components/seo/not-found-tab"
import { SitemapTab } from "@/components/seo/sitemap-tab"
import { StructuredDataTab } from "@/components/seo/structured-data-tab"
import { TrackingTab } from "@/components/seo/tracking-tab"
import { SearchConsoleTab } from "@/components/seo/search-console-tab"
import { Loader2, Search, Upload, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type EntityType = "page" | "product" | "category" | "project" | "designer"

const TABS: { type: EntityType; label: string; noun: string }[] = [
  { type: "page", label: "Pages", noun: "pages" },
  { type: "product", label: "Products", noun: "products" },
  { type: "category", label: "Categories", noun: "categories" },
  { type: "project", label: "Projects", noun: "projects" },
  { type: "designer", label: "Designers", noun: "designers" },
]

const TOOL_TABS = [
  { value: "audit", label: "Health & duplicates" },
  { value: "images", label: "Image alt text" },
  { value: "redirects", label: "Redirects" },
  { value: "404s", label: "404 monitor" },
  { value: "sitemap", label: "Sitemap & robots" },
  { value: "schema", label: "Structured data" },
  { value: "tracking", label: "Tracking IDs" },
  { value: "gsc", label: "Search Console" },
]

interface SeoOverride {
  title: string | null
  description: string | null
  ogImage: string | null
  canonicalUrl: string | null
  noindex: boolean
  twitterCard: "summary" | "summary_large_image" | null
  twitterImage: string | null
  h1: string | null
  intro: string | null
}

interface Entry {
  key: string
  label: string
  path?: string
  seo: SeoOverride | null
  defaults?: { title: string | null; description: string | null; image: string | null }
}

const TITLE_MAX = 60
const DESC_MAX = 160

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={`text-xs ${value.length > max ? "text-destructive" : "text-muted-foreground"}`}>
      {value.length}/{max}
    </span>
  )
}

function EntryList({ type }: { type: EntityType }) {
  const { toast } = useToast()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Entry | null>(null)
  const [form, setForm] = useState({ title: "", description: "", ogImage: "", canonicalUrl: "", noindex: false, twitterCard: "summary_large_image" as "summary" | "summary_large_image", twitterImage: "", h1: "", intro: "" })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/seo/entries?type=${type}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setEntries(data.entries)
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [type, toast])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? entries.filter((e) => e.label.toLowerCase().includes(q) || e.key.toLowerCase().includes(q)) : entries
  }, [entries, search])

  const openEditor = (entry: Entry) => {
    setEditing(entry)
    setForm({
      title: entry.seo?.title ?? "",
      description: entry.seo?.description ?? "",
      ogImage: entry.seo?.ogImage ?? "",
      canonicalUrl: entry.seo?.canonicalUrl ?? "",
      noindex: entry.seo?.noindex ?? false,
      twitterCard: entry.seo?.twitterCard ?? "summary_large_image",
      twitterImage: entry.seo?.twitterImage ?? "",
      h1: entry.seo?.h1 ?? "",
      intro: entry.seo?.intro ?? "",
    })
  }

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch("/api/seo/entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, key: editing.key, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save")
      toast({
        title: "SEO saved",
        description: data.revalidated
          ? "The website has been refreshed."
          : "Saved. The website will pick it up within about a minute.",
      })
      setEditing(null)
      load()
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast({ title: "Not an image", description: "Please choose a JPG, PNG or WebP file.", variant: "destructive" })
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok || !data.urls?.[0]) throw new Error(data.error || "Upload failed")
      // Social apps need an absolute, public URL
      const base = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "")
      setForm((f) => ({ ...f, ogImage: `${base}${data.urls[0]}` }))
    } catch (error) {
      toast({ title: "Upload failed", description: (error as Error).message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const previewTitle = form.title || editing?.label || ""
  const previewUrl = editing ? `alsubaiha.ae${type === "page" ? (editing.key === "/" ? "" : editing.key) : editing.path ?? ""}` : ""

  return (
    <>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${TABS.find((t) => t.type === type)?.noun ?? "entries"}`}
          className="bg-secondary pl-9"
        />
      </div>

      <BulkTools type={type} entries={entries} onDone={load} />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-10">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nothing found.</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((entry) => (
                <li key={entry.key} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{entry.label}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {entry.seo?.title || "Using automatic title and description"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {entry.seo?.noindex && <Badge variant="destructive">noindex</Badge>}
                    <Badge variant={entry.seo ? "default" : "secondary"}>{entry.seo ? "Custom" : "Auto"}</Badge>
                    <Button variant="outline" size="sm" onClick={() => openEditor(entry)}>
                      Edit
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>SEO: {editing?.label}</DialogTitle>
            <DialogDescription>Leave a field empty to use the automatic value.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border bg-secondary/40 p-3">
              <p className="truncate text-xs text-muted-foreground">{previewUrl}</p>
              <p className="truncate text-base font-medium text-blue-600">{previewTitle}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {form.description || "The automatic description will be used."}
              </p>
            </div>

            <SocialPreview
              url={previewUrl}
              title={previewTitle}
              description={form.description || editing?.defaults?.description || ""}
              image={form.ogImage || editing?.defaults?.image || ""}
              twitterCard={form.twitterCard}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="seoTitle">Title</Label>
                <Counter value={form.title} max={TITLE_MAX} />
              </div>
              <Input id="seoTitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-secondary" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="seoDesc">Description</Label>
                <Counter value={form.description} max={DESC_MAX} />
              </div>
              <Textarea id="seoDesc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-secondary" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="seoH1">Main heading (H1)</Label>
                <Counter value={form.h1} max={70} />
              </div>
              <Input id="seoH1" value={form.h1} onChange={(e) => setForm({ ...form, h1: e.target.value })} placeholder="The visible heading on the page. Leave empty to use the website's default." className="bg-secondary" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoIntro">Intro text</Label>
              <Textarea id="seoIntro" rows={3} value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} placeholder="One or two sentences under the heading, with the main keywords. Leave empty to use the description." className="bg-secondary" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoImage">Social share image (OG image)</Label>
              <div className="flex gap-2">
                <label className="inline-flex">
                  <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { handleImageUpload(e.target.files?.[0]); e.target.value = "" }} />
                  <span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-secondary">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {form.ogImage ? "Change" : "Upload"}
                  </span>
                </label>
                {form.ogImage && (
                  <Button type="button" variant="outline" onClick={() => setForm({ ...form, ogImage: "" })}>
                    <X className="mr-1 h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
              <Input id="seoImage" value={form.ogImage} onChange={(e) => setForm({ ...form, ogImage: e.target.value })} placeholder="…or paste an image URL (1200×630 recommended)" className="bg-secondary" />
              {form.ogImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.ogImage} alt="Share preview" className="aspect-[1200/630] w-full rounded-md border object-cover" />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="seoTwCard">X / Twitter card</Label>
                <select
                  id="seoTwCard"
                  value={form.twitterCard}
                  onChange={(e) => setForm({ ...form, twitterCard: e.target.value as "summary" | "summary_large_image" })}
                  className="h-10 w-full rounded-md border bg-secondary px-3 text-sm"
                >
                  <option value="summary_large_image">Large image</option>
                  <option value="summary">Small square image</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoTwImage">X / Twitter image (optional)</Label>
                <Input id="seoTwImage" value={form.twitterImage} onChange={(e) => setForm({ ...form, twitterImage: e.target.value })} placeholder="Defaults to the share image" className="bg-secondary" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoCanonical">Canonical URL</Label>
              <Input id="seoCanonical" value={form.canonicalUrl} onChange={(e) => setForm({ ...form, canonicalUrl: e.target.value })} placeholder="Only if this page duplicates another" className="bg-secondary" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Hide from search engines</p>
                <p className="text-sm text-muted-foreground">Adds noindex so Google skips this page.</p>
              </div>
              <Switch checked={form.noindex} onCheckedChange={(checked) => setForm({ ...form, noindex: checked })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function SeoPage() {
  return (
    <DashboardLayout
      title="SEO"
      description="Control the title, description and social preview of every page, product, category, project and designer on the website."
    >
      <Tabs defaultValue="page" className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start bg-secondary">
          {TABS.map((t) => (
            <TabsTrigger key={t.type} value={t.type}>
              {t.label}
            </TabsTrigger>
          ))}
          <span className="mx-1 h-5 w-px bg-border" />
          {TOOL_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.type} value={t.type} className="space-y-4">
            <EntryList type={t.type} />
          </TabsContent>
        ))}
        <TabsContent value="audit"><AuditTab /></TabsContent>
        <TabsContent value="images"><ImagesTab /></TabsContent>
        <TabsContent value="redirects"><RedirectsTab /></TabsContent>
        <TabsContent value="404s"><NotFoundTab /></TabsContent>
        <TabsContent value="sitemap"><SitemapTab /></TabsContent>
        <TabsContent value="schema"><StructuredDataTab /></TabsContent>
        <TabsContent value="tracking"><TrackingTab /></TabsContent>
        <TabsContent value="gsc"><SearchConsoleTab /></TabsContent>
      </Tabs>
    </DashboardLayout>
  )
}
