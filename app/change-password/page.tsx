"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Box, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"

/**
 * Shown after signing in with a starter password. That password was published
 * with the old code, so nothing else in the admin opens until a new one is set.
 */
export default function ChangePasswordPage() {
  const router = useRouter()
  const { user, isLoading, passwordChanged, logout } = useAuth()
  const [current, setCurrent] = React.useState("")
  const [next, setNext] = React.useState("")
  const [repeat, setRepeat] = React.useState("")
  const [error, setError] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!isLoading && user && !user.mustChangePassword) router.replace("/")
  }, [user, isLoading, router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (next.length < 10) return setError("Use at least 10 characters.")
    if (next !== repeat) return setError("The two new passwords are not the same.")
    setSaving(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Password not changed. Please try again.")
        return
      }
      passwordChanged()
      router.replace("/")
    } catch {
      setError("Could not reach the server. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Box className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Choose a new password</CardTitle>
          <CardDescription>
            The password you signed in with is an old starter password. Set your own to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Password you just used</Label>
              <Input id="current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next">New password</Label>
              <Input id="next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
              <p className="text-xs text-muted-foreground">At least 10 characters. Not your email name.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="repeat">New password again</Label>
              <Input id="repeat" type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save and continue
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={logout}>
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
