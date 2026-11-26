/**
 * "Create client logins": turns the Monday.com client board into website
 * accounts, one per mobile number.
 *
 * Pure grouping (groupClientRows) is separate from Monday and the database so
 * it can be checked on its own. Nothing here sends a message to anyone.
 */
import { normalizePhone, isPlausiblePhone, isUaeLandline } from "@/lib/phone"
import { readMondayToken } from "@/lib/integration-token"

export const DEFAULT_BOARD_IDS = ["18402982895"]
const PHONE_COL = "phone_mm9f4p5f"
const EMAIL_COL = "email_mm6m4v9y"
const TOTAL_COL = "numbers8__1"
const JOB_ORDER_COL = "numbers3"
const RECEIVED_COL = "numbers__1"
/** Expected delivery: MONDAY_DELIVERY_COLUMN, else the board's first timeline column. */
const DELIVERY_COL = process.env.MONDAY_DELIVERY_COLUMN?.trim() || ""

/** One item (order) on a Monday board. */
export interface ClientRow {
  itemId: string
  boardId: string
  name: string
  phoneRaw: string
  email: string
  total: number
  createdAt: string // ISO
  /** Project details for the client's profile. */
  jobOrderNo: string
  group: string
  received: number
  /** YYYY-MM-DD, end of the timeline. */
  expectedDelivery: string | null
}

/** All of one client's items, grouped by mobile number. */
export interface ClientGroup {
  phone: string
  name: string
  email: string | null
  total: number
  firstOrderDate: string | null // YYYY-MM-DD
  itemCount: number
  rows: ClientRow[]
}

export interface DoubtfulGroup {
  reason: string
  rows: ClientRow[]
  /** Set when staff may approve this number as one client (names or emails differ between its orders). */
  approvablePhone?: string
}

const normName = (s: string) => s.toLowerCase().replace(/[^a-z؀-ۿ]+/g, " ").trim()

/** Same length and at most one digit different, or one number ends with the other. */
function nearlySame(a: string, b: string): boolean {
  if (a === b) return false
  if (a.length === b.length) {
    let diff = 0
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++diff > 1) return false
    return diff === 1
  }
  const [s, l] = a.length < b.length ? [a, b] : [b, a]
  return s.length >= 8 && l.endsWith(s)
}

/**
 * Groups rows by mobile number and sets aside anything a person should look at first.
 * The mobile number identifies the client: one name on several numbers is several
 * clients. A number whose orders carry different names or emails (often order
 * labels such as "kamlesh variation") waits until staff approve it as one client
 * (approvedPhones); missing, short, landline and near-identical numbers always wait.
 */
export function groupClientRows(
  rows: ClientRow[],
  approvedPhones: Set<string> = new Set()
): { groups: ClientGroup[]; doubtful: DoubtfulGroup[] } {
  const doubtful: DoubtfulGroup[] = []
  const byPhone = new Map<string, ClientRow[]>()
  for (const r of rows) {
    const p = normalizePhone(r.phoneRaw)
    if (!p) {
      doubtful.push({ reason: "No mobile number", rows: [r] })
      continue
    }
    if (!isPlausiblePhone(p)) {
      doubtful.push({ reason: "Mobile number looks incomplete", rows: [r] })
      continue
    }
    if (isUaeLandline(p)) {
      doubtful.push({ reason: "Landline, not a mobile number", rows: [r] })
      continue
    }
    byPhone.set(p, [...(byPhone.get(p) ?? []), r])
  }

  // Problems staff cannot approve away come first; then ones they can.
  const flagged = new Map<string, { reason: string; approvable: boolean }>()
  const flag = (phone: string, reason: string, approvable = false) => {
    const cur = flagged.get(phone)
    if (!cur || (cur.approvable && !approvable)) flagged.set(phone, { reason, approvable })
  }

  for (const [phone, list] of byPhone) {
    if (approvedPhones.has(phone)) continue
    const names = new Set(list.map((r) => normName(r.name)).filter(Boolean))
    if (names.size > 1) flag(phone, "One number under different names", true)
    const emails = new Set(list.map((r) => r.email).filter(Boolean))
    if (emails.size > 1) flag(phone, "One number with different emails", true)
  }

  const phones = [...byPhone.keys()]
  for (let i = 0; i < phones.length; i++) {
    for (let j = i + 1; j < phones.length; j++) {
      if (nearlySame(phones[i], phones[j])) {
        flag(phones[i], "Nearly the same as another number")
        flag(phones[j], "Nearly the same as another number")
      }
    }
  }

  // Shared email across different numbers: the email cannot belong to two accounts.
  const emailToPhones = new Map<string, Set<string>>()
  for (const [phone, list] of byPhone) {
    for (const r of list) if (r.email) emailToPhones.set(r.email, (emailToPhones.get(r.email) ?? new Set()).add(phone))
  }
  for (const set of emailToPhones.values()) {
    if (set.size > 1) for (const p of set) flag(p, "Same email on several numbers")
  }

  const groups: ClientGroup[] = []
  for (const [phone, list] of byPhone) {
    const f = flagged.get(phone)
    if (f) {
      doubtful.push({ reason: f.reason, rows: list, ...(f.approvable ? { approvablePhone: phone } : {}) })
      continue
    }
    const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    groups.push({
      phone,
      name: sorted[0].name.trim(),
      email: sorted.find((r) => r.email)?.email ?? null,
      total: Math.round(list.reduce((s, r) => s + r.total, 0) * 100) / 100,
      firstOrderDate: sorted[0].createdAt ? sorted[0].createdAt.slice(0, 10) : null,
      itemCount: list.length,
      rows: sorted,
    })
  }
  groups.sort((a, b) => a.name.localeCompare(b.name))
  doubtful.sort((a, b) => a.reason.localeCompare(b.reason))
  return { groups, doubtful }
}

