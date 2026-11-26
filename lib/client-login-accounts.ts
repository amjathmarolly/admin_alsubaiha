/**
 * Database side of "Create client logins": compares the Monday client list
 * with existing customers and creates or updates accounts.
 */
import { randomBytes } from "crypto"
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { query } from "@/lib/db/config"
import { readSession } from "@/lib/session"
import { assignMembershipTier } from "@/lib/membership-utils"
import { ensureCustomerColumns, hashPassword, temporaryPassword } from "@/lib/customer-accounts"
import { fetchClientRows, groupClientRows, welcomeMessage, type ClientGroup, type DoubtfulGroup } from "@/lib/client-logins"
import { formatPhone } from "@/lib/phone"

const SITE_URL = (process.env.WEBSITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://alsubaiha.ae").replace(/\/$/, "")

interface StaffRoleRow extends RowDataPacket {
  role_id: string | null
  role_name: string | null
  status: string
}

/** Only administrators and managers may create client logins. Returns an error message or null. */
export async function ownerOnly(): Promise<string | null> {
  const s = await readSession()
  if (!s || s.isCustomer || s.mustChange) return "Please sign in"
  const [u] = await query<StaffRoleRow[]>(
    "SELECT u.role_id, r.name AS role_name, u.status FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?",
    [s.userId]
  )
  if (!u || u.status !== "active") return "Please sign in"
  const role = `${u.role_id ?? ""} ${u.role_name ?? ""}`.toLowerCase()
  return /admin|manager/.test(role) ? null : "Only an administrator or manager can do this"
}

interface CustomerRow extends RowDataPacket {
  id: string
  name: string
  email: string | null
  phone_normalized: string | null
  has_password: number
  monday_total: string | null
  total_spent: string | null
}

export interface PlannedClient {
  phone: string
  phoneDisplay: string
  name: string
  email: string | null
  total: number
  firstOrderDate: string | null
  itemCount: number
  /** new: account is created. login: existing customer gets a login. sync: has a login, totals are updated. */
  action: "new" | "login" | "sync"
  customerId: string | null
  customerName: string | null
}

export interface Plan {
  ready: PlannedClient[]
  doubtful: (DoubtfulGroup & { rows: (DoubtfulGroup["rows"][number] & { phoneDisplay: string })[] })[]
  boardItems: number
}

export async function buildPlan(): Promise<Plan> {
  await ensureCustomerColumns()
  const rows = await fetchClientRows()
  const { groups, doubtful } = groupClientRows(rows)
  const customers = await query<CustomerRow[]>(
    `SELECT id, name, email, phone_normalized, password_hash IS NOT NULL AS has_password, monday_total, total_spent
     FROM customers`
  )
  const byPhone = new Map(customers.filter((c) => c.phone_normalized).map((c) => [c.phone_normalized as string, c]))
  const byEmail = new Map(customers.filter((c) => c.email).map((c) => [String(c.email).toLowerCase(), c]))

  const ready: PlannedClient[] = []
  const extraDoubtful: DoubtfulGroup[] = []
  for (const g of groups) {
    const existing = byPhone.get(g.phone) ?? null
    const emailOwner = g.email ? byEmail.get(g.email) : undefined
    if (emailOwner && emailOwner.id !== existing?.id) {
      extraDoubtful.push({ reason: `Email already belongs to customer "${emailOwner.name}"`, rows: g.rows })
      continue
    }
    ready.push(plan(g, existing))
  }
  const withDisplay = (d: DoubtfulGroup) => ({
    ...d,
    rows: d.rows.map((r) => ({ ...r, phoneDisplay: r.phoneRaw })),
  })
  return { ready, doubtful: [...doubtful, ...extraDoubtful].map(withDisplay), boardItems: rows.length }
}

function plan(g: ClientGroup, c: CustomerRow | null): PlannedClient {
  return {
    phone: g.phone,
    phoneDisplay: formatPhone(g.phone),
    name: g.name,
    email: g.email,
    total: g.total,
    firstOrderDate: g.firstOrderDate,
    itemCount: g.itemCount,
    action: !c ? "new" : Number(c.has_password) ? "sync" : "login",
    customerId: c?.id ?? null,
    customerName: c?.name ?? null,
  }
}

export interface CreatedLogin {
  customerId: string
  name: string
  phoneDisplay: string
  email: string | null
  password: string
  message: string
}

/**
 * Applies the plan for the chosen numbers. Re-reads Monday and the database
 * first, so nothing the browser sends is trusted beyond the list of numbers.
 * Existing passwords are never replaced.
 */
export async function applyPlan(phones: string[]): Promise<{ created: CreatedLogin[]; synced: number; skipped: string[] }> {
  const wanted = new Set(phones)
  const { ready } = await buildPlan()
  const created: CreatedLogin[] = []
  const skipped: string[] = []
  let synced = 0

  for (const p of ready) {
    if (!wanted.has(p.phone)) continue
    wanted.delete(p.phone)
    try {
      let customerId = p.customerId
      let password: string | null = null
      if (p.action === "new") {
        password = temporaryPassword()
        customerId = `cust-${Date.now()}-${randomBytes(3).toString("hex")}`
        await query(
          `INSERT INTO customers (id, name, email, phone, phone_normalized, country, status, verified, password_hash,
             must_change_password, total_orders, total_spent, monday_total, monday_synced_at, first_order_date)
           VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?, 1, 0, ?, ?, NOW(), ?)`,
          [
            customerId,
            p.name,
            p.email,
            `+${p.phone}`,
            p.phone,
            p.phone.startsWith("971") ? "United Arab Emirates" : null,
            await hashPassword(password),
            p.total,
            p.total,
            p.firstOrderDate,
          ]
        )
      } else {
        // Adds only the change in the Monday total, so orders already counted stay counted.
        await query(
          `UPDATE customers SET
             total_spent = COALESCE(total_spent, 0) + (? - COALESCE(monday_total, 0)),
             monday_total = ?,
             monday_synced_at = NOW(),
             first_order_date = IF(first_order_date IS NULL OR first_order_date > ?, ?, first_order_date),
             email = COALESCE(email, ?)
           WHERE id = ?`,
          [p.total, p.total, p.firstOrderDate, p.firstOrderDate, p.email, customerId]
        )
        if (p.action === "login") {
          password = temporaryPassword()
          // Only when there is still no password (another staff member may have just made one).
          const res = await query<ResultSetHeader>(
            "UPDATE customers SET password_hash = ?, must_change_password = 1, verified = 1 WHERE id = ? AND password_hash IS NULL",
            [await hashPassword(password), customerId]
          )
          if (!res.affectedRows) password = null
        }
      }
      try {
        await assignMembershipTier(customerId as string)
      } catch (e) {
        console.warn("[client-logins] tier not assigned:", (e as Error).message)
      }
      if (password) {
        created.push({
          customerId: customerId as string,
          name: p.name,
          phoneDisplay: p.phoneDisplay,
          email: p.email,
          password,
          message: welcomeMessage(p.name, p.phone, p.email, password, SITE_URL),
        })
      } else {
        synced++
      }
    } catch (e) {
      console.error("[client-logins] could not save", p.phoneDisplay, (e as Error).message)
      skipped.push(`${p.name} (${p.phoneDisplay}): could not be saved`)
    }
  }
  for (const p of wanted) skipped.push(`+${p}: no longer ready (changed on Monday or needs checking)`)
  return { created, synced, skipped }
}

interface ResetRow extends RowDataPacket {
  id: string
  name: string
  email: string | null
  phone_normalized: string | null
}

/** A new temporary password for one client (when the first one was lost). */
export async function resetClientPassword(customerId: string): Promise<CreatedLogin | null> {
  await ensureCustomerColumns()
  const [c] = await query<ResetRow[]>("SELECT id, name, email, phone_normalized FROM customers WHERE id = ?", [customerId])
  if (!c) return null
  const password = temporaryPassword()
  await query("UPDATE customers SET password_hash = ?, must_change_password = 1, verified = 1 WHERE id = ?", [
    await hashPassword(password),
    c.id,
  ])
  const phone = c.phone_normalized ?? ""
  return {
    customerId: c.id,
    name: c.name,
    phoneDisplay: formatPhone(phone),
    email: c.email,
    password,
    message: welcomeMessage(c.name, phone, c.email, password, SITE_URL),
  }
}
