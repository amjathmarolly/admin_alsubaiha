import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"

let ready: Promise<unknown> | null = null

/** Creates the tables used by the SEO tools (idempotent). */
export function ensureSeoToolTables(): Promise<unknown> {
  ready ??= (async () => {
    const opts = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    await query(`CREATE TABLE IF NOT EXISTS seo_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value LONGTEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ${opts}`)
    await query(`CREATE TABLE IF NOT EXISTS seo_image_alt (
      image_url VARCHAR(500) NOT NULL,
      alt_text VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (image_url(255))
    ) ${opts}`)
    await query(`CREATE TABLE IF NOT EXISTS seo_redirects (
      id VARCHAR(36) PRIMARY KEY,
      from_path VARCHAR(500) NOT NULL,
      to_path VARCHAR(500) NOT NULL,
      status_code SMALLINT NOT NULL DEFAULT 301,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_from (from_path(255))
    ) ${opts}`)
    await query(`CREATE TABLE IF NOT EXISTS seo_404_log (
      path VARCHAR(500) NOT NULL,
      hits INT NOT NULL DEFAULT 1,
      referrer VARCHAR(500) NULL,
      first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (path(255))
    ) ${opts}`)
  })().catch((e) => {
    ready = null
    throw e
  })
  return ready
}

// ---------- settings ----------

export interface SeoSettings {
  robotsTxt: string
  sitemapExclude: string[] // website paths left out of the sitemap
  org: { name: string; url: string; logo: string; sameAs: string[]; phone: string; email: string }
  tracking: { ga4Id: string; metaPixelId: string; gscVerification: string; bingVerification: string }
  currency: string
}

export const DEFAULT_SITE_URL = "https://alsubaiha.ae"

export const defaultSettings = (): SeoSettings => ({
  robotsTxt: `User-agent: *\nAllow: /\nDisallow: /cart\nDisallow: /checkout\nDisallow: /account\n\nSitemap: ${DEFAULT_SITE_URL}/sitemap.xml`,
  sitemapExclude: [],
  org: { name: "Al Subaiha", url: DEFAULT_SITE_URL, logo: "", sameAs: [], phone: "", email: "" },
  tracking: { ga4Id: "", metaPixelId: "", gscVerification: "", bingVerification: "" },
  currency: "AED",
})

export const siteUrl = () => (process.env.WEBSITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "")

export async function getSettings(): Promise<SeoSettings> {
  await ensureSeoToolTables()
  const rows = await query<(RowDataPacket & { setting_value: string })[]>(
    "SELECT setting_value FROM seo_settings WHERE setting_key = 'site' LIMIT 1"
  )
  const d = defaultSettings()
  if (!rows.length) return d
  try {
    const s = JSON.parse(rows[0].setting_value)
    return { ...d, ...s, org: { ...d.org, ...s.org }, tracking: { ...d.tracking, ...s.tracking } }
  } catch {
    return d
  }
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const idLike = (v: unknown, max = 60) => str(v, max).replace(/[^\w\-.:]/g, "")

export async function saveSettings(input: Partial<SeoSettings>): Promise<SeoSettings> {
  const cur = await getSettings()
  const next: SeoSettings = {
    robotsTxt: input.robotsTxt !== undefined ? str(input.robotsTxt, 5000) : cur.robotsTxt,
    sitemapExclude: Array.isArray(input.sitemapExclude)
      ? input.sitemapExclude.filter((p): p is string => typeof p === "string" && p.startsWith("/")).slice(0, 5000)
      : cur.sitemapExclude,
    org: input.org
      ? {
          name: str(input.org.name, 120),
          url: str(input.org.url, 300),
          logo: str(input.org.logo, 500),
          sameAs: (Array.isArray(input.org.sameAs) ? input.org.sameAs : [])
            .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u.trim()))
            .map((u) => u.trim())
            .slice(0, 20),
          phone: str(input.org.phone, 40),
          email: str(input.org.email, 120),
        }
      : cur.org,
    tracking: input.tracking
      ? {
          ga4Id: idLike(input.tracking.ga4Id),
          metaPixelId: idLike(input.tracking.metaPixelId),
          gscVerification: idLike(input.tracking.gscVerification, 120),
          bingVerification: idLike(input.tracking.bingVerification, 120),
        }
      : cur.tracking,
    currency: input.currency !== undefined ? str(input.currency, 3).toUpperCase() || "AED" : cur.currency,
  }
  await query(
    `INSERT INTO seo_settings (setting_key, setting_value) VALUES ('site', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [JSON.stringify(next)]
  )
  return next
}

// ---------- path helpers ----------

export function normalizePath(p: string): string {
  let path = p.trim()
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname
  } catch {
    /* keep as is */
  }
  path = path.split("#")[0].split("?")[0]
  if (!path.startsWith("/")) path = "/" + path
  if (path.length > 1) path = path.replace(/\/+$/, "")
  return path.slice(0, 500)
}

// ---------- XML ----------

export const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
