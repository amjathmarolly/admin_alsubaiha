// JSON-LD generator. Public (the output ends up in page HTML anyway).
// GET ?type=product&key=<slug> | type=page&key=/ | other types return Breadcrumb only.
import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2"
import { allImages, listEntries } from "@/lib/seo-entries"
import { getSeo, isSeoEntityType } from "@/lib/seo"
import { getSettings, siteUrl } from "@/lib/seo-tools"

export const dynamic = "force-dynamic"

interface ProductRow extends RowDataPacket {
  name: string
  slug: string
  sku: string
  description: string | null
  price: string
  stock: number
  status: string
  images: unknown
  category_name: string | null
  category_slug: string | null
}

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
const abs = (base: string, u: string) => (/^https?:\/\//i.test(u) ? u : `${base}${u.startsWith("/") ? "" : "/"}${u}`)

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type")
  const key = request.nextUrl.searchParams.get("key")
  if (!isSeoEntityType(type) || !key) return NextResponse.json({ error: "type and key are required" }, { status: 400 })
  try {
    const [settings, seo] = await Promise.all([getSettings(), getSeo(type, key)])
    const base = (settings.org.url || siteUrl()).replace(/\/$/, "")
    const graph: Record<string, unknown>[] = []

    const orgNode = {
      "@type": "Organization",
      "@id": `${base}/#organization`,
      name: settings.org.name,
      url: base,
      ...(settings.org.logo ? { logo: abs(base, settings.org.logo) } : {}),
      ...(settings.org.sameAs.length ? { sameAs: settings.org.sameAs } : {}),
      ...(settings.org.phone || settings.org.email
        ? { contactPoint: { "@type": "ContactPoint", contactType: "customer service", ...(settings.org.phone ? { telephone: settings.org.phone } : {}), ...(settings.org.email ? { email: settings.org.email } : {}) } }
        : {}),
    }

    if (type === "page" && key === "/") {
      graph.push(orgNode, { "@type": "WebSite", "@id": `${base}/#website`, url: base, name: settings.org.name, publisher: { "@id": `${base}/#organization` } })
    } else {
      const entry = (await listEntries(type)).find((e) => e.key === key)
      if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 })
      const url = `${base}${entry.path}`

      const crumbs: { name: string; url: string }[] = [{ name: "Home", url: base }]
      if (type === "product") {
        const rows = await query<ProductRow[]>(
          `SELECT p.name, p.slug, p.sku, p.description, p.price, p.stock, p.status, p.images,
                  c.name AS category_name, c.slug AS category_slug
           FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ? LIMIT 1`,
          [key]
        )
        const p = rows[0]
        if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 })
        if (p.category_name) crumbs.push({ name: p.category_name, url: `${base}/collections/${p.category_slug}` })
        crumbs.push({ name: p.name, url })
        const images = allImages(p.images).map((u) => abs(base, u))
        const image = seo?.ogImage ? abs(base, seo.ogImage) : images[0]
        graph.push({
          "@type": "Product",
          "@id": `${url}#product`,
          name: p.name,
          sku: p.sku,
          url,
          description: seo?.description || (p.description ? stripHtml(p.description).slice(0, 500) : undefined),
          image: image ? [image, ...images.filter((i) => i !== image)] : undefined,
          brand: { "@type": "Brand", name: settings.org.name },
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: settings.currency,
            price: Number(p.price).toFixed(2),
            availability: p.status === "active" && p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/NewCondition",
          },
        })
      } else {
        crumbs.push({ name: entry.label, url })
      }
      graph.push({
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
      })
    }
    return NextResponse.json({ jsonLd: { "@context": "https://schema.org", "@graph": graph } })
  } catch (error) {
    console.error("GET /api/seo/structured-data error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to build structured data" }, { status: 500 })
  }
}
