import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
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

// GET /api/projects/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check if Promise resolution is needed for params (Next.js 15+)
    let actualId = id;
    if (typeof params === 'object' && params instanceof Promise) {
      actualId = (await params).id;
    } else {
      actualId = id;
    }

    const items = await query<ProjectRow[]>(
      "SELECT * FROM projects WHERE id = ?",
      [actualId]
    )

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(items[0])
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    )
  }
}

// PUT /api/projects/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    let actualId = id;
    if (typeof params === 'object' && params instanceof Promise) {
      actualId = (await params).id;
    } else {
      actualId = id;
    }

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

    const updateQuery = `
      UPDATE projects 
      SET title = ?, subheading = ?, location = ?, description = ?, category = ?, year = ?, type = ?, image_url = ?, thumbnail_url = ?, status = ?, sort_order = ?, hotspots = ?, gallery_images = ?
      WHERE id = ?
    `

    const result = await query<ResultSetHeader>(updateQuery, [
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
      gallery_images ? JSON.stringify(gallery_images) : null,
      actualId
    ])

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const [updatedItem] = await query<ProjectRow[]>(
      "SELECT * FROM projects WHERE id = ?",
      [actualId]
    )

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error("PUT /api/projects/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    let actualId = id;
    if (typeof params === 'object' && params instanceof Promise) {
      actualId = (await params).id;
    } else {
      actualId = id;
    }

    const result = await query<ResultSetHeader>(
      "DELETE FROM projects WHERE id = ?",
      [actualId]
    )

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    )
  }
}
