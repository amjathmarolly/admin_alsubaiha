/**
 * "Sign in with Google" for staff.
 *
 * The browser gets an ID token from Google (Google Identity Services, using the
 * public GOOGLE_CLIENT_ID); the server checks it here: Google's signature
 * (keys from Google, cached), issuer, audience = our client id, expiry and a
 * verified email. A Google account only opens the admin after a signed-in staff
 * member has linked it in Settings -> Security, so no other Google account can get in.
 */
import { createPublicKey, createVerify, type JsonWebKey } from "crypto"
import { addColumnIfMissing } from "@/lib/seo"
import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"

export const googleClientId = () => process.env.GOOGLE_CLIENT_ID?.trim() || ""

let keys: { at: number; ttl: number; byKid: Map<string, JsonWebKey> } | null = null

async function googleKeys(): Promise<Map<string, JsonWebKey>> {
  if (keys && Date.now() - keys.at < keys.ttl) return keys.byKid
  const res = await fetch("https://www.googleapis.com/oauth2/v3/certs", { cache: "no-store", signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Google keys: HTTP ${res.status}`)
  const body = (await res.json()) as { keys?: (JsonWebKey & { kid?: string })[] }
  const byKid = new Map<string, JsonWebKey>()
  for (const k of body.keys ?? []) if (k.kid) byKid.set(k.kid, k)
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1] ?? 3600)
  keys = { at: Date.now(), ttl: Math.min(maxAge, 6 * 3600) * 1000, byKid }
  return byKid
}

export interface GoogleIdentity {
  sub: string
  email: string
  name: string | null
}

const b64json = (s: string) => JSON.parse(Buffer.from(s, "base64url").toString("utf8"))

/** The Google account behind an ID token, or an error message. */
export async function verifyGoogleIdToken(token: unknown): Promise<GoogleIdentity | { error: string }> {
  const clientId = googleClientId()
  if (!clientId) return { error: "Google sign-in is not set up yet" }
  if (typeof token !== "string" || token.length > 5000) return { error: "Invalid Google sign-in" }
  const parts = token.split(".")
  if (parts.length !== 3) return { error: "Invalid Google sign-in" }
  try {
    const header = b64json(parts[0])
    const payload = b64json(parts[1])
    if (header.alg !== "RS256" || typeof header.kid !== "string") return { error: "Invalid Google sign-in" }
    let jwk = (await googleKeys()).get(header.kid)
    if (!jwk) {
      keys = null // Google rotated its keys
      jwk = (await googleKeys()).get(header.kid)
    }
    if (!jwk) return { error: "Invalid Google sign-in" }
    const ok = createVerify("RSA-SHA256")
      .update(`${parts[0]}.${parts[1]}`)
      .verify(createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(parts[2], "base64url"))
    if (!ok) return { error: "Invalid Google sign-in" }
    const now = Math.floor(Date.now() / 1000)
    if (payload.iss !== "accounts.google.com" && payload.iss !== "https://accounts.google.com") return { error: "Invalid Google sign-in" }
    if (payload.aud !== clientId) return { error: "Invalid Google sign-in" }
    if (typeof payload.exp !== "number" || payload.exp < now - 60) return { error: "Google sign-in expired, please try again" }
    if (typeof payload.sub !== "string" || !payload.sub) return { error: "Invalid Google sign-in" }
    if (payload.email_verified !== true || typeof payload.email !== "string") return { error: "This Google account's email is not verified" }
    return { sub: payload.sub, email: payload.email.toLowerCase(), name: typeof payload.name === "string" ? payload.name : null }
  } catch (e) {
    console.error("[google-signin] check failed:", (e as Error).message)
    return { error: "Could not check the Google sign-in, please try again" }
  }
}

let ready: Promise<void> | null = null
export function ensureGoogleColumns(): Promise<void> {
  ready ??= (async () => {
    await addColumnIfMissing("users", "google_sub", "VARCHAR(64) NULL")
    await addColumnIfMissing("users", "google_email", "VARCHAR(255) NULL")
  })().catch((e) => {
    ready = null
    throw e
  })
  return ready
}

interface LinkRow extends RowDataPacket {
  id: string
  email: string
}

/** The active staff account linked to this Google account, if any. */
export async function staffForGoogle(sub: string): Promise<string | null> {
  await ensureGoogleColumns()
  const [u] = await query<LinkRow[]>("SELECT id, email FROM users WHERE google_sub = ? AND status = 'active' LIMIT 1", [sub])
  return u?.id ?? null
}

/** Links a Google account to a staff account (one Google account per staff account). */
export async function linkGoogle(userId: string, g: GoogleIdentity): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureGoogleColumns()
  const [other] = await query<LinkRow[]>("SELECT id, email FROM users WHERE google_sub = ? AND id <> ? LIMIT 1", [g.sub, userId])
  if (other) return { ok: false, error: `This Google account is already linked to ${other.email}` }
  await query("UPDATE users SET google_sub = ?, google_email = ? WHERE id = ?", [g.sub, g.email, userId])
  return { ok: true }
}

export async function unlinkGoogle(userId: string): Promise<void> {
  await ensureGoogleColumns()
  await query("UPDATE users SET google_sub = NULL, google_email = NULL WHERE id = ?", [userId])
}

export async function linkedGoogleEmail(userId: string): Promise<string | null> {
  await ensureGoogleColumns()
  const [u] = await query<(RowDataPacket & { google_email: string | null })[]>("SELECT google_email FROM users WHERE id = ?", [userId])
  return u?.google_email ?? null
}
