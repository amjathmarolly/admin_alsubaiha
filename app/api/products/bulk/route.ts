import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db/config"
import type { ResultSetHeader, RowDataPacket } from "mysql2"

interface CategoryRow extends RowDataPacket {
    id: string
    name: string
    slug: string
}

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

export async function POST(request: NextRequest) {
    try {
        const { products } = await request.json()

        if (!Array.isArray(products) || products.length === 0) {
            return NextResponse.json(
                { error: "A valid array of products is required" },
                { status: 400 }
            )
        }

        let importedCount = 0
        let skippedCount = 0
        const errors: string[] = []

        // Fetch existing categories to avoid creating duplicates
        const existingCategories = await query<CategoryRow[]>("SELECT id, name FROM categories")
        const categoryMap = new Map<string, string>() // Upper(name) -> id
        existingCategories.forEach(c => {
            categoryMap.set(c.name.trim().toUpperCase(), c.id)
        })

        for (const [index, p] of products.entries()) {
            try {
                if (!p.name || p.price === undefined) {
                    errors.push(`Row ${index + 1}: Name and price are required`)
                    skippedCount++
                    continue
                }

                let categoryId = null
                if (p.category) {
                    const catNameUpper = p.category.trim().toUpperCase()
                    if (categoryMap.has(catNameUpper)) {
                        categoryId = categoryMap.get(catNameUpper)
                    } else {
                        // Auto-create category
                        const catId = `cat_${Date.now()}_${Math.floor(Math.random() * 1000)}`
                        const baseSlug = p.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

                        // Check for duplicate slug
                        const [existingSlug] = await query<CategoryRow[]>(
                            "SELECT id FROM categories WHERE slug = ?",
                            [baseSlug]
                        )
                        const slug = existingSlug ? `${baseSlug}-${Date.now()}` : baseSlug

                        await query<ResultSetHeader>(
                            `INSERT INTO categories (id, name, slug, description, parent_id, level, sort_order, image, status, product_count)
               VALUES (?, ?, ?, NULL, NULL, 0, 0, NULL, 'active', 0)`,
                            [catId, p.category.trim(), slug]
                        )

                        categoryId = catId
                        categoryMap.set(catNameUpper, catId)
                    }
                }

                const productId = `PRD${Date.now()}${Math.floor(Math.random() * 1000)}`
                const productSku = p.sku || `SKU-${Date.now()}-${index}`
                const slug = generateSlug(p.name)

                const insertQuery = `
          INSERT INTO products (
            id, name, slug, description, price, compare_price, cost_price,
            category_id, sku, barcode, stock, reserved_stock, low_stock_threshold, status, featured,
            image, images, weight, dimensions, tags, attributes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `

                await query<ResultSetHeader>(insertQuery, [
                    productId,
                    p.name,
                    slug,
                    p.description || null,
                    parseFloat(p.price) || 0,
                    p.comparePrice ? parseFloat(p.comparePrice) : null,
                    p.costPrice ? parseFloat(p.costPrice) : null,
                    categoryId,
                    productSku,
                    p.barcode || null,
                    parseInt(p.stock) || 0,
                    parseInt(p.reservedStock) || 0,
                    parseInt(p.lowStockThreshold) || 10,
                    p.status || "active",
                    p.featured ? 1 : 0,
                    p.image || null,
                    p.images ? JSON.stringify(p.images) : null,
                    p.weight ? parseFloat(p.weight) : null,
                    p.dimensions ? JSON.stringify(p.dimensions) : null,
                    p.tags ? JSON.stringify(p.tags) : null,
                    p.attributes ? JSON.stringify(p.attributes) : null,
                ])

                if (categoryId) {
                    await query(
                        "UPDATE categories SET product_count = product_count + 1 WHERE id = ?",
                        [categoryId]
                    )
                }

                importedCount++
            } catch (err: unknown) {
                console.error(`Error importing row ${index + 1}:`, err)
                errors.push(`Row ${index + 1}: ${(err as Error).message || "Unknown error"}`)
                skippedCount++
            }
        }

        return NextResponse.json({
            success: true,
            imported: importedCount,
            skipped: skippedCount,
            errors: errors.length > 0 ? errors : undefined
        }, { status: 201 })
    } catch (error) {
        console.error("POST /api/products/bulk error:", error)
        return NextResponse.json(
            { error: "Failed to process bulk import" },
            { status: 500 }
        )
    }
}
