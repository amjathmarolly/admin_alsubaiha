import { NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket } from "mysql2/promise"

interface PublicAtelierRow extends RowDataPacket {
    id: string
    title: string
    category: string | null
    manufacturing_stage: string
    material: string | null
    dimensions: string | null
    image_url: string
    slug: string | null
}

export const dynamic = "force-dynamic"

function resolveImageUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) return url
    const base = (process.env.NEXT_PUBLIC_APP_URL || "https://admin.alsubaiha.ae").replace(/\/$/, "")
    return `${base}${url.startsWith("/") ? "" : "/"}${url}`
}

// GET /api/atelier-items/public — PUBLIC, unauthenticated.
// This is the storefront's only connection to Atelier Live: it reads this
// endpoint directly at render time. The SELECT below only ever names the
// public-safe columns — client_name, order_number, price, and
// internal_notes are never referenced here, let alone returned. Rows are
// only eligible once a team member has checked "Send to Public Website"
// (send_to_public_website = TRUE) and the item is active.
export async function GET() {
    try {
        const items = await query<PublicAtelierRow[]>(
            `SELECT id, title, category, manufacturing_stage, material, dimensions, image_url, slug
             FROM atelier_items
             WHERE send_to_public_website = TRUE AND status = 'active'
             ORDER BY sort_order ASC, created_at DESC`
        )

        const data = items.map((item) => ({
            sourceId: item.id,
            title: item.title,
            category: item.category,
            manufacturingStage: item.manufacturing_stage,
            material: item.material,
            dimensions: item.dimensions,
            imageUrl: resolveImageUrl(item.image_url),
            slug: item.slug,
        }))

        return NextResponse.json(
            { data },
            { headers: { "Cache-Control": "no-store" } }
        )
    } catch (error) {
        console.error("GET /api/atelier-items/public error:", (error as Error).message)
        return NextResponse.json({ error: "Failed to fetch public atelier items" }, { status: 500 })
    }
}
