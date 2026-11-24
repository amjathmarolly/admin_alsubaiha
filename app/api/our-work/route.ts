import { NextRequest, NextResponse } from "next/server"
import { query, getPaginationSQL, type PaginatedResult, type PaginationParams } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise"

interface OurWorkRow extends RowDataPacket {
    id: string
    type: "photo" | "video"
    url: string
    thumbnail: string | null
    title: string
    description: string | null
    sort_order: number
    status: "active" | "inactive"
    created_at: Date
    updated_at: Date
}

interface CountRow extends RowDataPacket {
    total: number
}

const ALLOWED_SORT_FIELDS = ["title", "sort_order", "created_at"]

// GET /api/our-work
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)

        const params: PaginationParams = {
            page: parseInt(searchParams.get("page") || "1"),
            limit: parseInt(searchParams.get("limit") || "100"),
            sortBy: searchParams.get("sortBy") || "sort_order",
            sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "asc",
        }

        const type = searchParams.get("type") || ""
        const status = searchParams.get("status") || ""

        const conditions: string[] = []
        const values: unknown[] = []

        if (type) {
            conditions.push("type = ?")
            values.push(type)
        }

        if (status) {
            conditions.push("status = ?")
            values.push(status)
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
        const { orderSQL, limitSQL, limit } = getPaginationSQL(params, ALLOWED_SORT_FIELDS)

        const countQuery = `SELECT COUNT(*) as total FROM our_work ${whereClause}`
        const countResult = await query<CountRow[]>(countQuery, values)
        const total = countResult[0]?.total || 0

        const itemsQuery = `
      SELECT * FROM our_work
      ${whereClause}
      ${orderSQL || "ORDER BY sort_order ASC"}
      ${limitSQL}
    `
        const items = await query<OurWorkRow[]>(itemsQuery, values)

        const result: PaginatedResult<OurWorkRow> = {
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
        console.error("GET /api/our-work error:", err.message)
        return NextResponse.json(
            { error: err.message || "Failed to fetch our work items" },
            { status: 500 }
        )
    }
}

// POST /api/our-work
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            type,
            url,
            thumbnail,
            title,
            description,
            sortOrder,
            status,
        } = body

        if (!type || !url || !title) {
            return NextResponse.json(
                { error: "Type, URL, and Title are required" },
                { status: 400 }
            )
        }

        const id = `work_${Date.now()}`

        const insertQuery = `
      INSERT INTO our_work (id, type, url, thumbnail, title, description, sort_order, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `

        await query<ResultSetHeader>(insertQuery, [
            id,
            type,
            url,
            thumbnail || null,
            title,
            description || null,
            sortOrder || 0,
            status || "active"
        ])

        const [newItem] = await query<OurWorkRow[]>(
            "SELECT * FROM our_work WHERE id = ?",
            [id]
        )

        return NextResponse.json(newItem, { status: 201 })
    } catch (error) {
        console.error("POST /api/our-work error:", error)
        return NextResponse.json(
            { error: "Failed to create our work item" },
            { status: 500 }
        )
    }
}
