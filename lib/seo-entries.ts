import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"
import { STATIC_PAGES, SEO_ENTITY_TYPES, getSeoMap, type SeoEntityType, type SeoOverride } from "@/lib/seo"

export interface SeoEntry {
  type: SeoEntityType
  key: string
  label: string
  /** Website path, e.g. /collections/sofas */
  path: string
  seo: SeoOverride | null
  /** Values the website falls back to when there is no override. */
  defaults: { title: string | null; description: string | null; image: string | null }
}

interface ProductRow extends RowDataPacket {
  name: string
  slug: string
  category_slug: string | null
  description: string | null
  image: string | null
  images: unknown
}
interface CategoryRow extends RowDataPacket { name: string; slug: string; parent_name: string | null; description: string | null; image: string | null }
interface ProjectRow extends RowDataPacket { id: string; title: string; location: string | null }
interface BlogRow extends RowDataPacket { title: string; slug: string; excerpt: string | null; image: string | null }
interface DesignerRow extends RowDataPacket { id: string; name: string }

export function firstImage(images: unknown): string | null {
  let v = images
  if (typeof v === "string") {
    try { v = JSON.parse(v) } catch { return null }
  }
  if (!Array.isArray(v) || !v.length) return null
  const f = v[0]
  return typeof f === "string" ? f : typeof f?.url === "string" ? f.url : null
}

export function allImages(images: unknown): string[] {
  let v = images
  if (typeof v === "string") {
    try { v = JSON.parse(v) } catch { return [] }
  }
  if (!Array.isArray(v)) return []
  return v.map((f) => (typeof f === "string" ? f : f?.url)).filter((u): u is string => typeof u === "string" && !!u)
}

const plain = (html: string | null, max = 160): string | null => {
  const t = (html ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
  return t ? t.slice(0, max) : null
}

const noDefaults = { title: null, description: null, image: null }

export async function listEntries(type: SeoEntityType): Promise<SeoEntry[]> {
  const overrides = await getSeoMap(type)
  const seo = (k: string) => overrides.get(k) ?? null

  if (type === "page") {
    const pages: SeoEntry[] = STATIC_PAGES.map((p) => ({ type, key: p.key, label: p.label, path: p.key, seo: seo(p.key), defaults: noDefaults }))
    // Blog posts: keyed by their website path so the website can look them up.
    const blogs = await query<BlogRow[]>(`SELECT title, slug, excerpt, image FROM blogs WHERE slug IS NOT NULL AND slug <> '' AND status = 'active' ORDER BY created_at DESC`).catch(() => [] as BlogRow[])
    for (const b of blogs) {
      const key = `/blogs/${b.slug}`
      pages.push({ type, key, label: `Blog: ${b.title}`, path: key, seo: seo(key), defaults: { title: null, description: plain(b.excerpt), image: b.image || null } })
    }
    return pages
  }
  if (type === "product") {
    const rows = await query<ProductRow[]>(
      `SELECT p.name, p.slug, p.description, p.image, p.images, c.slug AS category_slug
       FROM products p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.slug IS NOT NULL AND p.status <> 'archived' ORDER BY p.name`
    )
    return rows.map((p) => ({
      type, key: p.slug, label: p.name,
      path: `/${p.category_slug ?? "products"}/${p.slug}`,
      seo: seo(p.slug),
      defaults: { title: null, description: plain(p.description), image: firstImage(p.images) ?? (p.image || null) },
    }))
  }
  if (type === "category") {
    const rows = await query<CategoryRow[]>(
      `SELECT c.name, c.slug, c.description, c.image, p.name AS parent_name FROM categories c
       LEFT JOIN categories p ON c.parent_id = p.id WHERE c.status = 'active'
       ORDER BY c.level, c.sort_order, c.name`
    )
    return rows.map((c) => ({
      type, key: c.slug, label: c.parent_name ? `${c.parent_name} › ${c.name}` : c.name,
      path: `/collections/${c.slug}`, seo: seo(c.slug),
      defaults: { title: null, description: plain(c.description), image: c.image || null },
    }))
  }
  if (type === "project") {
    const rows = await query<ProjectRow[]>(`SELECT id, title, location FROM projects WHERE status = 'active' ORDER BY sort_order, title`)
    // A project's address comes from its canonical URL (/projects/<slug>), as on the website.
    const slugOf = (url: string | null | undefined): string | null => {
      const m = (url ?? "").match(/^https?:\/\/[^/]+\/projects\/([^/?#]+)\/?$/i)
      return m && !/^proj_/i.test(m[1]) ? decodeURIComponent(m[1]).toLowerCase() : null
    }
    return rows.map((p) => ({
      type, key: p.id, label: p.location ? `${p.title} (${p.location})` : p.title,
      path: `/projects/${slugOf(seo(p.id)?.canonicalUrl) ?? p.id}`, seo: seo(p.id), defaults: noDefaults,
    }))
  }
  const rows = await query<DesignerRow[]>(`SELECT id, name FROM designers WHERE status = 'active' ORDER BY sort_order, name`)
  return rows.map((d) => ({
    type, key: d.id, label: d.name, path: `/designers/${d.id}`, seo: seo(d.id), defaults: noDefaults,
  }))
}

export async function listAllEntries(): Promise<SeoEntry[]> {
  const lists = await Promise.all(SEO_ENTITY_TYPES.map((t) => listEntries(t)))
  return lists.flat()
}
