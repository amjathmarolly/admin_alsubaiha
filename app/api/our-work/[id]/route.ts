import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
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

// GET /api/our-work/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const [item] = await query<OurWorkRow[]>(
            "SELECT * FROM our_work WHERE id = ?",
            [id]
        )

        if (!item) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ data: item })
    } catch (error) {
        console.error("GET /api/our-work/[id] error:", error)
        return NextResponse.json(
            { error: "Failed to fetch item" },
            { status: 500 }
        )
    }
}

// PUT /api/our-work/[id]
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { type, url, thumbnail, title, description, sortOrder, status } = body

        const updateQuery = `
      UPDATE our_work 
      SET type = COALESCE(?, type),
          url = COALESCE(?, url),
          thumbnail = ?,
          title = COALESCE(?, title),
          description = ?,
          sort_order = COALESCE(?, sort_order),
          status = COALESCE(?, status)
      WHERE id = ?
    `

        const result = await query<ResultSetHeader>(updateQuery, [
            type,
            url,
            thumbnail || null,
            title,
            description || null,
            sortOrder,
            status,
            id,
        ])

        if (result.affectedRows === 0) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 }
            )
        }

        const [updatedItem] = await query<OurWorkRow[]>(
            "SELECT * FROM our_work WHERE id = ?",
            [id]
        )

        return NextResponse.json(updatedItem)
    } catch (error) {
        console.error("PUT /api/our-work/[id] error:", error)
        return NextResponse.json(
            { error: "Failed to update item" },
            { status: 500 }
        )
    }
}

// DELETE /api/our-work/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const result = await query<ResultSetHeader>(
            "DELETE FROM our_work WHERE id = ?",
            [id]
        )

        if (result.affectedRows === 0) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("DELETE /api/our-work/[id] error:", error)
        return NextResponse.json(
            { error: "Failed to delete item" },
            { status: 500 }
        )
    }
}
