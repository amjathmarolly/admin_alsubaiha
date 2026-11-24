"use client"

/**
 * A small list + edit dialog used by Admin -> Factory Videos and Admin -> FAQ.
 * Each page describes its fields; this handles loading, saving and deleting.
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export interface FieldDef {
  key: string
  label: string
  type?: "text" | "textarea" | "number" | "datetime" | "image"
  placeholder?: string
  hint?: string
  required?: boolean
  rows?: number
  /** Shown as two columns on wide screens. */
  half?: boolean
}

export type Item = Record<string, any> & { id: string; status?: "active" | "draft" }

interface Props {
  endpoint: string
  listKey: string
  noun: string
  fields: FieldDef[]
  /** Values for a new item. */
  blank: Record<string, any>
  /** Item -> form values (e.g. arrays to text). */
  toForm?: (item: Item) => Record<string, any>
  /** Form values -> request body. */
  toBody?: (form: Record<string, any>) => Record<string, any>
  renderRow: (item: Item) => React.ReactNode
  searchText: (item: Item) => string
  intro?: React.ReactNode
}

export function ListEditor({ endpoint, listKey, noun, fields, blank, toForm, toBody, renderRow, searchText, intro }: Props) {
  const { toast } = useToast()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Item | null>(null)
  const [form, setForm] = useState<Record<string, any>>(blank)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${endpoint}?all=1`, { cache: "no-store" })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Failed to load")
      setItems(d[listKey] ?? [])
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [endpoint, listKey, toast])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? items.filter((i) => searchText(i).toLowerCase().includes(q)) : items
  }, [items, search, searchText])

  const open = (item: Item | null) => {
    setEditing(item ?? ({ id: "" } as Item))
    setForm(item ? (toForm ? toForm(item) : { ...item }) : { ...blank })
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const body = toBody ? toBody(form) : form
      const res = await fetch(editing.id ? `${endpoint}/${editing.id}` : endpoint, {
        method: editing.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Failed to save")
      toast({ title: "Saved", description: d.revalidated ? "The website has been refreshed." : "The website will show it within a few minutes." })
      setEditing(null)
      load()
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item: Item) => {
    if (!window.confirm(`Delete this ${noun}? This can't be undone.`)) return
    setDeleting(item.id)
    try {
      const res = await fetch(`${endpoint}/${item.id}`, { method: "DELETE" })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Failed to delete")
      setItems((list) => list.filter((i) => i.id !== item.id))
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      {intro}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="bg-secondary pl-9" />
        </div>
        <Button onClick={() => open(null)}>
          <Plus className="mr-2 h-4 w-4" /> Add {noun}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nothing here yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">{renderRow(item)}</div>
                {item.status === "draft" && <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">Hidden</span>}
                <Button variant="ghost" size="icon" onClick={() => open(item)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(item)} disabled={deleting === item.id} aria-label="Delete">
                  {deleting === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? `Edit ${noun}` : `Add ${noun}`}</DialogTitle>
            <DialogDescription>Saved changes appear on the website within a few minutes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={`space-y-1.5 ${f.half ? "" : "sm:col-span-2"}`}>
                <Label htmlFor={`f-${f.key}`}>
                  {f.label}
                  {f.required && <span className="text-destructive"> *</span>}
                </Label>
                {f.type === "image" ? (
                  <ImageField id={`f-${f.key}`} value={form[f.key] ?? ""} onChange={(v) => setForm({ ...form, [f.key]: v })} />
                ) : f.type === "textarea" ? (
                  <Textarea id={`f-${f.key}`} rows={f.rows ?? 3} value={form[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="bg-secondary" />
                ) : (
                  <Input
                    id={`f-${f.key}`}
                    type={f.type === "number" ? "number" : f.type === "datetime" ? "datetime-local" : "text"}
                    value={form[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="bg-secondary"
                  />
                )}
                {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
              </div>
            ))}
            <div className="flex items-center justify-between sm:col-span-2">
              <div>
                <p className="font-medium">Show on the website</p>
                <p className="text-sm text-muted-foreground">Turn off to keep it as a hidden draft.</p>
              </div>
              <Switch checked={form.status !== "draft"} onCheckedChange={(c) => setForm({ ...form, status: c ? "active" : "draft" })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Image picker: upload a file (saved by /api/upload, kept across deploys) or paste a link. */
function ImageField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.urls?.[0]) throw new Error(d.error || "Upload failed")
      onChange(d.urls[0])
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-secondary">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-muted-foreground">No photo</span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <Input id={id} value={value} placeholder="/uploads/... or https://..." onChange={(e) => onChange(e.target.value)} className="bg-secondary" />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
            <label className="cursor-pointer">
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Upload photo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = "" }} />
            </label>
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
