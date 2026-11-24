"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowRight, Loader2, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Item { path: string; hits: number; referrer: string | null; lastSeen: string }

export function NotFoundTab() {
  const { toast } = useToast()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/seo/404")
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Failed")
      setItems(d.items)
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])
  useEffect(() => { load() }, [load])

  const redirect = async (path: string) => {
    try {
      const res = await fetch("/api/seo/redirects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: path, to: target[path], status: 301 }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Failed")
      toast({ title: "Redirect created", description: `${path} → ${target[path]}` })
      load()
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    }
  }
  const clear = async (path?: string) => {
    await fetch(`/api/seo/404${path ? `?path=${encodeURIComponent(path)}` : ""}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Pages visitors tried to open that don't exist, most requested first. Add a redirect for the useful ones.</p>
        {items.length > 0 && <Button variant="outline" size="sm" onClick={() => clear()}>Clear all</Button>}
      </div>
      <Card><CardContent className="p-0">
        {loading ? <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
          : items.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No 404s recorded. (The website must report them — see the note below.)</p> : (
          <ul className="divide-y">
            {items.map((i) => (
              <li key={i.path} className="flex flex-wrap items-center gap-3 p-4">
                <span className="w-12 shrink-0 text-lg font-semibold">{i.hits}</span>
                <div className="min-w-0 flex-1">
                  <code className="block truncate text-sm">{i.path}</code>
                  {i.referrer && <p className="truncate text-xs text-muted-foreground">from {i.referrer}</p>}
                </div>
                <Input value={target[i.path] ?? ""} onChange={(e) => setTarget({ ...target, [i.path]: e.target.value })} placeholder="Redirect to /…" className="h-9 w-48 bg-secondary" />
                <Button size="sm" variant="outline" disabled={!target[i.path]} onClick={() => redirect(i.path)}><ArrowRight className="mr-1 h-4 w-4" /> Redirect</Button>
                <Button size="icon" variant="ghost" aria-label="Dismiss" onClick={() => clear(i.path)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>
      <p className="text-xs text-muted-foreground">
        To record 404s, the website's not-found handler should <code>POST /api/seo/404</code> with <code>{"{ path, referrer }"}</code> and the header <code>x-revalidate-secret</code> (same secret as cache refresh).
      </p>
    </div>
  )
}
