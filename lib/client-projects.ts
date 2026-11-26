/**
 * Clients' projects (one per Monday item) with total, received and balance,
 * shown in the client's website profile and on the Customers page.
 *
 * These are not shop orders: a client's total_spent already includes the
 * Monday total, so projects are kept apart and never added to it.
 */
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { query } from "@/lib/db/config"
import type { ClientRow } from "@/lib/client-logins"
import { normalizePhone } from "@/lib/phone"
import { ensureCustomerColumns } from "@/lib/customer-accounts"

let ready: Promise<void> | null = null
export function ensureProjectsTable(): Promise<void> {
  ready ??= query(
    `CREATE TABLE IF NOT EXISTS client_projects (
       monday_item_id VARCHAR(30) NOT NULL PRIMARY KEY,
       board_id VARCHAR(30) NOT NULL,
       customer_id VARCHAR(50) NULL,
       name VARCHAR(255) NOT NULL,
       job_order_no VARCHAR(50) NULL,
       group_title VARCHAR(120) NULL,
       total_value DECIMAL(14,2) NOT NULL DEFAULT 0,
       received DECIMAL(14,2) NOT NULL DEFAULT 0,
       expected_delivery DATE NULL,
       tracker_url VARCHAR(500) NULL,
       monday_created_at DATETIME NULL,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       INDEX idx_customer (customer_id),
       INDEX idx_board (board_id)
     )`
  )
    .then(() => undefined)
    .catch((e) => {
      ready = null
      throw e
    })
  return ready
}

/**
 * Private tracker links from trackeralsubaiha.com, keyed by Monday item id.
 * Off unless TRACKER_API_URL and TRACKER_API_KEY are set. Fetched on the server
 * only; a failure keeps the links already saved.
 */
export async function fetchTrackerLinks(): Promise<Map<string, string> | null> {
  const url = process.env.TRACKER_API_URL?.trim()
  const key = process.env.TRACKER_API_KEY?.trim()
  if (!url || !key) return null
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const list = await res.json()
    const map = new Map<string, string>()
    for (const t of Array.isArray(list) ? list : []) {
      const id = String(t?.mondayItemId ?? "").trim()
      const link = String(t?.clientUrl ?? "").trim()
      if (/^\d+$/.test(id) && /^https:\/\/[^\s]+$/i.test(link) && link.length <= 500) map.set(id, link)
    }
    return map
  } catch (e) {
    console.warn("[tracker] links not refreshed:", (e as Error).message)
    return null
  }
}

/**
 * Saves every board item as a project of the customer who has its mobile
 * number, and removes projects whose item left the board. Returns how many were saved.
 */
export async function syncProjects(rows: ClientRow[], boardIds: string[]): Promise<{ saved: number; removed: number }> {
  await ensureProjectsTable()
  await ensureCustomerColumns()
  const customers = await query<(RowDataPacket & { id: string; phone_normalized: string })[]>(
    "SELECT id, phone_normalized FROM customers WHERE phone_normalized IS NOT NULL AND monday_link = 1"
  )
  const byPhone = new Map(customers.map((c) => [c.phone_normalized, c.id]))
  const links = await fetchTrackerLinks()

  let saved = 0
  for (const r of rows) {
    const customerId = byPhone.get(normalizePhone(r.phoneRaw)) ?? null
    const link = links?.get(r.itemId) ?? null
    await query(
      `INSERT INTO client_projects (monday_item_id, board_id, customer_id, name, job_order_no, group_title,
         total_value, received, expected_delivery, tracker_url, monday_created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE board_id = VALUES(board_id), customer_id = VALUES(customer_id), name = VALUES(name),
         job_order_no = VALUES(job_order_no), group_title = VALUES(group_title), total_value = VALUES(total_value),
         received = VALUES(received), expected_delivery = VALUES(expected_delivery),
         tracker_url = ${links ? "VALUES(tracker_url)" : "tracker_url"}, monday_created_at = VALUES(monday_created_at)`,
      [
        r.itemId,
        r.boardId,
        customerId,
        r.name.slice(0, 255) || "Project",
        r.jobOrderNo.slice(0, 50) || null,
        r.group.slice(0, 120) || null,
        r.total,
        r.received,
        r.expectedDelivery,
        link,
        r.createdAt ? r.createdAt.slice(0, 19).replace("T", " ") : null,
      ]
    )
    saved++
  }

  // Only when the board was read (an empty answer never wipes everything).
  let removed = 0
  if (rows.length && boardIds.length) {
    const ids = rows.map((r) => r.itemId)
    const res = await query<ResultSetHeader>(
      `DELETE FROM client_projects WHERE board_id IN (${boardIds.map(() => "?").join(",")})
       AND monday_item_id NOT IN (${ids.map(() => "?").join(",")})`,
      [...boardIds, ...ids]
    )
    removed = res.affectedRows ?? 0
  }
  return { saved, removed }
}

export interface ClientProject {
  id: string
  name: string
  jobOrderNo: string | null
  group: string | null
  totalValue: number
  received: number
  balance: number
  expectedDelivery: string | null
  trackerUrl: string | null
}

interface ProjectRow extends RowDataPacket {
  monday_item_id: string
  customer_id: string
  name: string
  job_order_no: string | null
  group_title: string | null
  total_value: string
  received: string
  expected_delivery: Date | string | null
  tracker_url: string | null
}

const dateOnly = (v: Date | string | null): string | null => {
  if (!v) return null
  if (typeof v === "string") return v.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`
}

function toProject(r: ProjectRow): ClientProject {
  const totalValue = Number(r.total_value) || 0
  const received = Number(r.received) || 0
  return {
    id: r.monday_item_id,
    name: r.name,
    jobOrderNo: r.job_order_no,
    group: r.group_title,
    totalValue,
    received,
    balance: Math.round((totalValue - received) * 100) / 100,
    expectedDelivery: dateOnly(r.expected_delivery),
    trackerUrl: r.tracker_url,
  }
}

/** Projects of the given customers, newest first, grouped by customer id. */
export async function projectsFor(customerIds: string[]): Promise<Map<string, ClientProject[]>> {
  const out = new Map<string, ClientProject[]>()
  if (!customerIds.length) return out
  await ensureProjectsTable()
  const rows = await query<ProjectRow[]>(
    `SELECT * FROM client_projects WHERE customer_id IN (${customerIds.map(() => "?").join(",")})
     ORDER BY monday_created_at DESC, monday_item_id DESC`,
    customerIds
  )
  for (const r of rows) out.set(r.customer_id, [...(out.get(r.customer_id) ?? []), toProject(r)])
  return out
}
