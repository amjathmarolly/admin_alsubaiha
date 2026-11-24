import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"

export const SEO_ENTITY_TYPES = ["page", "product", "category", "project", "designer"] as const
export type SeoEntityType = (typeof SEO_ENTITY_TYPES)[number]

export const isSeoEntityType = (v: unknown): v is SeoEntityType =>
  typeof v === "string" && (SEO_ENTITY_TYPES as readonly string[]).includes(v)

export interface SeoOverride {
  title: string | null
  description: string | null
  ogImage: string | null
  canonicalUrl: string | null
  noindex: boolean
  twitterCard: "summary" | "summary_large_image" | null
  twitterImage: string | null
}

interface SeoRow extends RowDataPacket {
  title: string | null
  description: string | null
  og_image: string | null
  canonical_url: string | null
  noindex: number
  twitter_card: string | null
  twitter_image: string | null
}

// Website routes whose metadata can be edited in Admin -> SEO.
// Keys are the route paths used by the website's generateMetadata.
export const STATIC_PAGES: { key: string; label: string }[] = [
  { key: "/", label: "Home" },
  { key: "/about", label: "About / Our Story" },
  { key: "/contact", label: "Contact" },
  { key: "/faq", label: "FAQ" },
  { key: "/shipping", label: "Shipping" },
  { key: "/returns", label: "Returns" },
  { key: "/care", label: "Care guide" },
  { key: "/how-we-work", label: "How we work" },
  { key: "/testimonials", label: "Testimonials" },
  { key: "/projects", label: "Projects" },
  { key: "/blogs", label: "Blogs" },
  { key: "/atelier-live", label: "Atelier Live" },
]

let tableReady: Promise<unknown> | null = null

export function ensureSeoTable(): Promise<unknown> {
  tableReady ??= query(
    `CREATE TABLE IF NOT EXISTS seo_metadata (
       id VARCHAR(36) PRIMARY KEY,
       entity_type VARCHAR(20) NOT NULL,
       entity_key VARCHAR(255) NOT NULL,
       title VARCHAR(255) NULL,
       description TEXT NULL,
       og_image VARCHAR(500) NULL,
       canonical_url VARCHAR(500) NULL,
       noindex BOOLEAN NOT NULL DEFAULT FALSE,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       UNIQUE KEY uq_seo_entity (entity_type, entity_key)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  )
    .then(() => addColumnIfMissing("seo_metadata", "twitter_card", "VARCHAR(30) NULL"))
    .then(() => addColumnIfMissing("seo_metadata", "twitter_image", "VARCHAR(500) NULL"))
    .catch((err) => {
      tableReady = null
      throw err
    })
  return tableReady
}

export async function addColumnIfMissing(table: string, column: string, ddl: string) {
  const rows = await query<RowDataPacket[]>(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  )
  if (!rows.length) await query(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`)
}

const toOverride = (r: SeoRow): SeoOverride => ({
  title: r.title,
  description: r.description,
  ogImage: r.og_image,
  canonicalUrl: r.canonical_url,
  noindex: Boolean(r.noindex),
  twitterCard: r.twitter_card === "summary" || r.twitter_card === "summary_large_image" ? r.twitter_card : null,
  twitterImage: r.twitter_image,
})

export async function getSeo(type: SeoEntityType, key: string): Promise<SeoOverride | null> {
  await ensureSeoTable()
  const rows = await query<SeoRow[]>(
    `SELECT title, description, og_image, canonical_url, noindex, twitter_card, twitter_image
     FROM seo_metadata WHERE entity_type = ? AND entity_key = ? LIMIT 1`,
    [type, key]
  )
  return rows.length ? toOverride(rows[0]) : null
}

export async function getSeoMap(type: SeoEntityType): Promise<Map<string, SeoOverride>> {
  await ensureSeoTable()
  const rows = await query<(SeoRow & { entity_key: string })[]>(
    `SELECT entity_key, title, description, og_image, canonical_url, noindex, twitter_card, twitter_image
     FROM seo_metadata WHERE entity_type = ?`,
    [type]
  )
  return new Map(rows.map((r) => [r.entity_key, toOverride(r)]))
}

/** Saves an override; an entirely empty override deletes the row (falls back to defaults). */
export async function saveSeo(type: SeoEntityType, key: string, o: SeoOverride): Promise<void> {
  await ensureSeoTable()
  const empty = !o.title && !o.description && !o.ogImage && !o.canonicalUrl && !o.noindex && !o.twitterCard && !o.twitterImage
  if (empty) {
    await query("DELETE FROM seo_metadata WHERE entity_type = ? AND entity_key = ?", [type, key])
    return
  }
  await query(
    `INSERT INTO seo_metadata (id, entity_type, entity_key, title, description, og_image, canonical_url, noindex, twitter_card, twitter_image)
     VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description),
       og_image = VALUES(og_image), canonical_url = VALUES(canonical_url), noindex = VALUES(noindex),
       twitter_card = VALUES(twitter_card), twitter_image = VALUES(twitter_image)`,
    [type, key, o.title, o.description, o.ogImage, o.canonicalUrl, o.noindex ? 1 : 0, o.twitterCard, o.twitterImage]
  )
}

/**
 * Tells the website to drop its cached SEO data so edits show immediately.
 * Best effort: the website also expires its cache on its own after ~60s.
 */
export async function revalidateWebsite(): Promise<boolean> {
  const base = process.env.WEBSITE_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!base || !secret) return false
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ tag: "seo" }),
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}
