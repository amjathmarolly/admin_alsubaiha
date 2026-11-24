import { NextRequest, NextResponse } from "next/server"
import { query, transaction } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader, PoolConnection } from "mysql2/promise"

interface CategoryRow extends RowDataPacket {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  level: number
  sort_order: number
  image: string | null
  status: "active" | "inactive"
  product_count: number
  created_at: Date
  updated_at: Date
}

// GET /api/categories/[id] - Get a single category with full path
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const categoryQuery = `
      SELECT 
        c.*,
        p.name as parent_name,
        (SELECT COUNT(*) FROM categories WHERE parent_id = c.id) as child_count,
        (SELECT COUNT(*) FROM products WHERE category_id = c.id) as actual_product_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = ? OR c.slug = ?
    `

    const categories = await query<CategoryRow[]>(categoryQuery, [id, id])

    if (categories.length === 0) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      )
    }

    const category = categories[0]

    // Get full path
    const pathParts: string[] = [category.name]
    let currentParentId = category.parent_id

    while (currentParentId) {
      const [parent] = await query<CategoryRow[]>(
        "SELECT id, name, parent_id FROM categories WHERE id = ?",
        [currentParentId]
      )
      if (parent) {
        pathParts.unshift(parent.name)
        currentParentId = parent.parent_id
      } else {
        break
      }
    }

    // Get children
    const children = await query<CategoryRow[]>(
      "SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order, name",
      [category.id]
    )

    return NextResponse.json({
      ...category,
      path: pathParts.join(" > "),
      children,
    })
  } catch (error) {
    console.error("GET /api/categories/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    )
  }
}

// PUT /api/categories/[id] - Update a category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Get current category
    const [currentCategory] = await query<CategoryRow[]>(
      "SELECT * FROM categories WHERE id = ?",
      [id]
    )

    if (!currentCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      )
    }

    const {
      name,
      description,
      parentId,
      status,
      sortOrder,
      image,
    } = body

    // Calculate new level if parent changed
    let level = currentCategory.level
    if (parentId !== undefined && parentId !== currentCategory.parent_id) {
      if (parentId) {
        // Check for circular reference
        if (parentId === id) {
          return NextResponse.json(
            { error: "Category cannot be its own parent" },
            { status: 400 }
          )
        }

        // Check if new parent is a descendant of this category
        const descendants = await getDescendantIds(id)
        if (descendants.includes(parentId)) {
          return NextResponse.json(
            { error: "Cannot move category under its own descendant" },
            { status: 400 }
          )
        }

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
      } else {
        level = 0
      }
    }

    // Generate new slug if name changed
    let slug = currentCategory.slug
    if (name && name !== currentCategory.name) {
      slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")

      const [existingSlug] = await query<CategoryRow[]>(
        "SELECT id FROM categories WHERE slug = ? AND id != ?",
        [slug, id]
      )
      if (existingSlug) {
        slug = `${slug}-${Date.now()}`
      }
    }

    const updateQuery = `
      UPDATE categories SET
        name = COALESCE(?, name),
        slug = ?,
        description = ?,
        parent_id = ?,
        level = ?,
        sort_order = COALESCE(?, sort_order),
        image = ?,
        status = COALESCE(?, status)
      WHERE id = ?
    `

    await query<ResultSetHeader>(updateQuery, [
      name !== undefined ? name : null,
      slug,
      description !== undefined ? description : currentCategory.description,
      parentId !== undefined ? parentId : currentCategory.parent_id,
      level,
      sortOrder !== undefined ? sortOrder : null,
      image !== undefined ? image : currentCategory.image,
      status !== undefined ? status : null,
      id,
    ])

    // If parent changed, update levels of all descendants
    if (parentId !== undefined && parentId !== currentCategory.parent_id) {
      await updateDescendantLevels(id, level)
    }

    // Get updated category
    const [updatedCategory] = await query<CategoryRow[]>(
      "SELECT * FROM categories WHERE id = ?",
      [id]
    )

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error("PUT /api/categories/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    )
  }
}

// DELETE /api/categories/[id] - Delete a category and its descendants
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if category exists
    const [category] = await query<CategoryRow[]>(
      "SELECT id FROM categories WHERE id = ?",
      [id]
    )

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      )
    }

    // Get all descendant IDs
    const descendantIds = await getDescendantIds(id)
    const allIds = [id, ...descendantIds]

    // Use transaction to delete category and update products
    await transaction(async (conn: PoolConnection) => {
      // Set products' category_id to null
      const placeholders = allIds.map(() => "?").join(",")
      await conn.execute(
        `UPDATE products SET category_id = NULL WHERE category_id IN (${placeholders})`,
        allIds
      )

      // Delete all categories (children will cascade)
      await conn.execute("DELETE FROM categories WHERE id = ?", [id])
    })

    return NextResponse.json({
      success: true,
      deletedCount: allIds.length
    })
  } catch (error) {
    console.error("DELETE /api/categories/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    )
  }
}

// Helper function to get all descendant IDs
async function getDescendantIds(categoryId: string): Promise<string[]> {
  const descendants: string[] = []

  const children = await query<CategoryRow[]>(
    "SELECT id FROM categories WHERE parent_id = ?",
    [categoryId]
  )

  for (const child of children) {
    descendants.push(child.id)
    const childDescendants = await getDescendantIds(child.id)
    descendants.push(...childDescendants)
  }

  return descendants
}

// Helper function to update levels of descendants
async function updateDescendantLevels(categoryId: string, parentLevel: number): Promise<void> {
  const children = await query<CategoryRow[]>(
    "SELECT id FROM categories WHERE parent_id = ?",
    [categoryId]
  )

  for (const child of children) {
    const newLevel = parentLevel + 1
    await query("UPDATE categories SET level = ? WHERE id = ?", [newLevel, child.id])
    await updateDescendantLevels(child.id, newLevel)
  }
}
