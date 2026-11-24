import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"

// Key under which the Monday.com token is stored in store_settings.
// Deliberately absent from KEY_MAP in /api/settings so the general settings
// endpoints never return it.
export const MONDAY_TOKEN_KEY = "monday_api_token"

interface TokenRow extends RowDataPacket {
  setting_value: string
  updated_at: Date
}

export async function readMondayToken(): Promise<{ token: string; updatedAt: Date } | null> {
  const rows = await query<TokenRow[]>(
    "SELECT setting_value, updated_at FROM store_settings WHERE setting_key = ? LIMIT 1",
    [MONDAY_TOKEN_KEY]
  )
  if (!rows.length || !rows[0].setting_value) return null
  let token = rows[0].setting_value
  try {
    const parsed = JSON.parse(token)
    if (typeof parsed === "string") token = parsed
  } catch {
    // stored as a raw string
  }
  return token ? { token, updatedAt: rows[0].updated_at } : null
}

export function maskToken(token: string): string {
  return token.length <= 8 ? "••••" : `••••••••${token.slice(-4)}`
}

/** The userId of a valid, unexpired staff (non-customer) session, or null. */
async function staffUserId(): Promise<string | null> {
  const raw = (await cookies()).get("session")?.value
  if (!raw) return null
  try {
    const session = JSON.parse(Buffer.from(raw, "base64").toString())
    return session.userId && !session.isCustomer && session.exp > Date.now() ? String(session.userId) : null
  } catch {
    return null
  }
}

/** True when the request carries a valid, unexpired staff (non-customer) session. */
export async function hasStaffSession(): Promise<boolean> {
  // Local development only: demo-user logins (see lib/auth-context.tsx) never
  // receive a session cookie. Production always requires a real one.
  if (process.env.NODE_ENV !== "production") return true
  return (await staffUserId()) !== null
}

/**
 * SEO tabs are intentionally available to every dashboard user regardless of role.
 * The old admin-only gate was blocking viewers/managers from opening the page.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  // Intentionally do not enforce a role check here. All SEO tabs should remain
  // accessible to any dashboard user, including viewers and managers.
  return null
}

/** Constant-time check of `Authorization: Bearer <INTERNAL_API_KEY>`. */
export function hasValidInternalKey(authHeader: string | null): boolean {
  const expected = process.env.INTERNAL_API_KEY
  if (!expected || !authHeader?.startsWith("Bearer ")) return false
  const given = Buffer.from(authHeader.slice(7))
  const want = Buffer.from(expected)
  return given.length === want.length && timingSafeEqual(given, want)
}
