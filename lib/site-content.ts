/**
 * Website content managed in the admin: factory videos (Atelier Live) and FAQs.
 * Tables are created on first use, like the SEO tables.
 */
import { randomUUID } from "crypto"
import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"

const OPTS = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
let ready: Promise<unknown> | null = null

export function ensureContentTables(): Promise<unknown> {
  ready ??= (async () => {
    await query(`CREATE TABLE IF NOT EXISTS factory_videos (
      id VARCHAR(36) PRIMARY KEY,
      youtube_id VARCHAR(20) NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT NULL,
      upload_date DATETIME NULL,
      duration_seconds INT NULL,
      stage VARCHAR(80) NULL,
      link_label VARCHAR(120) NULL,
      link_url VARCHAR(300) NULL,
      sort_order INT NOT NULL DEFAULT 0,
      status VARCHAR(10) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_youtube (youtube_id)
    ) ${OPTS}`)
    await query(`CREATE TABLE IF NOT EXISTS faqs (
      id VARCHAR(36) PRIMARY KEY,
      question VARCHAR(300) NOT NULL,
      answer TEXT NOT NULL,
      pages TEXT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      status VARCHAR(10) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ${OPTS}`)
  })().catch((e) => {
    ready = null
    throw e
  })
  return ready
}

// ---------- helpers ----------

const text = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}
const int = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : null
}
const status = (v: unknown) => (v === "draft" ? "draft" : "active")

/** Accepts a YouTube ID or any YouTube URL (watch, youtu.be, shorts, embed). */
export function youtubeId(input: unknown): string | null {
  if (typeof input !== "string") return null
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/)
  return m ? m[1] : null
}

/** "1:25" / "85" / 85 -> seconds */
function seconds(v: unknown): number | null {
  if (typeof v === "number") return int(v, 1, 86400)
  if (typeof v !== "string" || !v.trim()) return null
  const parts = v.trim().split(":").map(Number)
  if (parts.some((n) => !Number.isFinite(n))) return null
  return int(parts.reduce((acc, n) => acc * 60 + n, 0), 1, 86400)
}

function dateTime(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace("T", " ")
}

