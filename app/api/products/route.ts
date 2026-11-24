import { NextRequest, NextResponse } from "next/server"
import { query, getPaginationSQL, type PaginatedResult, type PaginationParams } from "@/lib/db/config"
import type { RowDataPacket, ResultSetHeader } from "mysql2"

interface ProductRow extends RowDataPacket {
  id: string
  name: string
  slug: string | null
  description: string | null
  category_id: string | null
  category_name: string | null
  category_path: string | null
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

interface CountRow extends RowDataPacket {
  total: number
}

const ALLOWED_SORT_FIELDS = ["name", "price", "stock", "created_at", "updated_at"]

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// GET /api/products - List all products with pagination and filtering
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
    const category = searchParams.get("category") || ""
    const designerId = searchParams.get("designerId") || ""
    const status = searchParams.get("status") || ""
    const featured = searchParams.get("featured") || ""
    const minPrice = searchParams.get("minPrice") || ""
    const maxPrice = searchParams.get("maxPrice") || ""
    const inStock = searchParams.get("inStock") || ""
    
    // Build WHERE conditions
    const conditions: string[] = []
    const values: unknown[] = []
    
    if (search) {
      conditions.push("(p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)")
      values.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }
    
    if (category) {
      conditions.push("p.category_id = ?")
      values.push(category)
    }

    if (designerId) {
      conditions.push("p.designer_id = ?")
      values.push(designerId)
    }
    
    if (status) {
      conditions.push("p.status = ?")
      values.push(status)
    }
    
    if (featured === "true") {
      conditions.push("p.featured = TRUE")
    }
    
    if (minPrice) {
      conditions.push("p.price >= ?")
      values.push(parseFloat(minPrice))
    }
    
    if (maxPrice) {
      conditions.push("p.price <= ?")
      values.push(parseFloat(maxPrice))
    }
    
    if (inStock === "true") {
      conditions.push("(p.stock - p.reserved_stock) > 0")
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
    const { orderSQL, limitSQL, limit } = getPaginationSQL(params, ALLOWED_SORT_FIELDS)
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `
    const countResult = await query<CountRow[]>(countQuery, values)
    const total = countResult[0]?.total || 0
    
    // Get products with category info
    const productsQuery = `
      SELECT 
        p.id, p.name, p.slug, p.description, p.price, p.compare_price, p.cost_price,
        p.category_id, c.name as category_name,
        p.designer_id, d.name as designer_name, d.image as designer_image,
        p.sku, p.barcode, p.stock, p.reserved_stock, p.low_stock_threshold, p.status, p.featured,
        p.image, p.images, p.weight, p.dimensions, p.tags, p.attributes,
        p.created_at, p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN designers d ON p.designer_id = d.id
      ${whereClause}
      ${orderSQL || "ORDER BY p.created_at DESC"}
      ${limitSQL}
    `
    const products = await query<ProductRow[]>(productsQuery, values)
    
    const result: PaginatedResult<ProductRow> = {
      data: products.map(p => ({
        ...p,
        price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
        compare_price: p.compare_price ? (typeof p.compare_price === 'string' ? parseFloat(p.compare_price) : p.compare_price) : null,
        cost_price: p.cost_price ? (typeof p.cost_price === 'string' ? parseFloat(p.cost_price) : p.cost_price) : null,
        featured: Boolean(p.featured),
        available_stock: p.stock - p.reserved_stock,
        images: p.images ? JSON.parse(p.images) : [],
        dimensions: p.dimensions ? JSON.parse(p.dimensions) : null,
        tags: p.tags ? JSON.parse(p.tags) : [],
        attributes: p.attributes ? JSON.parse(p.attributes) : null,
      })),
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
    console.error("GET /api/products error:", err.message)
    return NextResponse.json(
      { error: err.message || "Failed to fetch products" },
      { status: 500 }
    )
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sku,
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
    
    if (!name || price === undefined) {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 }
      )
    }
    
    const productId = `PRD${Date.now()}`
    const productSku = sku || `SKU-${Date.now()}`
    const slug = generateSlug(name)
    
    const insertQuery = `
      INSERT INTO products (
        id, name, slug, description, price, compare_price, cost_price,
        category_id, designer_id, sku, barcode, stock, reserved_stock, low_stock_threshold, status, featured,
        image, images, weight, dimensions, tags, attributes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    await query<ResultSetHeader>(insertQuery, [
      productId,
      name,
      slug,
      description || null,
      price,
      comparePrice || null,
      costPrice || null,
      categoryId || null,
      designerId || null,
      productSku,
      barcode || null,
      stock || 0,
      reservedStock || 0,
      lowStockThreshold || 10,
      status || "active",
      featured ? 1 : 0,
      image || null,
      images ? JSON.stringify(images) : null,
      weight || null,
      dimensions ? JSON.stringify(dimensions) : null,
      tags ? JSON.stringify(tags) : null,
      attributes ? JSON.stringify(attributes) : null,
    ])
    
    // Update category product count
    if (categoryId) {
      await query(
        "UPDATE categories SET product_count = product_count + 1 WHERE id = ?",
        [categoryId]
      )
    }
    
    // Get the created product
    const [newProduct] = await query<ProductRow[]>(
      "SELECT * FROM products WHERE id = ?",
      [productId]
    )
    
    return NextResponse.json(newProduct, { status: 201 })
  } catch (error: unknown) {
    console.error("POST /api/products error:", error)
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "A product with this SKU already exists" },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    )
  }
}
