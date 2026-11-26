/**
 * Signed sign-in sessions for staff and customers.
 *
 * The "session" cookie is `v1.<payload>.<signature>`: the payload is base64url
 * JSON and the signature an HMAC-SHA256 of it. A cookie that was edited, or that
 * was made by the old unsigned scheme, is simply not a session.
 *
 * Signing key: SESSION_SECRET from the server environment when it is set (32+
 * characters). Otherwise a random key is created once and kept in the database
 * (store_settings, never returned by any settings endpoint), so a missing env
 * var neither locks everyone out nor falls back to a key anyone could know.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"
import type { RowDataPacket } from "mysql2"
import { query } from "@/lib/db/config"

export const SESSION_COOKIE = "session"
export const SESSION_HOURS = 24
const SECRET_SETTING = "session_signing_key"

export interface Session {
  userId: string
  email?: string | null
  /** Customer (website) session; otherwise staff (admin panel). */
  isCustomer?: boolean
  /** Signed in with a temporary or starter password: only the password change is allowed. */
  mustChange?: boolean
  /** Expiry, ms since epoch. */
  exp: number
}

let secretPromise: Promise<Buffer> | null = null

export function sessionSecret(): Promise<Buffer> {
  const fromEnv = process.env.SESSION_SECRET
  if (fromEnv && fromEnv.length >= 32) return Promise.resolve(Buffer.from(fromEnv))
  secretPromise ??= loadStoredSecret().catch((e) => {
    secretPromise = null
    throw e
  })
  return secretPromise
}

interface SettingRow extends RowDataPacket {
  setting_value: string | null
}

async function loadStoredSecret(): Promise<Buffer> {
  // Several server processes may start at once and must all use the same key:
  // create one only when none exists, then everyone reads the same row (the
  // smallest value; this needs only the setting_key and setting_value columns).
  const read = () =>
    query<SettingRow[]>(
      "SELECT setting_value FROM store_settings WHERE setting_key = ? AND setting_value IS NOT NULL ORDER BY setting_value LIMIT 1",
      [SECRET_SETTING]
    )
  let [row] = await read()
  if (!row) {
    await query("INSERT IGNORE INTO store_settings (setting_key, setting_value) VALUES (?, ?)", [
      SECRET_SETTING,
      randomBytes(48).toString("base64url"),
    ])
    ;[row] = await read()
  }
  const value = row?.setting_value?.trim() ?? ""
  if (value.length < 32) throw new Error("Session signing key is missing or too short")
  return Buffer.from(value)
}

const b64 = (s: string) => Buffer.from(s).toString("base64url")

function sign(payload: string, secret: Buffer): string {
  return createHmac("sha256", secret).update(`v1.${payload}`).digest("base64url")
}

export async function encodeSession(session: Session): Promise<string> {
  const payload = b64(JSON.stringify(session))
  return `v1.${payload}.${sign(payload, await sessionSecret())}`
}

/** The session in a cookie value, or null when missing, unsigned, tampered with or expired. */
export async function decodeSession(raw: string | undefined | null): Promise<Session | null> {
  if (!raw) return null
  const parts = raw.split(".")
  if (parts.length !== 3 || parts[0] !== "v1") return null
  const [, payload, signature] = parts
  let secret: Buffer
  try {
    secret = await sessionSecret()
  } catch (e) {
    console.error("[session] signing key unavailable:", (e as Error).message)
    return null
  }
  const want = Buffer.from(sign(payload, secret))
  const given = Buffer.from(signature)
  if (want.length !== given.length || !timingSafeEqual(want, given)) return null
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session
    if (!s || typeof s.userId !== "string" || !s.userId || typeof s.exp !== "number" || s.exp <= Date.now()) return null
    return s
  } catch {
    return null
  }
}

/** The current request's session (from the cookie), or null. */
export async function readSession(): Promise<Session | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value)
}

/** Starts a session and sets the cookie. */
export async function startSession(fields: Omit<Session, "exp">): Promise<void> {
  const session: Session = { ...fields, exp: Date.now() + SESSION_HOURS * 3600 * 1000 }
  if (!session.mustChange) delete session.mustChange
  if (!session.isCustomer) delete session.isCustomer
  ;(await cookies()).set(SESSION_COOKIE, await encodeSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_HOURS * 3600,
    path: "/",
  })
}

export async function endSession(): Promise<void> {
  ;(await cookies()).delete(SESSION_COOKIE)
}
