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

export interface OrgAddress {
  streetAddress: string
  addressLocality: string
  addressRegion: string
  postalCode: string
  addressCountry: string
}

/** Business details used for the website's Organization / LocalBusiness schema. */
export interface SeoOrg {
  name: string
  legalName: string
  url: string
  logo: string
  /** Photo of the showroom / factory for the business listing. */
  image: string
  sameAs: string[]
  phone: string
  email: string
  foundingDate: string
  address: OrgAddress
  geo: { latitude: number | null; longitude: number | null }
  /** schema.org format, one entry per line, e.g. "Sa-Th 08:00-18:00" */
  openingHours: string[]
  priceRange: string
  areaServed: string[]
  /** Overall Google rating, e.g. 4.6 from 115 reviews. Empty = not shown. */
  rating: { value: number | null; count: number | null }
}

export interface SeoTracking {
  ga4Id: string
  metaPixelId: string
  gscVerification: string
  bingVerification: string
  gtmId: string
  googleAdsId: string
}

export interface SeoSettings {
  robotsTxt: string
  sitemapExclude: string[] // website paths left out of the sitemap
  org: SeoOrg
  tracking: SeoTracking
  currency: string
}

const emptyAddress = (): OrgAddress => ({ streetAddress: "", addressLocality: "", addressRegion: "", postalCode: "", addressCountry: "" })

export const DEFAULT_SITE_URL = "https://alsubaiha.ae"

export const defaultSettings = (): SeoSettings => ({
  robotsTxt: `User-agent: *\nAllow: /\nDisallow: /cart\nDisallow: /checkout\nDisallow: /account\n\nSitemap: ${DEFAULT_SITE_URL}/sitemap.xml`,
  sitemapExclude: [],
  org: {
    name: "Al Subaiha", legalName: "", url: DEFAULT_SITE_URL, logo: "", image: "", sameAs: [], phone: "", email: "",
    foundingDate: "", address: emptyAddress(), geo: { latitude: null, longitude: null }, openingHours: [],
    priceRange: "", areaServed: [], rating: { value: null, count: null },
  },
  tracking: { ga4Id: "", metaPixelId: "", gscVerification: "", bingVerification: "", gtmId: "", googleAdsId: "" },
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
    const org = { ...d.org, ...s.org }
    org.address = { ...d.org.address, ...(s.org?.address ?? {}) }
    org.geo = { ...d.org.geo, ...(s.org?.geo ?? {}) }
    org.rating = { ...d.org.rating, ...(s.org?.rating ?? {}) }
    return { ...d, ...s, org, tracking: { ...d.tracking, ...s.tracking } }
  } catch {
    return d
  }
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const idLike = (v: unknown, max = 60) => str(v, max).replace(/[^\w\-.:]/g, "")

/** A field left out of the request keeps its saved value (older forms don't send new fields). */
const keep = <T,>(v: unknown, current: T, clean: (v: unknown) => T): T => (v === undefined ? current : clean(v))

const num = (v: unknown, min: number, max: number): number | null => {
  if (v === null || v === "" || v === undefined) return null
  const n = typeof v === "number" ? v : Number(String(v).trim())
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

const lines = (v: unknown, maxItems: number, maxLen: number): string[] =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split("\n") : [])
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxItems)

function cleanOrg(o: Partial<SeoOrg> & Record<string, any>, cur: SeoOrg): SeoOrg {
  const a = o.address
  return {
    name: keep(o.name, cur.name, (v) => str(v, 120)),
    legalName: keep(o.legalName, cur.legalName, (v) => str(v, 160)),
    url: keep(o.url, cur.url, (v) => str(v, 300)),
    logo: keep(o.logo, cur.logo, (v) => str(v, 500)),
    image: keep(o.image, cur.image, (v) => str(v, 500)),
    sameAs: keep(o.sameAs, cur.sameAs, (v) =>
      lines(v, 20, 300).filter((u) => /^https?:\/\//i.test(u))
    ),
    phone: keep(o.phone, cur.phone, (v) => str(v, 40)),
    email: keep(o.email, cur.email, (v) => str(v, 120)),
    foundingDate: keep(o.foundingDate, cur.foundingDate, (v) => str(v, 10).replace(/[^\d-]/g, "")),
    address:
      a === undefined
        ? cur.address
        : {
            streetAddress: str(a?.streetAddress, 200),
            addressLocality: str(a?.addressLocality, 100),
            addressRegion: str(a?.addressRegion, 100),
            postalCode: str(a?.postalCode, 20),
            addressCountry: str(a?.addressCountry, 2).toUpperCase(),
          },
    geo:
      o.geo === undefined
        ? cur.geo
        : { latitude: num(o.geo?.latitude, -90, 90), longitude: num(o.geo?.longitude, -180, 180) },
    openingHours: keep(o.openingHours, cur.openingHours, (v) => lines(v, 14, 60)),
    priceRange: keep(o.priceRange, cur.priceRange, (v) => str(v, 20)),
    areaServed: keep(o.areaServed, cur.areaServed, (v) => lines(v, 30, 80)),
    rating:
      o.rating === undefined
        ? cur.rating
        : { value: num(o.rating?.value, 1, 5), count: num(o.rating?.count, 1, 10_000_000) },
  }
}

export async function saveSettings(input: Partial<SeoSettings>): Promise<SeoSettings> {
  const cur = await getSettings()
  const next: SeoSettings = {
    robotsTxt: input.robotsTxt !== undefined ? str(input.robotsTxt, 5000) : cur.robotsTxt,
    sitemapExclude: Array.isArray(input.sitemapExclude)
      ? input.sitemapExclude.filter((p): p is string => typeof p === "string" && p.startsWith("/")).slice(0, 5000)
      : cur.sitemapExclude,
    org: input.org ? cleanOrg(input.org, cur.org) : cur.org,
    tracking: input.tracking
      ? {
          ga4Id: idLike(input.tracking.ga4Id),
          metaPixelId: idLike(input.tracking.metaPixelId),
          gscVerification: idLike(input.tracking.gscVerification, 120),
          bingVerification: idLike(input.tracking.bingVerification, 120),
          gtmId: keep(input.tracking.gtmId, cur.tracking.gtmId, (v) => idLike(v)),
          googleAdsId: keep(input.tracking.googleAdsId, cur.tracking.googleAdsId, (v) => idLike(v)),
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
