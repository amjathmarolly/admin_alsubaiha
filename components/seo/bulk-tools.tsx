"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Download, Loader2, Upload, Wand2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { downloadFile, parseCsv, toCsv } from "@/lib/csv"

export interface BulkEntry {
  key: string
  label: string
  seo: { title: string | null; description: string | null; ogImage: string | null; canonicalUrl: string | null; noindex: boolean } | null
}

const HEADERS = ["key", "name", "title", "description", "ogImage", "canonicalUrl", "noindex"]

export function BulkTools({ type, entries, onDone }: { type: string; entries: BulkEntry[]; onDone: () => void }) {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [tplOpen, setTplOpen] = useState(false)
  const [titleTpl, setTitleTpl] = useState("{name} | Al Subaiha")
  const [descTpl, setDescTpl] = useState("")
  const [onlyEmpty, setOnlyEmpty] = useState(true)

  const send = async (items: Record<string, unknown>[]) => {
    setBusy(true)
    try {
      const res = await fetch("/api/seo/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, items }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Bulk update failed")
      toast({
        title: `${data.updated} updated`,
        description: data.skipped?.length ? `${data.skipped.length} row(s) skipped (unknown key or bad URL): ${data.skipped.slice(0, 3).join(", ")}…` : undefined,
      })
      onDone()
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const exportCsv = () => {
    const rows = [
      HEADERS,
      ...entries.map((e) => [e.key, e.label, e.seo?.title ?? "", e.seo?.description ?? "", e.seo?.ogImage ?? "", e.seo?.canonicalUrl ?? "", e.seo?.noindex ? "yes" : ""]),
    ]
    downloadFile(`seo-${type}.csv`, toCsv(rows))
  }

  const importCsv = async (file: File | undefined) => {
    if (!file) return
    const rows = parseCsv(await file.text())
    if (rows.length < 2) return toast({ title: "Empty file", variant: "destructive" })
    const head = rows[0].map((h) => h.trim())
    if (!head.includes("key")) return toast({ title: "Missing 'key' column", description: "Export first and edit that file.", variant: "destructive" })
    const idx = (n: string) => head.indexOf(n)
    const items = rows.slice(1).map((r) => {
      const it: Record<string, unknown> = { key: r[idx("key")] }
      for (const f of ["title", "description", "ogImage", "canonicalUrl"]) if (idx(f) >= 0) it[f] = r[idx(f)] ?? ""
      if (idx("noindex") >= 0) it.noindex = /^(yes|true|1|y)$/i.test((r[idx("noindex")] ?? "").trim())
      return it
    })
    await send(items)
  }

  const applyTemplate = async () => {
    const fill = (t: string, e: BulkEntry) => t.replaceAll("{name}", e.label.replace(/^.*› /, ""))
    const items = entries
      .map((e) => {
        const it: Record<string, unknown> = { key: e.key }
        if (titleTpl.trim() && !(onlyEmpty && e.seo?.title)) it.title = fill(titleTpl, e)
        if (descTpl.trim() && !(onlyEmpty && e.seo?.description)) it.description = fill(descTpl, e)
        return it
      })
      .filter((it) => Object.keys(it).length > 1)
    if (!items.length) return toast({ title: "Nothing to change", description: "Every entry already has these fields set." })
    setTplOpen(false)
    await send(items)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setTplOpen(true)} disabled={busy}>
          <Wand2 className="mr-2 h-4 w-4" /> Apply template
        </Button>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Import CSV
        </Button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { importCsv(e.target.files?.[0]); e.target.value = "" }} />
      </div>

      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply template to {entries.length} {type} entries</DialogTitle>
            <DialogDescription>Use <code>{"{name}"}</code> where the item's name should go. Leave a box empty to leave that field alone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title template</Label>
              <Input value={titleTpl} onChange={(e) => setTitleTpl(e.target.value)} className="bg-secondary" />
            </div>
            <div className="space-y-2">
              <Label>Description template</Label>
              <Textarea rows={3} value={descTpl} onChange={(e) => setDescTpl(e.target.value)} placeholder="Shop {name} at Al Subaiha. Free delivery across the UAE." className="bg-secondary" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm">Only fill entries that are still empty</p>
              <Switch checked={onlyEmpty} onCheckedChange={setOnlyEmpty} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTplOpen(false)}>Cancel</Button>
            <Button onClick={applyTemplate}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
