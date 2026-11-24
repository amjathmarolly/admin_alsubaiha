import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface BlogRow extends RowDataPacket {
  id: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [blog] = await query<BlogRow[]>("SELECT * FROM blogs WHERE id = ?", [id])
    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 })
    }
    return NextResponse.json(blog)
  } catch (error) {
    console.error("GET /api/blogs/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch blog" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, slug, excerpt, content, category, author, image, video_url, gallery_images, schema_data, status } = body
    
    const updateQuery = `
      UPDATE blogs SET 
        title = ?, 
        slug = ?, 
        excerpt = ?, 
        content = ?, 
        category = ?, 
        author = ?, 
        image = ?, 
        video_url = ?, 
        gallery_images = ?,
        schema_data = ?,
        status = ?
      WHERE id = ?
    `
    
    await query<ResultSetHeader>(updateQuery, [
      title,
      slug,
      excerpt || null,
      content,
      category || null,
      author || null,
      image || null,
      video_url || null,
      gallery_images ? JSON.stringify(gallery_images) : null,
      schema_data || null,
      status || "active",
      id
    ])
    
    const [updatedBlog] = await query<BlogRow[]>("SELECT * FROM blogs WHERE id = ?", [id])
    return NextResponse.json(updatedBlog)
  } catch (error: any) {
    console.error("PUT /api/blogs/[id] error:", error)
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A blog post with this slug already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Failed to update blog" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await query("DELETE FROM blogs WHERE id = ?", [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/blogs/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete blog" }, { status: 500 })
  }
}
