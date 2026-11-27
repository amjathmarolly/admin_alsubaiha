/**
 * Size and material choices on product pages.
 *
 * - Sizes: three fixed steps per product (Standard, Large, Extra large), each with
 *   its own dimensions and price. A product without its own sizes uses its
 *   category's standard steps, priced from the product's listed price.
 * - Materials: one shop-wide list (Admin -> Materials), each with a % extra on top
 *   of the size price. A product shows the materials for its category, or the
 *   ones staff picked for it.
 * - The listed price is the starting price: Standard size, base material.
 */
import type { RowDataPacket } from "mysql2"
import { query } from "@/lib/db/config"
import { addColumnIfMissing } from "@/lib/seo"

export interface SizeOption {
  label: string
  width: number // cm
  depth: number // cm
  height: number // cm
  price: number // AED, base material
}

export interface MaterialTier {
  id: string
  name: string
  description: string | null
  surchargePct: number
  /** Category names it applies to; empty = every category. */
  categories: string[]
  sortOrder: number
  status: "active" | "draft"
}

export interface ProductOptions {
  sizes: (SizeOption & { fromCategory: boolean })[]
  materials: { id: string; name: string; description: string | null; surchargePct: number }[]
  /** Starting price: first size, first (cheapest) material. */
  fromPrice: number
  /** Most expensive combination. */
  toPrice: number
  note: string
}

const UPHOLSTERED = ["Sofa", "Armchair", "Dining Chair", "Bench", "Bedroom", "Bar Stool"]
const TABLES = ["Coffee Table", "Dining Table", "Side Table", "Console Table", "Buffet", "Nightstand"]

/** Standard steps per category: [label, W, D, H, price factor]. Sizes in cm. */
const CATEGORY_SIZES: Record<string, [string, number, number, number, number][]> = {
  Sofa: [["3-seater", 220, 95, 80, 1], ["4-seater", 260, 100, 80, 1.15], ["5-seater", 300, 105, 80, 1.3]],
  Armchair: [["Standard", 80, 85, 80, 1], ["Large", 90, 90, 85, 1.15], ["Extra large", 100, 95, 90, 1.3]],
  "Dining Chair": [["Standard", 50, 55, 85, 1], ["Large", 55, 60, 90, 1.1], ["Extra large", 60, 62, 95, 1.2]],
  "Bar Stool": [["Counter height", 45, 45, 95, 1], ["Bar height", 45, 45, 105, 1.05], ["Large bar height", 50, 50, 110, 1.15]],
  Bench: [["140 cm", 140, 45, 45, 1], ["160 cm", 160, 45, 45, 1.12], ["180 cm", 180, 50, 45, 1.25]],
  Bedroom: [["Queen 160 x 200", 160, 200, 120, 1], ["King 180 x 200", 180, 200, 120, 1.12], ["Super king 200 x 200", 200, 200, 120, 1.25]],
  "Coffee Table": [["Standard", 100, 60, 40, 1], ["Large", 120, 70, 40, 1.15], ["Extra large", 140, 80, 40, 1.3]],
  "Dining Table": [["6 seats", 180, 90, 75, 1], ["8 seats", 220, 100, 75, 1.25], ["10 seats", 260, 110, 75, 1.5]],
  "Side Table": [["Standard", 50, 50, 55, 1], ["Large", 60, 60, 55, 1.12], ["Extra large", 70, 70, 55, 1.25]],
  Nightstand: [["Standard", 50, 40, 55, 1], ["Large", 60, 45, 55, 1.12], ["Extra large", 70, 45, 60, 1.25]],
  "Console Table": [["120 cm", 120, 40, 80, 1], ["140 cm", 140, 40, 80, 1.12], ["160 cm", 160, 45, 85, 1.25]],
  Buffet: [["180 cm", 180, 45, 80, 1], ["200 cm", 200, 50, 80, 1.12], ["240 cm", 240, 50, 85, 1.3]],
}
const FALLBACK_SIZES: [string, number, number, number, number][] = [
  ["Standard", 0, 0, 0, 1],
  ["Large", 0, 0, 0, 1.15],
  ["Extra large", 0, 0, 0, 1.3],
]

/** Starting materials (editable in Admin -> Materials). Added only when the list is empty. */
const STARTER_MATERIALS: [string, string, number, string[]][] = [
  ["Performance fabric", "Stain-resistant, easy-clean upholstery fabric", 0, UPHOLSTERED],
  ["Boucle", "Soft looped textured fabric", 10, UPHOLSTERED],
  ["Velvet", "Rich, deep-pile velvet", 15, UPHOLSTERED],
  ["Genuine leather", "Full-grain leather upholstery", 35, UPHOLSTERED],
  ["Oak veneer", "Natural oak finish", 0, TABLES],
  ["Walnut veneer", "Rich walnut finish", 12, TABLES],
  ["Lacquer", "High-gloss or matte lacquer in any colour", 10, TABLES],
  ["Natural marble", "Natural marble top or body", 25, TABLES],
]