/** Board ids from MONDAY_CLIENT_BOARD_IDS (comma separated), else the current client board. */
export function clientBoardIds(): string[] {
  const env = (process.env.MONDAY_CLIENT_BOARD_IDS || "").split(",").map((s) => s.trim()).filter((s) => /^\d+$/.test(s))
  return env.length ? env : DEFAULT_BOARD_IDS
}

async function mondayToken(): Promise<string> {
  const env = process.env.MONDAY_API_TOKEN?.trim()
  if (env) return env
  const stored = await readMondayToken()
  if (stored?.token) return stored.token
  throw new Error("The Monday.com token is not set. Add MONDAY_API_TOKEN in Hostinger environment variables.")
}

interface MondayColumn {
  id: string
  type?: string
  text: string | null
  value: string | null
}
interface MondayItem {
  id: string
  name: string
  created_at: string
  group?: { title: string } | null
  column_values: MondayColumn[]
}

function parseJson(v: string | null): Record<string, unknown> | null {
  if (!v) return null
  try {
    const o = JSON.parse(v)
    return o && typeof o === "object" ? o : null
  } catch {
    return null
  }
}

export function itemToRow(item: MondayItem, boardId: string): ClientRow {
  const col = (id: string) => item.column_values.find((c) => c.id === id)
  const phoneCol = col(PHONE_COL)
  const emailCol = col(EMAIL_COL)
  const totalCol = col(TOTAL_COL)
  const phoneRaw = String(parseJson(phoneCol?.value ?? null)?.phone ?? phoneCol?.text ?? "").trim()
  const email = String(parseJson(emailCol?.value ?? null)?.email ?? emailCol?.text ?? "").trim().toLowerCase()
  const num = (c?: MondayColumn) => {
    const n = Number(String(c?.text ?? "").replace(/[^\d.\-]/g, ""))
    return Number.isFinite(n) ? n : 0
  }
  const total = num(totalCol)
  const delivery = DELIVERY_COL ? col(DELIVERY_COL) : item.column_values.find((c) => c.type === "timeline" || c.type === "timerange")
  const to = parseJson(delivery?.value ?? null)?.to
  const expectedDelivery = typeof to === "string" && /^\d{4}-\d{2}-\d{2}/.test(to) ? to.slice(0, 10) : null
  return {
    itemId: item.id,
    boardId,
    name: (item.name || "").trim(),
    phoneRaw,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "",
    total: Number.isFinite(total) ? total : 0,
    createdAt: item.created_at || "",
    jobOrderNo: String(col(JOB_ORDER_COL)?.text ?? "").trim(),
    group: String(item.group?.title ?? "").trim(),
    received: num(col(RECEIVED_COL)),
    expectedDelivery,
  }
}

const ITEM_FIELDS = `cursor items { id name created_at group { title } column_values { id type text value } }`

async function monday<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(process.env.MONDAY_API_URL || "https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token, "API-Version": "2024-10" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data || data.errors || data.error_message) {
    const msg = data?.errors?.[0]?.message || data?.error_message || `HTTP ${res.status}`
    throw new Error(`Monday.com: ${msg}`)
  }
  return data.data as T
}

/** Every item on the client boards. */
export async function fetchClientRows(): Promise<ClientRow[]> {
  const token = await mondayToken()
  const rows: ClientRow[] = []
  for (const boardId of clientBoardIds()) {
    type First = { boards: { items_page: { cursor: string | null; items: MondayItem[] } }[] }
    const first = await monday<First>(
      token,
      `query ($b: [ID!]) { boards(ids: $b) { items_page(limit: 500) { ${ITEM_FIELDS} } } }`,
      { b: [boardId] }
    )
    let page = first.boards?.[0]?.items_page
    if (!page) throw new Error(`Monday.com board ${boardId} was not found`)
    rows.push(...page.items.map((i) => itemToRow(i, boardId)))
    let guard = 0
    while (page.cursor && guard++ < 100) {
      type Next = { next_items_page: { cursor: string | null; items: MondayItem[] } }
      const next = await monday<Next>(token, `query ($c: String!) { next_items_page(limit: 500, cursor: $c) { ${ITEM_FIELDS} } }`, {
        c: page.cursor,
      })
      page = next.next_items_page
      rows.push(...page.items.map((i) => itemToRow(i, boardId)))
    }
  }
  return rows
}

/** The message staff copy into WhatsApp or email. */
export function welcomeMessage(name: string, phone: string, email: string | null, password: string, siteUrl: string): string {
  const first = name.split(/\s+/)[0] || name
  return [
    `Dear ${first},`,
    ``,
    `Welcome to the Al Subaiha Club. Your member account is ready.`,
    ``,
    `Sign in at ${siteUrl}/login`,
    `Mobile number: +${phone}${email ? `\nor email: ${email}` : ""}`,
    `Temporary password: ${password}`,
    ``,
    `You will be asked to choose your own password the first time you sign in.`,
    ``,
    `Al Subaiha Furniture`,
  ].join("\n")
}
