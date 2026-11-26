import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"
import { readSession } from "@/lib/session"

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

/** The userId of a valid staff (non-customer) session that may use the admin, or null. */
export async function staffUserId(): Promise<string | null> {
  const session = await readSession()
  return session && !session.isCustomer && !session.mustChange ? session.userId : null
}

/** True when the request carries a valid staff (non-customer) session. */
export async function hasStaffSession(): Promise<boolean> {
  return (await staffUserId()) !== null
}

/**
 * SEO tabs are available to every signed-in staff member regardless of role
 * (the old admin-only gate blocked viewers and managers). Answers 401 for anyone else.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (await hasStaffSession()) return null
  return NextResponse.json({ error: "Please sign in" }, { status: 401 })
}

/** Constant-time check of `Authorization: Bearer <INTERNAL_API_KEY>`. */
export function hasValidInternalKey(authHeader: string | null): boolean {
  const expected = process.env.INTERNAL_API_KEY
  if (!expected || !authHeader?.startsWith("Bearer ")) return false
  const given = Buffer.from(authHeader.slice(7))
  const want = Buffer.from(expected)
  return given.length === want.length && timingSafeEqual(given, want)
}
