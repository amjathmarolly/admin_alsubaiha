import { NextRequest, NextResponse } from "next/server"
import { query, getPaginationSQL, type PaginatedResult, type PaginationParams } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise"

interface ProjectRow extends RowDataPacket {
    id: string
    title: string
    subheading: string | null
    location: string | null
    description: string | null
    category: string | null
    year: string | null
    type: "image" | "video"
    image_url: string | null
    thumbnail_url: string | null
    status: "active" | "inactive"
    sort_order: number
    hotspots: string | null | any
    gallery_images: string | string[] | null
    created_at: Date
    updated_at: Date
}

interface CountRow extends RowDataPacket {
    total: number
}

const ALLOWED_SORT_FIELDS = ["title", "sort_order", "created_at"]

// GET /api/projects
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

        const countQuery = `SELECT COUNT(*) as total FROM projects ${whereClause}`
        const countResult = await query<CountRow[]>(countQuery, values)
        const total = countResult[0]?.total || 0

        const itemsQuery = `
      SELECT * FROM projects
      ${whereClause}
      ${orderSQL || "ORDER BY sort_order ASC"}
      ${limitSQL}
    `
        const items = await query<ProjectRow[]>(itemsQuery, values)

        const result: PaginatedResult<ProjectRow> = {
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
        console.error("GET /api/projects error:", err.message)
        return NextResponse.json(
            { error: err.message || "Failed to fetch projects" },
            { status: 500 }
        )
    }
}

// POST /api/projects
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            title,
            subheading,
            location,
            description,
            category,
            year,
            type,
            image_url,
            thumbnail_url,
            status,
            sortOrder,
            hotspots,
            gallery_images,
        } = body

        if (!title) {
            return NextResponse.json(
                { error: "Title is required" },
                { status: 400 }
            )
        }

        const id = `proj_${Date.now()}`

        const insertQuery = `
      INSERT INTO projects (id, title, subheading, location, description, category, year, type, image_url, thumbnail_url, status, sort_order, hotspots, gallery_images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

        await query<ResultSetHeader>(insertQuery, [
            id,
            title,
            subheading || null,
            location || null,
            description || null,
            category || null,
            year || null,
            type || "image",
            image_url || null,
            thumbnail_url || null,
            status || "active",
            sortOrder || 0,
            hotspots ? JSON.stringify(hotspots) : null,
            gallery_images ? JSON.stringify(gallery_images) : null
        ])

        const [newItem] = await query<ProjectRow[]>(
            "SELECT * FROM projects WHERE id = ?",
            [id]
        )

        return NextResponse.json(newItem, { status: 201 })
    } catch (error) {
        console.error("POST /api/projects error:", error)
        return NextResponse.json(
            { error: "Failed to create project" },
            { status: 500 }
        )
    }
}
