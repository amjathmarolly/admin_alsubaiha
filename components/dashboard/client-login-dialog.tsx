"use client"

import * as React from "react"
import { Check, Copy, ExternalLink, KeyRound, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Project {
  id: string
  name: string
  jobOrderNo: string | null
  group: string | null
  totalValue: number
  received: number
  balance: number
  expectedDelivery: string | null
  trackerUrl: string | null
}
interface LoginInfo {
  id: string
  name: string
  email: string | null
  phone: string | null
  canSignIn: boolean
  waitingForFirstSignIn: boolean
  temporaryPassword: string | null
  message: string | null
  projects: Project[]
}

const aed = (n: number) => `AED ${Math.round(n).toLocaleString("en-AE")}`

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
          /* text is on screen to select */
        }
      }}
    >
      {done ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
      {done ? "Copied" : label}
    </Button>
  )
}

/** A client's mobile, website sign-in (temporary password until they change it) and projects. */
export function ClientLoginDialog({
  customerId,
  open,
  onOpenChange,
}: {
  customerId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [info, setInfo] = React.useState<LoginInfo | null>(null)
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!customerId) return
    setError("")
    setInfo(null)
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(customerId)}/login`, { credentials: "include", cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not load the client's sign-in")
      setInfo(data)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [customerId])

  React.useEffect(() => {
    if (open) load()
  }, [open, load])

  const newPassword = async () => {
    if (!info) return
    const what = info.canSignIn ? "Their current password stops working." : "This lets them sign in on the website."
    if (!window.confirm(`Give ${info.name} a new temporary password? ${what}`)) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/client-logins/reset", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: info.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not set a new password")
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const totals = (info?.projects ?? []).reduce(
    (t, p) => ({ value: t.value + p.totalValue, received: t.received + p.received, balance: t.balance + p.balance }),
    { value: 0, received: 0, balance: 0 }
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{info?.name ?? "Client sign-in"}</DialogTitle>
          <DialogDescription>Website sign-in and projects from Monday.com.</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!info && !error && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {info && (
          <div className="space-y-5 text-sm">
            <div className="grid gap-1">
              <p>
                <span className="text-muted-foreground">Mobile:</span> {info.phone || "none"}
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span> {info.email || "none"}
              </p>
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">Website sign-in:</span>
                {!info.canSignIn ? (
                  <Badge variant="secondary">No password yet</Badge>
                ) : info.waitingForFirstSignIn ? (
                  <Badge>Temporary password, not used yet</Badge>
                ) : (
                  <Badge variant="secondary">Client has set their own password</Badge>
                )}
              </p>
            </div>

            {info.temporaryPassword && (
              <div className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    Temporary password: <span className="font-mono">{info.temporaryPassword}</span>
                  </p>
                  <div className="flex gap-2">
                    {info.message && <CopyButton text={info.message} label="Copy message" />}
                    <CopyButton text={info.temporaryPassword} label="Copy password" />
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Visible only until the client signs in and chooses their own password.
                </p>
              </div>
            )}
            {info.canSignIn && !info.temporaryPassword && (
              <p className="text-xs text-muted-foreground">
                The client&apos;s own password is never shown. If they forgot it, give them a new temporary one.
              </p>
            )}
            <Button size="sm" onClick={newPassword} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              New temporary password
            </Button>

            <div>
              <p className="mb-2 font-medium">
                Projects ({info.projects.length})
                {info.projects.length > 0 &&
                  ` · ${aed(totals.value)} total · ${aed(totals.received)} received · ${aed(totals.balance)} balance`}
              </p>
              <div className="divide-y rounded-md border">
                {info.projects.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {p.name}
                        {p.jobOrderNo ? <span className="text-muted-foreground"> · Job {p.jobOrderNo}</span> : null}
                      </p>
                      <p className="text-muted-foreground">
                        {p.group || "No group"}
                        {p.expectedDelivery ? ` · delivery ${p.expectedDelivery}` : ""}
                      </p>
                      <p>
                        {aed(p.totalValue)} · received {aed(p.received)} ·{" "}
                        <span className={p.balance > 0 ? "font-medium text-amber-500" : ""}>balance {aed(p.balance)}</span>
                      </p>
                    </div>
                    {p.trackerUrl && (
                      <Button asChild size="sm" variant="outline">
                        <a href={p.trackerUrl} target="_blank" rel="noopener noreferrer">
                          Tracker <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
                {!info.projects.length && <p className="p-3 text-muted-foreground">No projects linked to this mobile number.</p>}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
