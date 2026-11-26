import { NextRequest, NextResponse } from "next/server"
import { hasStaffSession } from "@/lib/integration-token"
import { query } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface ProductRow extends RowDataPacket {
  id: string
  name: string
  slug: string | null
  description: string | null
  category_id: string | null
  category_name: string | null
  designer_id: string | null
  designer_name: string | null
  designer_image: string | null
  price: number
  compare_price: number | null
  cost_price: number | null
  sku: string | null
  barcode: string | null
  stock: number
  reserved_stock: number
  low_stock_threshold: number
  status: "active" | "draft" | "archived"
  featured: boolean
  image: string | null
  images: string | null
  weight: number | null
  dimensions: string | null
  tags: string | null
  attributes: string | null
  created_at: Date
  updated_at: Date
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// GET /api/products/[id] - Get a single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const productQuery = `
      SELECT
        p.*, c.name as category_name, d.name as designer_name, d.image as designer_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN designers d ON p.designer_id = d.id
      WHERE p.id = ? OR p.sku = ? OR p.slug = ?
    `

    const products = await query<ProductRow[]>(productQuery, [id, id, id])

    if (products.length === 0) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    const product = {
      ...products[0],
      featured: Boolean(products[0].featured),
      available_stock: products[0].stock - products[0].reserved_stock,
      images: products[0].images ? JSON.parse(products[0].images) : [],
      dimensions: products[0].dimensions ? JSON.parse(products[0].dimensions) : null,
      tags: products[0].tags ? JSON.parse(products[0].tags) : [],
      attributes: products[0].attributes ? JSON.parse(products[0].attributes) : null,
    }
    // What a product costs us is for staff only, not for the website.
    if (!(await hasStaffSession())) product.cost_price = null

    return NextResponse.json(product)
  } catch (error) {
    const err = error as Error
    console.error("GET /api/products/[id] error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to fetch product" },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id] - Update a product
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Get current product
    const [currentProduct] = await query<ProductRow[]>(
      "SELECT * FROM products WHERE id = ?",
      [id]
    )

    if (!currentProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    const {
      name,
      description,
      price,
      comparePrice,
      costPrice,
      categoryId,
      designerId,
      stock,
      reservedStock,
      lowStockThreshold,
      status,
      featured,
      image,
      images,
      barcode,
      weight,
      dimensions,
      tags,
      attributes,
    } = body

    // Generate new slug if name changed
    const slug = name ? generateSlug(name) : currentProduct.slug

    const updateQuery = `
      UPDATE products SET
        name = COALESCE(?, name),
        slug = ?,
        description = ?,
        price = COALESCE(?, price),
        compare_price = ?,
        cost_price = ?,
        category_id = ?,
        designer_id = ?,
        stock = COALESCE(?, stock),
        reserved_stock = COALESCE(?, reserved_stock),
        low_stock_threshold = COALESCE(?, low_stock_threshold),
        status = COALESCE(?, status),
        featured = COALESCE(?, featured),
        image = ?,
        images = ?,
        barcode = ?,
        weight = ?,
        dimensions = ?,
        tags = ?,
        attributes = ?
      WHERE id = ?
    `

    await query<ResultSetHeader>(updateQuery, [
      name !== undefined ? name : null,
      slug !== undefined ? slug : null,
      description !== undefined ? description : currentProduct.description,
      price !== undefined ? price : null,
      comparePrice !== undefined ? comparePrice : currentProduct.compare_price,
      costPrice !== undefined ? costPrice : currentProduct.cost_price,
      categoryId !== undefined ? categoryId : currentProduct.category_id,
      designerId !== undefined ? (designerId === "" ? null : designerId) : currentProduct.designer_id,
      stock !== undefined ? stock : null,
      reservedStock !== undefined ? reservedStock : null,
      lowStockThreshold !== undefined ? lowStockThreshold : null,
      status !== undefined ? status : null,
      featured !== undefined ? (featured === null ? null : (featured ? 1 : 0)) : null,
      image !== undefined ? image : currentProduct.image,
      images !== undefined ? (images === null ? null : JSON.stringify(images)) : currentProduct.images,
      barcode !== undefined ? barcode : currentProduct.barcode,
      weight !== undefined ? weight : currentProduct.weight,
      dimensions !== undefined ? (dimensions === null ? null : JSON.stringify(dimensions)) : currentProduct.dimensions,
      tags !== undefined ? (tags === null ? null : JSON.stringify(tags)) : currentProduct.tags,
      attributes !== undefined ? (attributes === null ? null : JSON.stringify(attributes)) : currentProduct.attributes,
      id,
    ])

    // Update category product counts if category changed
    if (categoryId !== undefined && categoryId !== currentProduct.category_id) {
      if (currentProduct.category_id) {
        await query(
          "UPDATE categories SET product_count = GREATEST(0, product_count - 1) WHERE id = ?",
          [currentProduct.category_id]
        )
      }
      if (categoryId) {
        await query(
          "UPDATE categories SET product_count = product_count + 1 WHERE id = ?",
          [categoryId]
        )
      }
    }

    // Get updated product
    const [updatedProduct] = await query<ProductRow[]>(
      "SELECT * FROM products WHERE id = ?",
      [id]
    )

    return NextResponse.json({
      ...updatedProduct,
      featured: Boolean(updatedProduct.featured),
      available_stock: updatedProduct.stock - updatedProduct.reserved_stock,
      images: updatedProduct.images ? JSON.parse(updatedProduct.images) : [],
      dimensions: updatedProduct.dimensions ? JSON.parse(updatedProduct.dimensions) : null,
      tags: updatedProduct.tags ? JSON.parse(updatedProduct.tags) : [],
      attributes: updatedProduct.attributes ? JSON.parse(updatedProduct.attributes) : null,
    })
  } catch (error) {
    const err = error as Error
    console.error("PUT /api/products/[id] error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to update product" },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - Delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get current product to update category count
    const [currentProduct] = await query<ProductRow[]>(
      "SELECT category_id FROM products WHERE id = ?",
      [id]
    )

    if (!currentProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    await query<ResultSetHeader>("DELETE FROM products WHERE id = ?", [id])

    // Update category product count
    if (currentProduct.category_id) {
      await query(
        "UPDATE categories SET product_count = GREATEST(0, product_count - 1) WHERE id = ?",
        [currentProduct.category_id]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const err = error as Error
    console.error("DELETE /api/products/[id] error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to delete product" },
      { status: 500 }
    )
  }
}