const roundPrice = (n: number) => Math.round(n / 10) * 10

let ready: Promise<void> | null = null
export function ensureOptionTables(): Promise<void> {
  ready ??= (async () => {
    await query(
      `CREATE TABLE IF NOT EXISTS material_tiers (
         id VARCHAR(50) NOT NULL PRIMARY KEY,
         name VARCHAR(120) NOT NULL,
         description VARCHAR(300) NULL,
         surcharge_pct DECIMAL(6,2) NOT NULL DEFAULT 0,
         categories TEXT NULL,
         sort_order INT NOT NULL DEFAULT 0,
         status VARCHAR(10) NOT NULL DEFAULT 'active',
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       )`
    )
    await addColumnIfMissing("products", "size_options", "TEXT NULL")
    await addColumnIfMissing("products", "material_ids", "TEXT NULL")
    const [n] = await query<(RowDataPacket & { c: number })[]>("SELECT COUNT(*) AS c FROM material_tiers")
    if (!Number(n?.c)) {
      let i = 0
      for (const [name, description, pct, cats] of STARTER_MATERIALS) {
        await query(
          "INSERT IGNORE INTO material_tiers (id, name, description, surcharge_pct, categories, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
          [`mat-${name.toLowerCase().replace(/[^a-z]+/g, "-")}`, name, description, pct, JSON.stringify(cats), (i += 10)]
        )
      }
    }
  })().catch((e) => {
    ready = null
    throw e
  })
  return ready
}

interface TierRow extends RowDataPacket {
  id: string
  name: string
  description: string | null
  surcharge_pct: string
  categories: string | null
  sort_order: number
  status: string
}

const parseList = (v: string | null): string[] => {
  try {
    const a = JSON.parse(v ?? "[]")
    return Array.isArray(a) ? a.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

function toTier(r: TierRow): MaterialTier {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    surchargePct: Number(r.surcharge_pct) || 0,
    categories: parseList(r.categories),
    sortOrder: r.sort_order,
    status: r.status === "draft" ? "draft" : "active",
  }
}

export async function listMaterials(onlyActive = true): Promise<MaterialTier[]> {
  await ensureOptionTables()
  const rows = await query<TierRow[]>(
    `SELECT * FROM material_tiers ${onlyActive ? "WHERE status = 'active'" : ""} ORDER BY sort_order, name`
  )
  return rows.map(toTier)
}

export async function saveMaterial(input: Record<string, unknown>, id?: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await ensureOptionTables()
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 120) : ""
  if (!name) return { ok: false, error: "Name is required" }
  const pct = Number(input.surchargePct)
  if (!Number.isFinite(pct) || pct < 0 || pct > 500) return { ok: false, error: "Extra % must be a number from 0 to 500" }
  const raw = Array.isArray(input.categories)
    ? input.categories
    : typeof input.categories === "string"
      ? input.categories.split(/[,\n]/)
      : []
  const categories = raw.map((c) => String(c).trim()).filter(Boolean).slice(0, 50)
  const description = typeof input.description === "string" ? input.description.trim().slice(0, 300) || null : null
  const sortOrder = Math.round(Number(input.sortOrder) || 0)
  const status = input.status === "draft" ? "draft" : "active"
  const newId = id ?? `mat-${Date.now().toString(36)}`
  if (id) {
    await query(
      "UPDATE material_tiers SET name = ?, description = ?, surcharge_pct = ?, categories = ?, sort_order = ?, status = ? WHERE id = ?",
      [name, description, pct, JSON.stringify(categories), sortOrder, status, id]
    )
  } else {
    await query(
      "INSERT INTO material_tiers (id, name, description, surcharge_pct, categories, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [newId, name, description, pct, JSON.stringify(categories), sortOrder, status]
    )
  }
  return { ok: true, id: newId }
}

export async function deleteMaterial(id: string): Promise<void> {
  await ensureOptionTables()
  await query("DELETE FROM material_tiers WHERE id = ?", [id])
}

/** Sizes a product's own options may hold (anything else is dropped). */
export function cleanSizes(input: unknown): SizeOption[] | null | { error: string } {
  if (input === null) return null
  if (!Array.isArray(input)) return { error: "Sizes must be a list" }
  const out: SizeOption[] = []
  for (const s of input.slice(0, 6)) {
    const label = typeof s?.label === "string" ? s.label.trim().slice(0, 60) : ""
    const num = (v: unknown) => Math.max(0, Math.round(Number(v) || 0))
    const price = Number(s?.price)
    if (!label) return { error: "Each size needs a name" }
    if (!Number.isFinite(price) || price <= 0) return { error: `"${label}" needs a price` }
    out.push({ label, width: num(s.width), depth: num(s.depth), height: num(s.height), price: Math.round(price) })
  }
  return out.length ? out : null
}

