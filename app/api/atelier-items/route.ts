import { NextRequest, NextResponse } from "next/server"
import { query, getPaginationSQL, type PaginatedResult, type PaginationParams } from "@/lib/db/config"
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

interface CountRow extends RowDataPacket {
    total: number
}

const ALLOWED_SORT_FIELDS = ["title", "sort_order", "created_at", "updated_at"]

// GET /api/atelier-items — admin-only listing, full private data
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)

        const params: PaginationParams = {
            page: parseInt(searchParams.get("page") || "1"),
            limit: parseInt(searchParams.get("limit") || "100"),
            sortBy: searchParams.get("sortBy") || "sort_order",
            sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "asc",
        }

        const status = searchParams.get("status") || ""

        const conditions: string[] = []
        const values: unknown[] = []

        if (status) {
            conditions.push("status = ?")
            values.push(status)
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
        const { orderSQL, limitSQL, limit } = getPaginationSQL(params, ALLOWED_SORT_FIELDS)

        const countQuery = `SELECT COUNT(*) as total FROM atelier_items ${whereClause}`
        const countResult = await query<CountRow[]>(countQuery, values)
        const total = countResult[0]?.total || 0

        const itemsQuery = `
      SELECT * FROM atelier_items
      ${whereClause}
      ${orderSQL || "ORDER BY sort_order ASC"}
      ${limitSQL}
    `
        const items = await query<AtelierItemDbRow[]>(itemsQuery, values)

        const result: PaginatedResult<AtelierItemDbRow> = {
            data: items,
            pagination: {
                page: params.page || 1,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        }

        return NextResponse.json(result)
    } catch (error) {
        const err = error as Error
        console.error("GET /api/atelier-items error:", err.message)
        return NextResponse.json(
            { error: err.message || "Failed to fetch atelier items" },
            { status: 500 }
        )
    }
}

// POST /api/atelier-items — create a manufacturing item (private, not public until approved)
export async function POST(request: NextRequest) {
    try {
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

        if (!title || !manufacturingStage || !imageUrl) {
            return NextResponse.json(
                { error: "Title, manufacturing stage, and image are required" },
                { status: 400 }
            )
        }

        const id = `atelier_${Date.now()}`
        const finalStatus = status || "active"
        const finalSendToPublic = Boolean(sendToPublicWebsite)

        await query<ResultSetHeader>(
            `INSERT INTO atelier_items
        (id, title, category, manufacturing_stage, material, dimensions, image_url, slug,
         client_name, order_number, price, internal_notes, send_to_public_website, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                title,
                category || null,
                manufacturingStage,
                material || null,
                dimensions || null,
                imageUrl,
                slug || null,
                clientName || null,
                orderNumber || null,
                price ?? null,
                internalNotes || null,
                finalSendToPublic,
                finalStatus,
                sortOrder || 0,
            ]
        )

        const [newItem] = await query<AtelierItemDbRow[]>("SELECT * FROM atelier_items WHERE id = ?", [id])
        return NextResponse.json(newItem, { status: 201 })
    } catch (error) {
        console.error("POST /api/atelier-items error:", error)
        return NextResponse.json(
            { error: "Failed to create atelier item" },
            { status: 500 }
        )
    }
}
