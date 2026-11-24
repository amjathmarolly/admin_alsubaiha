import { NextRequest, NextResponse } from "next/server"
import { query, getPaginationSQL, type PaginatedResult, type PaginationParams } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface CategoryRow extends RowDataPacket {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  parent_name: string | null
  level: number
  sort_order: number
  image: string | null
  status: "active" | "inactive"
  product_count: number
  child_count: number
  created_at: Date
  updated_at: Date
}

interface CountRow extends RowDataPacket {
  total: number
}

const ALLOWED_SORT_FIELDS = ["name", "level", "sort_order", "product_count", "created_at"]

// GET /api/categories - List all categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const params: PaginationParams = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "100"),
      sortBy: searchParams.get("sortBy") || "level",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "asc",
    }

    const search = searchParams.get("search") || ""
    const parentId = searchParams.get("parentId")
    const level = searchParams.get("level")
    const status = searchParams.get("status") || ""
    const flat = searchParams.get("flat") === "true"

    // Build WHERE conditions
    const conditions: string[] = []
    const values: unknown[] = []

    if (search) {
      conditions.push("(c.name LIKE ? OR c.slug LIKE ?)")
      values.push(`%${search}%`, `%${search}%`)
    }

    if (parentId !== undefined && parentId !== null) {
      if (parentId === "null" || parentId === "") {
        conditions.push("c.parent_id IS NULL")
      } else {
        conditions.push("c.parent_id = ?")
        values.push(parentId)
      }
    }

    if (level !== undefined && level !== null && level !== "") {
      conditions.push("c.level = ?")
      values.push(parseInt(level))
    }

    if (status) {
      conditions.push("c.status = ?")
      values.push(status)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
    const { orderSQL, limitSQL, limit } = getPaginationSQL(params, ALLOWED_SORT_FIELDS)

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM categories c ${whereClause}`
    const countResult = await query<CountRow[]>(countQuery, values)
    const total = countResult[0]?.total || 0

    // Get categories with parent info and child count
    const categoriesQuery = `
      SELECT 
        c.*,
        p.name as parent_name,
        (SELECT COUNT(*) FROM categories WHERE parent_id = c.id) as child_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      ${whereClause}
      ${orderSQL || "ORDER BY c.level ASC, c.sort_order ASC, c.name ASC"}
      ${limitSQL}
    `
    const categories = await query<CategoryRow[]>(categoriesQuery, values)

    // If not flat, build tree structure
    if (!flat) {
      const categoryMap = new Map<string, CategoryRow & { children: CategoryRow[] }>()
      const roots: (CategoryRow & { children: CategoryRow[] })[] = []

      // First pass: create map
      categories.forEach(cat => {
        categoryMap.set(cat.id, { ...cat, children: [] })
      })

      // Second pass: build tree
      categories.forEach(cat => {
        const categoryWithChildren = categoryMap.get(cat.id)!
        if (cat.parent_id && categoryMap.has(cat.parent_id)) {
          categoryMap.get(cat.parent_id)!.children.push(categoryWithChildren)
        } else if (!cat.parent_id) {
          roots.push(categoryWithChildren)
        }
      })

      return NextResponse.json({
        data: roots,
        pagination: {
          page: params.page || 1,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    }

    const result: PaginatedResult<CategoryRow> = {
      data: categories,
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
    console.error("GET /api/categories error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to fetch categories" },
      { status: 500 }
    )
  }
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      parentId,
      sortOrder,
      image,
      status,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    // Calculate level based on parent
    let level = 0
    if (parentId) {
      const [parent] = await query<CategoryRow[]>(
        "SELECT level FROM categories WHERE id = ?",
        [parentId]
      )
      if (parent) {
        level = parent.level + 1
        if (level > 2) {
          return NextResponse.json(
            { error: "Maximum category depth is 3 levels" },
            { status: 400 }
          )
        }
      }
    }

    // Generate slug
    const baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")

    // Check for duplicate slug and make unique if needed
    const [existingSlug] = await query<CategoryRow[]>(
      "SELECT id FROM categories WHERE slug = ?",
      [baseSlug]
    )
    const slug = existingSlug ? `${baseSlug}-${Date.now()}` : baseSlug

    const id = `cat_${Date.now()}`

    const insertQuery = `
      INSERT INTO categories (id, name, slug, description, parent_id, level, sort_order, image, status, product_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    await query<ResultSetHeader>(insertQuery, [
      id,
      name,
      slug,
      description || null,
      parentId || null,
      level,
      sortOrder || 0,
      image || null,
      status || "active",
      0,
    ])

    // Get the created category
    const [newCategory] = await query<CategoryRow[]>(
      "SELECT * FROM categories WHERE slug = ?",
      [slug]
    )

    return NextResponse.json(newCategory, { status: 201 })
  } catch (error) {
    console.error("POST /api/categories error:", error)
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    )
  }
}
