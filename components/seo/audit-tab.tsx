"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Issue { code: string; message: string; severity: "error" | "warning" | "info" }
interface Result { type: string; key: string; label: string; path: string; score: number; issues: Issue[] }

const FILTERS = [
  { id: "all", label: "All" },
  { id: "attention", label: "Needs attention (<70)" },
  { id: "no_description", label: "No description" },
  { id: "no_image", label: "No share image" },
  { id: "duplicates", label: "Duplicates" },
]

const scoreColor = (s: number) => (s >= 85 ? "text-green-600" : s >= 70 ? "text-amber-600" : "text-destructive")

export function AuditTab() {
  const { toast } = useToast()
  const [data, setData] = useState<{ average: number; results: Result[] } | null>(null)
  const [filter, setFilter] = useState("attention")
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/seo/audit")
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || "Failed")
        setData(d)
      })
      .catch((e) => toast({ title: "Error", description: e.message, variant: "destructive" }))
  }, [toast])

  const rows = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.results
      .filter((r) => {
        if (q && !r.label.toLowerCase().includes(q)) return false
        if (filter === "attention") return r.score < 70
        if (filter === "duplicates") return r.issues.some((i) => i.code.startsWith("duplicate"))
        if (filter === "all") return true
        return r.issues.some((i) => i.code === filter)
      })
      .sort((a, b) => a.score - b.score)
  }, [data, filter, search])

  if (!data) return <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>

  const countWith = (pred: (r: Result) => boolean) => data.results.filter(pred).length

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Average score", value: `${data.average}/100`, cls: scoreColor(data.average) },
          { label: "Need attention", value: countWith((r) => r.score < 70), cls: "" },
          { label: "No description", value: countWith((r) => r.issues.some((i) => i.code === "no_description")), cls: "" },
          { label: "Duplicate titles/descriptions", value: countWith((r) => r.issues.some((i) => i.code.startsWith("duplicate"))), cls: "" },
        ].map((c) => (
          <Card key={c.label}><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p className={`text-2xl font-semibold ${c.cls}`}>{c.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="bg-secondary pl-9" />
        </div>
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <Card><CardContent className="p-0">
        {rows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nothing matches this filter. 🎉</p> : (
          <ul className="divide-y">
            {rows.slice(0, 300).map((r) => (
              <li key={`${r.type}:${r.key}`} className="flex items-start gap-4 p-4">
                <span className={`w-12 shrink-0 text-lg font-semibold ${scoreColor(r.score)}`}>{r.score}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.label} <span className="text-xs font-normal capitalize text-muted-foreground">· {r.type}</span></p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {r.issues.filter((i) => i.severity !== "info").map((i) => (
                      <Badge key={i.code} variant={i.severity === "error" ? "destructive" : "secondary"} className="font-normal">{i.message}</Badge>
                    ))}
                    {r.issues.every((i) => i.severity === "info") && <span className="text-sm text-muted-foreground">No problems</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>
      {rows.length > 300 && <p className="text-xs text-muted-foreground">Showing the 300 lowest scores.</p>}
      <p className="text-xs text-muted-foreground">Fix entries in their own tab (Products, Categories…). Score deducts for missing/too long/too short titles and descriptions, missing share image and duplicates.</p>
    </div>
  )
}
