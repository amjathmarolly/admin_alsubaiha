"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ArrowRight, Loader2, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Redirect { id: string; from: string; to: string; status: number; active: boolean }

export function RedirectsTab({ initialFrom = "" }: { initialFrom?: string }) {
  const { toast } = useToast()
  const [items, setItems] = useState<Redirect[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState("")
  const [status, setStatus] = useState<301 | 302>(301)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/seo/redirects")
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Failed")
      setItems(d.redirects)
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])
  useEffect(() => { load() }, [load])

  const call = async (method: string, url: string, body?: unknown) => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })
    const d = await res.json()
    if (!res.ok) throw new Error(d.error || "Failed")
    return d
  }

  const add = async () => {
    setSaving(true)
    try {
      await call("POST", "/api/seo/redirects", { from, to, status })
      toast({ title: "Redirect saved" })
      setFrom(""); setTo("")
      load()
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card><CardContent className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">Send visitors (and Google) from an old URL to a new one. Use <b>301</b> for permanent moves, <b>302</b> for temporary.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="/old-page" className="max-w-xs bg-secondary" />
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="/new-page or https://…" className="max-w-xs bg-secondary" />
          <select value={status} onChange={(e) => setStatus(Number(e.target.value) as 301 | 302)} className="h-10 rounded-md border bg-secondary px-3 text-sm">
            <option value={301}>301 permanent</option>
            <option value={302}>302 temporary</option>
          </select>
          <Button onClick={add} disabled={saving || !from || !to}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Add
          </Button>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        {loading ? <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          : items.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No redirects yet.</p> : (
          <ul className="divide-y">
            {items.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-4">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm">
                  <code className="truncate rounded bg-secondary px-1.5 py-0.5">{r.from}</code>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <code className="truncate rounded bg-secondary px-1.5 py-0.5">{r.to}</code>
                  <Badge variant="secondary">{r.status}</Badge>
                </div>
                <Switch checked={r.active} onCheckedChange={async (a) => { try { await call("PATCH", "/api/seo/redirects", { id: r.id, active: a }); load() } catch (e) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }) } }} />
                <Button variant="ghost" size="icon" aria-label="Delete" onClick={async () => { try { await call("DELETE", `/api/seo/redirects?id=${r.id}`); load() } catch (e) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }) } }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>
      <p className="text-xs text-muted-foreground">The website applies active redirects from <code>/api/seo/site</code> (<code>redirects</code>).</p>
    </div>
  )
}
