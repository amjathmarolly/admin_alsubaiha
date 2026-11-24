import { NextRequest, NextResponse } from "next/server"
import { query, getPaginationSQL, type PaginatedResult, type PaginationParams } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface BlogRow extends RowDataPacket {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  category: string | null
  author: string | null
  image: string | null
  video_url: string | null
  gallery_images: string | string[] | null
  schema_data: string | null
  status: "active" | "draft" | "archived"
  created_at: Date
  updated_at: Date
}

interface CountRow extends RowDataPacket {
  total: number
}

const ALLOWED_SORT_FIELDS = ["title", "created_at", "updated_at"]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const params: PaginationParams = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      sortBy: searchParams.get("sortBy") || "created_at",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    }
    
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    
    const conditions: string[] = []
    const values: unknown[] = []
    
    if (search) {
      conditions.push("(title LIKE ? OR excerpt LIKE ? OR content LIKE ?)")
      values.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    
    if (status) {
      conditions.push("status = ?")
      values.push(status)
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
    const { orderSQL, limitSQL, limit } = getPaginationSQL(params, ALLOWED_SORT_FIELDS)
    
    const countQuery = `SELECT COUNT(*) as total FROM blogs ${whereClause}`
    const countResult = await query<CountRow[]>(countQuery, values)
    const total = countResult[0]?.total || 0
    
    const blogsQuery = `
      SELECT * FROM blogs
      ${whereClause}
      ${orderSQL || "ORDER BY created_at DESC"}
      ${limitSQL}
    `
    const blogs = await query<BlogRow[]>(blogsQuery, values)
    
    const result: PaginatedResult<BlogRow> = {
      data: blogs,
      pagination: {
        page: params.page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error("GET /api/blogs error:", error)
    return NextResponse.json(
      { error: "Failed to fetch blogs" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, slug, excerpt, content, category, author, image, video_url, gallery_images, schema_data, status } = body
    
    if (!title || !content || !slug) {
      return NextResponse.json(
        { error: "Title, slug, and content are required" },
        { status: 400 }
      )
    }
    

    const id = `BLOG${Date.now()}`
    
    const insertQuery = `
      INSERT INTO blogs (
        id, title, slug, excerpt, content, category, author, image, video_url, gallery_images, schema_data, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    await query<ResultSetHeader>(insertQuery, [
      id,
      title,
      slug,
      excerpt || null,
      content,
      category || null,
      author || "Al Subaiha Editorial",
      image || null,
      video_url || null,
      gallery_images ? JSON.stringify(gallery_images) : null,
      schema_data || null,
      status || "active"
    ])
    
    const [newBlog] = await query<BlogRow[]>("SELECT * FROM blogs WHERE id = ?", [id])
    return NextResponse.json(newBlog, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/blogs error detailed:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      body: body
    })
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A blog post with this slug already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: `Failed to create blog post: ${error.message}` },
      { status: 500 }
    )
  }
}
