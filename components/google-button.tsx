"use client"

import * as React from "react"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void
          renderButton: (el: HTMLElement, o: Record<string, unknown>) => void
        }
      }
    }
  }
}

let scriptPromise: Promise<void> | null = null
function loadGoogle(): Promise<void> {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const s = document.createElement("script")
    s.src = "https://accounts.google.com/gsi/client"
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      scriptPromise = null
      reject(new Error("Could not load Google sign-in"))
    }
    document.head.appendChild(s)
  })
  return scriptPromise
}

/**
 * Google's own "Sign in with Google" button. Renders nothing until the admin has
 * a Google client id (GOOGLE_CLIENT_ID on the server).
 */
export function GoogleButton({
  onCredential,
  text = "signin_with",
}: {
  onCredential: (credential: string) => void
  text?: "signin_with" | "continue_with" | "signup_with"
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const cb = React.useRef(onCredential)
  cb.current = onCredential
  const [clientId, setClientId] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetch("/api/auth/google", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setClientId(d.clientId || null))
      .catch(() => setClientId(null))
  }, [])

  React.useEffect(() => {
    if (!clientId || !ref.current) return
    let cancelled = false
    loadGoogle()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return
        window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => cb.current(r.credential) })
        window.google.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", text, width: 320 })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [clientId, text])

  if (!clientId) return null
  return <div ref={ref} className="flex justify-center" />
}
