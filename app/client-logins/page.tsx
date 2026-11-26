"use client"

import * as React from "react"
import { Loader2, RefreshCw, Copy, Check, AlertTriangle, KeyRound } from "lucide-react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Planned {
  phone: string
  phoneDisplay: string
  name: string
  email: string | null
  total: number
  firstOrderDate: string | null
  itemCount: number
  action: "new" | "login" | "sync"
  customerId: string | null
  customerName: string | null
}
interface DoubtRow {
  itemId: string
  name: string
  phoneRaw: string
  email: string
  total: number
  createdAt: string
}
interface Plan {
  ready: Planned[]
  doubtful: { reason: string; rows: DoubtRow[] }[]
  boardItems: number
}
interface Created {
  customerId: string
  name: string
  phoneDisplay: string
  email: string | null
  password: string
  message: string
}

const aed = (n: number) => `AED ${Math.round(n).toLocaleString("en-AE")}`
const ACTION_LABEL: Record<Planned["action"], string> = {
  new: "New account",
  login: "Existing customer, add login",
  sync: "Has login, update total",
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = React.useState(false)
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 2000)
        } catch {
          /* clipboard blocked: the text is on screen to select */
        }
      }}
    >
      {done ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
      {done ? "Copied" : label}
    </Button>
  )
}

export default function ClientLoginsPage() {
  const [plan, setPlan] = React.useState<Plan | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [saving, setSaving] = React.useState(false)
  const [created, setCreated] = React.useState<Created[]>([])
  const [summary, setSummary] = React.useState<{ synced: number; skipped: string[] } | null>(null)

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/client-logins", { credentials: "include", cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not read the client list")
      setPlan(data)
      setSelected(new Set())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const create = async () => {
    if (!selected.size) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/client-logins", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones: [...selected] }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Nothing was created")
      setCreated((c) => [...data.created, ...c])
      setSummary({ synced: data.synced, skipped: data.skipped })
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const resetPassword = async (r: Planned) => {
    if (!r.customerId) return
    if (!window.confirm(`Give ${r.name} a new temporary password? Their current password stops working.`)) return
    setError("")
    try {
      const res = await fetch("/api/client-logins/reset", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: r.customerId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not set a new password")
      setCreated((c) => [data, ...c.filter((x) => x.customerId !== data.customerId)])
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const toggle = (phone: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(phone)) n.delete(phone)
      else n.add(phone)
      return n
    })

  const ready = plan?.ready ?? []
  const allChosen = ready.length > 0 && selected.size === ready.length

  return (
    <DashboardLayout
      title="Client Logins"
      description="Website member accounts for clients on the Monday.com client board, one per mobile number."
      requiredPermission="manage_customers"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
            <CardDescription>
              1. Preview reads the client board; nothing changes yet. 2. Tick the clients and create their logins. 3. Each new
              login gets its own temporary password, shown once below with a message to copy into WhatsApp or email.
              Nothing is sent automatically. Clients choose their own password at first sign-in. Running this again never
              changes an existing password; it only updates totals and tiers.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={load} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {plan ? "Refresh preview" : "Preview from Monday.com"}
            </Button>
            {plan && (
              <Button onClick={create} disabled={saving || !selected.size} variant="default">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Create / update {selected.size} selected
              </Button>
            )}
          </CardContent>
          {error && <p className="px-6 pb-4 text-sm text-destructive">{error}</p>}
        </Card>

        {created.length > 0 && (
          <Card className="border-amber-500/50">
            <CardHeader>
              <CardTitle>New temporary passwords ({created.length})</CardTitle>
              <CardDescription>
                Shown only now. Copy each message before leaving this page. If one is lost, use "New temporary password"
                on that client.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {created.map((c) => (
                <div key={c.customerId} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {c.phoneDisplay}
                        {c.email ? ` · ${c.email}` : ""} · password <span className="font-mono">{c.password}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <CopyButton text={c.message} label="Copy message" />
                      <CopyButton text={c.password} label="Copy password" />
                    </div>
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap rounded bg-muted p-2 text-xs">{c.message}</pre>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {summary && (summary.synced > 0 || summary.skipped.length > 0) && (
          <Card>
            <CardContent className="pt-6 text-sm">
              {summary.synced > 0 && <p>{summary.synced} existing login(s) had their total and tier updated.</p>}
              {summary.skipped.map((s) => (
                <p key={s} className="text-destructive">
                  Skipped: {s}
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        {plan && (
          <Card>
            <CardHeader>
              <CardTitle>
                Ready ({ready.length} clients from {plan.boardItems} board items)
              </CardTitle>
              <CardDescription>Total is the sum of the client's items on the board; first order is the earliest item.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-center gap-2 text-sm">
                <Checkbox
                  checked={allChosen}
                  onCheckedChange={() => setSelected(allChosen ? new Set() : new Set(ready.map((r) => r.phone)))}
                />
                <span>Select all</span>
              </div>
              <div className="divide-y rounded-md border">
                {ready.map((r) => (
                  <label key={r.phone} className="flex cursor-pointer items-start gap-3 p-3 text-sm hover:bg-muted/50">
                    <Checkbox checked={selected.has(r.phone)} onCheckedChange={() => toggle(r.phone)} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{r.name}</span>
                        <Badge variant={r.action === "sync" ? "secondary" : "default"}>{ACTION_LABEL[r.action]}</Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {r.phoneDisplay} · {r.email ?? "no email"} · {aed(r.total)} · {r.itemCount} item(s)
                        {r.firstOrderDate ? ` · first order ${r.firstOrderDate}` : ""}
                        {r.customerName && r.customerName !== r.name ? ` · saved as "${r.customerName}"` : ""}
                      </p>
                    </div>
                    {r.action === "sync" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault()
                          resetPassword(r)
                        }}
                      >
                        New temporary password
                      </Button>
                    )}
                  </label>
                ))}
                {!ready.length && <p className="p-3 text-sm text-muted-foreground">Nobody is ready.</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {plan && plan.doubtful.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> To check first ({plan.doubtful.length})
              </CardTitle>
              <CardDescription>
                Not created. Fix the number, name or email on Monday.com (or in Customers), then refresh the preview.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {plan.doubtful.map((d, i) => (
                <div key={i} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{d.reason}</p>
                  {d.rows.map((r) => (
                    <p key={r.itemId} className="text-muted-foreground">
                      {r.name || "(no name)"} · {r.phoneRaw || "no number"} · {r.email || "no email"} · {aed(r.total)}
                    </p>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
