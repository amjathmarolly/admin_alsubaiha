import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise"

interface AtelierItemDbRow extends RowDataPacket {
    id: string
    title: string
    category: string | null
    manufacturing_stage: string
    material: string | null
    dimensions: string | null
    image_url: string
    slug: string | null
    client_name: string | null
    order_number: string | null
    price: number | null
    internal_notes: string | null
    send_to_public_website: number
    status: "active" | "inactive"
    sort_order: number
    created_at: Date
    updated_at: Date
}

// GET /api/atelier-items/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const [item] = await query<AtelierItemDbRow[]>("SELECT * FROM atelier_items WHERE id = ?", [id])

        if (!item) {
            return NextResponse.json({ error: "Item not found" }, { status: 404 })
        }

        return NextResponse.json({ data: item })
    } catch (error) {
        console.error("GET /api/atelier-items/[id] error:", error)
        return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 })
    }
}

// PUT /api/atelier-items/[id]
// The storefront reads /api/atelier-items/public directly, so toggling the
// approval checkbox here is all that's needed — there's no separate push
// step to keep in sync.
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const {
            title,
            category,
            manufacturingStage,
            material,
            dimensions,
            imageUrl,
            slug,
            clientName,
            orderNumber,
            price,
            internalNotes,
            sendToPublicWebsite,
            status,
            sortOrder,
        } = body

        const [existing] = await query<AtelierItemDbRow[]>("SELECT * FROM atelier_items WHERE id = ?", [id])
        if (!existing) {
            return NextResponse.json({ error: "Item not found" }, { status: 404 })
        }

        const result = await query<ResultSetHeader>(
            `UPDATE atelier_items
       SET title = COALESCE(?, title),
           category = ?,
           manufacturing_stage = COALESCE(?, manufacturing_stage),
           material = ?,
           dimensions = ?,
           image_url = COALESCE(?, image_url),
           slug = ?,
           client_name = ?,
           order_number = ?,
           price = ?,
           internal_notes = ?,
           send_to_public_website = ?,
           status = COALESCE(?, status),
           sort_order = COALESCE(?, sort_order)
       WHERE id = ?`,
            [
                title,
                category ?? null,
                manufacturingStage,
                material ?? null,
                dimensions ?? null,
                imageUrl,
                slug ?? null,
                clientName ?? null,
                orderNumber ?? null,
                price ?? null,
                internalNotes ?? null,
                sendToPublicWebsite === undefined ? existing.send_to_public_website : Boolean(sendToPublicWebsite),
                status,
                sortOrder,
                id,
            ]
        )

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "Item not found" }, { status: 404 })
        }

        const [updated] = await query<AtelierItemDbRow[]>("SELECT * FROM atelier_items WHERE id = ?", [id])
        return NextResponse.json(updated)
    } catch (error) {
        console.error("PUT /api/atelier-items/[id] error:", error)
        return NextResponse.json({ error: "Failed to update item" }, { status: 500 })
    }
}

// DELETE /api/atelier-items/[id]
// Deleting the row is enough on its own: the storefront only ever shows
// what /api/atelier-items/public currently returns, so a deleted item
// disappears from the site on its next read with no separate step needed.
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const [existing] = await query<AtelierItemDbRow[]>("SELECT * FROM atelier_items WHERE id = ?", [id])

        if (!existing) {
            return NextResponse.json({ error: "Item not found" }, { status: 404 })
        }

        const result = await query<ResultSetHeader>("DELETE FROM atelier_items WHERE id = ?", [id])

        if (result.affectedRows === 0) {
            return NextResponse.json({ error: "Item not found" }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("DELETE /api/atelier-items/[id] error:", error)
        return NextResponse.json({ error: "Failed to delete item" }, { status: 500 })
    }
}
