"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GoogleButton } from "@/components/google-button"
import { useToast } from "@/hooks/use-toast"

/** Settings -> Security: connect the signed-in staff account to a Google account. */
export function GoogleLinkCard() {
  const { toast } = useToast()
  const [linked, setLinked] = React.useState<string | null>(null)
  const [configured, setConfigured] = React.useState<boolean | null>(null)

  const load = React.useCallback(() => {
    fetch("/api/auth/google", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setConfigured(Boolean(d.clientId))
        setLinked(d.linkedEmail || null)
      })
      .catch(() => setConfigured(false))
  }, [])
  React.useEffect(load, [load])

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Not saved")
    return data
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in with Google</CardTitle>
        <CardDescription>
          Connect your Google account to sign in to the admin with one click. Only a Google account connected here can sign in
          to this account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {configured === false && (
          <p className="text-muted-foreground">
            Google sign-in is not switched on yet: add GOOGLE_CLIENT_ID in the server&apos;s environment variables.
          </p>
        )}
        {configured && linked && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>
              Connected to <span className="font-medium">{linked}</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await post({ mode: "unlink" })
                  setLinked(null)
                  toast({ title: "Google account disconnected" })
                } catch (e) {
                  toast({ title: "Not saved", description: (e as Error).message, variant: "destructive" })
                }
              }}
            >
              Disconnect
            </Button>
          </div>
        )}
        {configured && !linked && (
          <GoogleButton
            text="continue_with"
            onCredential={async (credential) => {
              try {
                const d = await post({ credential, mode: "link" })
                setLinked(d.linkedEmail)
                toast({ title: "Google account connected", description: "Next time, use Sign in with Google." })
              } catch (e) {
                toast({ title: "Not connected", description: (e as Error).message, variant: "destructive" })
              }
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}
