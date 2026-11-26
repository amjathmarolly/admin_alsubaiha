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
import { clientBoardIds, fetchClientRows, groupClientRows, welcomeMessage, type ClientGroup, type ClientRow, type DoubtfulGroup } from "@/lib/client-logins"
import { syncProjects } from "@/lib/client-projects"
import { openTempPassword, sealTempPassword } from "@/lib/temp-password-vault"
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

/** Reads Monday and the database, and decides what to do with each client. */
async function computePlan(): Promise<{ plan: Plan; rows: ClientRow[] }> {
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
    const recorded = Number(existing?.total_spent) || 0
    if (existing && existing.monday_total === null && recorded > 0) {
      // Spending entered before (by hand or from orders) may already include these
      // Monday items; adding the Monday total on top could count it twice.
      extraDoubtful.push({
        reason: `"${existing.name}" already has AED ${Math.round(recorded).toLocaleString("en-AE")} recorded; Monday total is AED ${Math.round(g.total).toLocaleString("en-AE")}. To go ahead, set their Total Spent in Customers to the part not on Monday (often 0) and refresh`,
        rows: g.rows,
      })
      continue
    }
    ready.push(plan(g, existing))
  }
  const withDisplay = (d: DoubtfulGroup) => ({
    ...d,
    rows: d.rows.map((r) => ({ ...r, phoneDisplay: r.phoneRaw })),
  })
  return {
    plan: { ready, doubtful: [...doubtful, ...extraDoubtful].map(withDisplay), boardItems: rows.length },
    rows,
  }
}

export async function buildPlan(): Promise<Plan> {
  return (await computePlan()).plan
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
 * Sets a new temporary password (kept encrypted for staff until the client
 * changes it). With onlyIfNone, an account that already has a password is left alone.
 */
async function issueTempPassword(customerId: string, onlyIfNone: boolean): Promise<string | null> {
  const password = temporaryPassword()
  const res = await query<ResultSetHeader>(
    `UPDATE customers SET password_hash = ?, temp_password_enc = ?, must_change_password = 1, verified = 1
     WHERE id = ?${onlyIfNone ? " AND password_hash IS NULL" : ""}`,
    [await hashPassword(password), await sealTempPassword(password), customerId]
  )
  return res.affectedRows ? password : null
}

/** Creates or updates one client's account. Returns the customer id and any new temporary password. */
async function saveClient(p: PlannedClient, withPassword: boolean): Promise<{ customerId: string; password: string | null }> {
  let customerId = p.customerId
  if (p.action === "new") {
    customerId = `cust-${Date.now()}-${randomBytes(3).toString("hex")}`
    await query(
      `INSERT INTO customers (id, name, email, phone, phone_normalized, country, status, verified, password_hash,
         must_change_password, total_orders, total_spent, monday_total, monday_synced_at, first_order_date)
       VALUES (?, ?, ?, ?, ?, ?, 'active', 1, NULL, 1, 0, ?, ?, NOW(), ?)`,
      [
        customerId,
        p.name,
        p.email,
        `+${p.phone}`,
        p.phone,
        p.phone.startsWith("971") ? "United Arab Emirates" : null,
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
  }
  const password = withPassword && p.action !== "sync" ? await issueTempPassword(customerId as string, true) : null
  try {
    await assignMembershipTier(customerId as string)
  } catch (e) {
    console.warn("[client-logins] tier not assigned:", (e as Error).message)
  }
  return { customerId: customerId as string, password }
}

/**
 * Applies the plan for the chosen numbers. Re-reads Monday and the database
 * first, so nothing the browser sends is trusted beyond the list of numbers.
 * Existing passwords are never replaced.
 */
export async function applyPlan(
  phones: string[]
): Promise<{ created: CreatedLogin[]; synced: number; skipped: string[]; projects: number }> {
  const wanted = new Set(phones)
  const { plan: current, rows } = await computePlan()
  const created: CreatedLogin[] = []
  const skipped: string[] = []
  let synced = 0

  for (const p of current.ready) {
    if (!wanted.has(p.phone)) continue
    wanted.delete(p.phone)
    try {
      const { customerId, password } = await saveClient(p, true)
      if (password) {
        created.push({
          customerId,
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
  const { saved } = await syncProjects(rows, clientBoardIds())
  return { created, synced, skipped, projects: saved }
}

/**
 * Automatic sync (Monday webhook or a schedule): adds new clean clients as
 * accounts WITHOUT a password (staff issue one on Client Logins), updates
 * totals and tiers, and refreshes projects. Doubtful rows wait for staff.
 */
export async function autoSync(): Promise<{ added: number; updated: number; waiting: number; projects: number; removed: number }> {
  const { plan: current, rows } = await computePlan()
  let added = 0
  let updated = 0
  for (const p of current.ready) {
    try {
      await saveClient(p, false)
      if (p.action === "new") added++
      else updated++
    } catch (e) {
      console.error("[client-sync] could not save", p.phoneDisplay, (e as Error).message)
    }
  }
  const { saved, removed } = await syncProjects(rows, clientBoardIds())
  return { added, updated, waiting: current.doubtful.length, projects: saved, removed }
}

interface ResetRow extends RowDataPacket {
  id: string
  name: string
  email: string | null
  phone_normalized: string | null
}

/** A new temporary password for one client (lost, or forgotten). */
export async function resetClientPassword(customerId: string): Promise<CreatedLogin | null> {
  await ensureCustomerColumns()
  const [c] = await query<ResetRow[]>("SELECT id, name, email, phone_normalized FROM customers WHERE id = ?", [customerId])
  if (!c) return null
  const password = await issueTempPassword(c.id, false)
  if (!password) return null
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

/** The welcome message with the client's current temporary password, if they still have one. */
export async function currentTempLogin(customerId: string): Promise<CreatedLogin | null> {
  await ensureCustomerColumns()
  const [c] = await query<(ResetRow & { temp_password_enc: string | null })[]>(
    "SELECT id, name, email, phone_normalized, temp_password_enc FROM customers WHERE id = ? AND must_change_password = 1",
    [customerId]
  )
  const password = await openTempPassword(c?.temp_password_enc)
  if (!c || !password) return null
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