/** Website paths a FAQ shows on, e.g. ["/faq", "/collections/sofas"]. */
function paths(v: unknown): string[] {
  const list = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[\n,]/) : []
  const out = list
    .filter((p): p is string => typeof p === "string")
    .map((p) => p.trim().replace(/^https?:\/\/[^/]+/i, "").split(/[?#]/)[0])
    .filter(Boolean)
    .map((p) => (p.startsWith("/") ? p : `/${p}`))
    .map((p) => (p.length > 1 ? p.replace(/\/+$/, "") : p))
    .slice(0, 50)
  return Array.from(new Set(out))
}

// ---------- factory videos ----------

export interface FactoryVideo {
  id: string
  youtubeId: string
  title: string
  description: string | null
  uploadDate: string | null
  durationSeconds: number | null
  stage: string | null
  linkLabel: string | null
  linkUrl: string | null
  sortOrder: number
  status: "active" | "draft"
}

interface VideoRow extends RowDataPacket {
  id: string
  youtube_id: string
  title: string
  description: string | null
  upload_date: Date | null
  duration_seconds: number | null
  stage: string | null
  link_label: string | null
  link_url: string | null
  sort_order: number
  status: string
}

const toVideo = (r: VideoRow): FactoryVideo => ({
  id: r.id,
  youtubeId: r.youtube_id,
  title: r.title,
  description: r.description,
  uploadDate: r.upload_date ? new Date(r.upload_date).toISOString() : null,
  durationSeconds: r.duration_seconds,
  stage: r.stage,
  linkLabel: r.link_label,
  linkUrl: r.link_url,
  sortOrder: r.sort_order,
  status: r.status === "draft" ? "draft" : "active",
})

export async function listVideos(onlyActive: boolean): Promise<FactoryVideo[]> {
  await ensureContentTables()
  const rows = await query<VideoRow[]>(
    `SELECT * FROM factory_videos ${onlyActive ? "WHERE status = 'active'" : ""}
     ORDER BY sort_order ASC, upload_date DESC, created_at DESC`
  )
  return rows.map(toVideo)
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string }

export async function saveVideo(body: Record<string, unknown>, id?: string): Promise<SaveResult> {
  await ensureContentTables()
  const yt = youtubeId(body.youtubeId ?? body.url)
  const title = text(body.title, 200)
  if (!yt) return { ok: false, error: "Enter a YouTube link or video ID" }
  if (!title) return { ok: false, error: "Title is required" }
  const linkUrl = text(body.linkUrl, 300)
  if (linkUrl && !/^(\/|https?:\/\/)/i.test(linkUrl)) return { ok: false, error: "Link must start with / or https://" }
  const values = [
    yt,
    title,
    text(body.description, 2000),
    dateTime(body.uploadDate),
    seconds(body.durationSeconds ?? body.duration),
    text(body.stage, 80),
    text(body.linkLabel, 120),
    linkUrl,
    int(body.sortOrder, -100000, 100000) ?? 0,
    status(body.status),
  ]
  try {
    if (id) {
      await query(
        `UPDATE factory_videos SET youtube_id=?, title=?, description=?, upload_date=?, duration_seconds=?, stage=?,
         link_label=?, link_url=?, sort_order=?, status=? WHERE id=?`,
        [...values, id]
      )
      return { ok: true, id }
    }
    const newId = randomUUID()
    await query(
      `INSERT INTO factory_videos (id, youtube_id, title, description, upload_date, duration_seconds, stage, link_label, link_url, sort_order, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId, ...values]
    )
    return { ok: true, id: newId }
  } catch (e) {
    if ((e as { code?: string }).code === "ER_DUP_ENTRY") return { ok: false, error: "This video is already in the list" }
    throw e
  }
}

export async function deleteVideo(id: string): Promise<void> {
  await ensureContentTables()
  await query("DELETE FROM factory_videos WHERE id = ?", [id])
}

// ---------- FAQs ----------

export interface Faq {
  id: string
  question: string
  answer: string
  /** Website paths the question appears on. Empty = FAQ page only. */
  pages: string[]
  sortOrder: number
  status: "active" | "draft"
}

interface FaqRow extends RowDataPacket {
  id: string
  question: string
  answer: string
  pages: string | null
  sort_order: number
  status: string
}

const toFaq = (r: FaqRow): Faq => {
  let pages: string[] = []
  try {
    const v = JSON.parse(r.pages || "[]")
    if (Array.isArray(v)) pages = v.filter((p) => typeof p === "string")
  } catch {
    /* empty */
  }
  return { id: r.id, question: r.question, answer: r.answer, pages, sortOrder: r.sort_order, status: r.status === "draft" ? "draft" : "active" }
}

/** FAQ page = "/faq". A FAQ with no pages set shows on the FAQ page only. */
export const FAQ_PAGE = "/faq"

export async function listFaqs(opts: { onlyActive: boolean; page?: string | null }): Promise<Faq[]> {
  await ensureContentTables()
  const rows = await query<FaqRow[]>(
    `SELECT * FROM faqs ${opts.onlyActive ? "WHERE status = 'active'" : ""} ORDER BY sort_order ASC, created_at ASC`
  )
  const all = rows.map(toFaq)
  if (!opts.page) return all
  const page = paths([opts.page])[0]
  if (!page) return []
  return all.filter((f) => (f.pages.length ? f.pages.includes(page) : page === FAQ_PAGE))
}

export async function saveFaq(body: Record<string, unknown>, id?: string): Promise<SaveResult> {
  await ensureContentTables()
  const question = text(body.question, 300)
  const answer = text(body.answer, 5000)
  if (!question) return { ok: false, error: "Question is required" }
  if (!answer) return { ok: false, error: "Answer is required" }
  const values = [question, answer, JSON.stringify(paths(body.pages)), int(body.sortOrder, -100000, 100000) ?? 0, status(body.status)]
  if (id) {
    await query("UPDATE faqs SET question=?, answer=?, pages=?, sort_order=?, status=? WHERE id=?", [...values, id])
    return { ok: true, id }
  }
  const newId = randomUUID()
  await query("INSERT INTO faqs (id, question, answer, pages, sort_order, status) VALUES (?, ?, ?, ?, ?, ?)", [newId, ...values])
  return { ok: true, id: newId }
}

export async function deleteFaq(id: string): Promise<void> {
  await ensureContentTables()
  await query("DELETE FROM faqs WHERE id = ?", [id])
}
