/**
 * Customer (client) accounts: sign-in by mobile number or email, temporary
 * passwords that must be changed, and the columns those need.
 */
import { randomInt } from "crypto"
import bcrypt from "bcrypt"
import type { RowDataPacket } from "mysql2"
import { query } from "@/lib/db/config"
import { addColumnIfMissing } from "@/lib/seo"
import { normalizePhone } from "@/lib/phone"

interface ColumnRow extends RowDataPacket {
  COLUMN_TYPE: string
  IS_NULLABLE: "YES" | "NO"
}

interface IndexRow extends RowDataPacket {
  INDEX_NAME: string
}

async function makeEmailOptional(): Promise<void> {
  const [col] = await query<ColumnRow[]>(
    `SELECT COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'email'`
  )
  if (!col || col.IS_NULLABLE === "YES") return
  // Keeps the column's type and its unique index; MySQL allows any number of NULLs in a unique index.
  await query(`ALTER TABLE customers MODIFY email ${col.COLUMN_TYPE} NULL`)
}

async function ensurePhoneIndex(): Promise<void> {
  const rows = await query<IndexRow[]>(
    `SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'phone_normalized'`
  )
  if (rows.length) return
  try {
    await query("ALTER TABLE customers ADD UNIQUE INDEX uniq_phone_normalized (phone_normalized)")
  } catch (e) {
    // Two existing customers share a number: keep working with a plain index; the
    // code below refuses to create a second account for a number either way.
    console.warn("[customers] phone numbers are not unique yet:", (e as Error).message)
    await query("ALTER TABLE customers ADD INDEX idx_phone_normalized (phone_normalized)")
  }
}

interface PhoneRow extends RowDataPacket {
  id: string
  phone: string
}

async function backfillPhones(): Promise<void> {
  const rows = await query<PhoneRow[]>(
    "SELECT id, phone FROM customers WHERE phone_normalized IS NULL AND phone IS NOT NULL AND phone <> ''"
  )
  const seen = new Set<string>()
  for (const r of rows) {
    const p = normalizePhone(r.phone)
    if (!p || seen.has(p)) continue
    seen.add(p)
    try {
      await query("UPDATE customers SET phone_normalized = ? WHERE id = ? AND phone_normalized IS NULL", [p, r.id])
    } catch {
      // Already used by another customer: left for staff to sort out.
    }
  }
}

let ready: Promise<void> | null = null

/** Adds the columns customer sign-in needs (once per server process). */
export function ensureCustomerColumns(): Promise<void> {
  ready ??= (async () => {
    await addColumnIfMissing("customers", "password_hash", "VARCHAR(255) NULL")
    await addColumnIfMissing("customers", "verified", "TINYINT(1) NOT NULL DEFAULT 0")
    await addColumnIfMissing("customers", "verification_token", "VARCHAR(255) NULL")
    await addColumnIfMissing("customers", "phone_normalized", "VARCHAR(20) NULL")
    await addColumnIfMissing("customers", "must_change_password", "TINYINT(1) NOT NULL DEFAULT 0")
    await addColumnIfMissing("customers", "monday_total", "DECIMAL(12,2) NULL")
    await addColumnIfMissing("customers", "monday_synced_at", "DATETIME NULL")
    await addColumnIfMissing("customers", "first_order_date", "DATE NULL")
    await addColumnIfMissing("customers", "temp_password_enc", "TEXT NULL")
    // 1 = staff created or confirmed this account, so Monday orders and projects may
    // be attached to it. Self sign-ups (and older accounts) stay 0 until staff confirm.
    await addColumnIfMissing("customers", "monday_link", "TINYINT(1) NOT NULL DEFAULT 0")
    await makeEmailOptional()
    await ensurePhoneIndex()
    await backfillPhones()
  })().catch((e) => {
    ready = null
    throw e
  })
  return ready
}

// No 0/O, 1/l/I: easy to read out over the phone or type from WhatsApp.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"

/** A random temporary password like "Kp7w-Rt3m-Xa9q" (about 70 bits). */
export function temporaryPassword(): string {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")
  return `${group()}-${group()}-${group()}`
}

export const hashPassword = (password: string) => bcrypt.hash(password, 12)

export const MIN_CUSTOMER_PASSWORD = 8

/** Why a customer's new password is not acceptable, or null. */
export function customerPasswordProblem(password: unknown, phone: string | null): string | null {
  if (typeof password !== "string" || password.length < MIN_CUSTOMER_PASSWORD) {
    return `New password must be at least ${MIN_CUSTOMER_PASSWORD} characters`
  }
  if (password.length > 200) return "New password is too long"
  const digits = (phone ?? "").replace(/\D/g, "")
  if (digits.length >= 7 && password.replace(/\D/g, "").includes(digits.slice(-7))) {
    return "New password must not contain your mobile number"
  }
  return null
}