interface ProductRow extends RowDataPacket {
  dimensions: string | null
  price: string
  category_name: string | null
  size_options: string | null
  material_ids: string | null
}

/** The size and material choices shown on one product's page, with prices. */
export function buildOptions(
  product: {
    price: number | string
    category_name?: string | null
    size_options?: string | null
    material_ids?: string | null
    /** Measurements stored on the product (JSON or object {width, depth, height}). */
    dimensions?: unknown
  },
  materials: MaterialTier[]
): ProductOptions {
  const base = Number(product.price) || 0
  const category = product.category_name ?? ""
  let own: SizeOption[] | null = null
  try {
    const parsed = JSON.parse(product.size_options ?? "null")
    const clean = cleanSizes(parsed)
    own = Array.isArray(clean) ? clean : null
  } catch {
    own = null
  }
  const sizes = own
    ? own.map((s) => ({ ...s, fromCategory: false }))
    : (CATEGORY_SIZES[category] ?? FALLBACK_SIZES).map(([label, width, depth, height, factor]) => ({
        label,
        width,
        depth,
        height,
        price: roundPrice(base * factor),
        fromCategory: true,
      }))
  if (sizes.length && sizes[0].fromCategory) {
    sizes[0].price = base // the listed price stays exact
    // A product with its own stored measurements: the first step uses them, and the
    // larger steps grow its width in the same proportion as the category steps.
    const d = storedDimensions(product.dimensions)
    if (d) {
      const t = sizes.map((x) => x.width)
      sizes.forEach((x, i) => {
        x.width = t[0] ? Math.round((d.width * t[i]) / t[0]) : d.width
        x.depth = d.depth
        x.height = d.height
      })
    }
  }

  const chosen = parseList(product.material_ids ?? null)
  const offered = materials
    .filter((m) => m.status === "active")
    .filter((m) => (chosen.length ? chosen.includes(m.id) : !m.categories.length || m.categories.includes(category)))
    .sort((a, b) => a.surchargePct - b.surchargePct || a.sortOrder - b.sortOrder)
    .map((m) => ({ id: m.id, name: m.name, description: m.description, surchargePct: m.surchargePct }))

  const prices = sizes.flatMap((s) => (offered.length ? offered : [{ surchargePct: 0 }]).map((m) => priceFor(s.price, m.surchargePct)))
  return {
    sizes,
    materials: offered,
    fromPrice: prices.length ? Math.min(...prices) : base,
    toPrice: prices.length ? Math.max(...prices) : base,
    note: "Standard sizes shown; every piece can also be made to your exact measurements. Final price confirmed by our team.",
  }
}

/** Price of one size in one material. No extra keeps the size price exact. */
export function priceFor(sizePrice: number, surchargePct: number): number {
  return surchargePct ? roundPrice(sizePrice * (1 + surchargePct / 100)) : sizePrice
}

function storedDimensions(v: unknown): { width: number; depth: number; height: number } | null {
  let o: unknown = v
  if (typeof v === "string") {
    try {
      o = JSON.parse(v)
    } catch {
      return null
    }
  }
  if (!o || typeof o !== "object") return null
  const n = (x: unknown) => Math.max(0, Math.round(Number(x) || 0))
  const r = o as Record<string, unknown>
  const d = { width: n(r.width), depth: n(r.depth), height: n(r.height) }
  return d.width ? d : null
}

export async function optionsForProduct(productId: string): Promise<ProductOptions | null> {
  await ensureOptionTables()
  const [p] = await query<ProductRow[]>(
    `SELECT p.price, c.name AS category_name, p.size_options, p.material_ids, p.dimensions
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ? OR p.slug = ? OR p.sku = ? LIMIT 1`,
    [productId, productId, productId]
  )
  if (!p) return null
  return buildOptions(p, await listMaterials(true))
}

/** Saves a product's own sizes and/or material list. null = back to the category defaults. */
export async function saveProductOptions(
  productId: string,
  input: { sizes?: unknown; materialIds?: unknown }
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureOptionTables()
  const sets: string[] = []
  const values: unknown[] = []
  if (input.sizes !== undefined) {
    const sizes = cleanSizes(input.sizes)
    if (sizes && !Array.isArray(sizes)) return { ok: false, error: sizes.error }
    sets.push("size_options = ?")
    values.push(sizes ? JSON.stringify(sizes) : null)
  }
  if (input.materialIds !== undefined) {
    const ids = Array.isArray(input.materialIds) ? input.materialIds.filter((x): x is string => typeof x === "string").slice(0, 50) : null
    sets.push("material_ids = ?")
    values.push(ids && ids.length ? JSON.stringify(ids) : null)
  }
  if (!sets.length) return { ok: false, error: "Nothing to save" }
  await query(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`, [...values, productId])
  return { ok: true }
}

export const categorySizeTemplates = CATEGORY_SIZES
