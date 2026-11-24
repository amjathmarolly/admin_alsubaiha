import { NextRequest, NextResponse } from "next/server";
import { query, getPaginationSQL, type PaginatedResult, type PaginationParams } from "@/lib/db/config";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { withCors } from "@/lib/cors";
import { ensureDesignerColumns, readHoverVideo } from "@/lib/designer-media";
import { revalidateWebsite } from "@/lib/seo";

interface DesignerRow extends RowDataPacket {
  id: string;
  name: string;
  image: string;
  short_bio: string;
  inspiration_text: string;
  design_principles: string | any;
  notable_works: string | any;
  website: string | null;
  social_links: string | any;
  status: "active" | "inactive";
  sort_order: number;
  hover_video?: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CountRow extends RowDataPacket {
  total: number;
}

const ALLOWED_SORT_FIELDS = ["name", "sort_order", "created_at"];

// Helper to parse JSON fields safely
const parseJSONField = (field: any) => {
  if (!field) return [];
  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch (e) {
      return [];
    }
  }
  return field;
};

// GET /api/designers
async function getHandler(request: NextRequest) {
  try {
    await ensureDesignerColumns();
    const { searchParams } = new URL(request.url);

    const params: PaginationParams = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "100"),
      sortBy: searchParams.get("sortBy") || "sort_order",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "asc",
    };

    const status = searchParams.get("status") || "";

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (status) {
      conditions.push("status = ?");
      values.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const { orderSQL, limitSQL, limit } = getPaginationSQL(params, ALLOWED_SORT_FIELDS);

    const countQuery = `SELECT COUNT(*) as total FROM designers ${whereClause}`;
    const countResult = await query<CountRow[]>(countQuery, values);
    const total = countResult[0]?.total || 0;

    const itemsQuery = `
      SELECT * FROM designers
      ${whereClause}
      ${orderSQL || "ORDER BY sort_order ASC"}
      ${limitSQL}
    `;
    const items = await query<DesignerRow[]>(itemsQuery, values);

    // Format JSON columns for client consumption
    const formattedItems = items.map((item) => ({
      ...item,
      design_principles: parseJSONField(item.design_principles),
      notable_works: parseJSONField(item.notable_works),
      social_links: parseJSONField(item.social_links),
      hover_video: item.hover_video || null,
    }));

    const result: PaginatedResult<any> = {
      data: formattedItems,
      pagination: {
        page: params.page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("GET /api/designers error:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to fetch designers" },
      { status: 500 }
    );
  }
}

// POST /api/designers
async function postHandler(request: NextRequest) {
  try {
    await ensureDesignerColumns();
    const body = await request.json();
    const {
      name,
      image,
      shortBio,
      inspirationText,
      designPrinciples,
      notableWorks,
      website,
      socialLinks,
      status,
      sortOrder,
    } = body;

    const hover = readHoverVideo(body);
    if (hover.provided && "error" in hover) {
      return NextResponse.json({ error: hover.error }, { status: 400 });
    }

    if (!name || !image || !shortBio || !inspirationText) {
      return NextResponse.json(
        { error: "Name, Image, Short Bio, and Inspiration Text are required" },
        { status: 400 }
      );
    }

    // Generate clean ID from name (slug style)
    const id = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "") + `-${Date.now().toString().slice(-4)}`; // append random digits for uniqueness

    const insertQuery = `
      INSERT INTO designers (id, name, image, short_bio, inspiration_text, design_principles, notable_works, website, social_links, status, sort_order, hover_video)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query<ResultSetHeader>(insertQuery, [
      id,
      name,
      image,
      shortBio,
      inspirationText,
      JSON.stringify(designPrinciples || []),
      JSON.stringify(notableWorks || []),
      website || null,
      JSON.stringify(socialLinks || {}),
      status || "active",
      sortOrder || 0,
      hover.provided && "value" in hover ? hover.value : null,
    ]);

    const [newItem] = await query<DesignerRow[]>("SELECT * FROM designers WHERE id = ?", [id]);
    
    const formattedItem = {
      ...newItem,
      design_principles: parseJSONField(newItem.design_principles),
      notable_works: parseJSONField(newItem.notable_works),
      social_links: parseJSONField(newItem.social_links),
      hover_video: newItem.hover_video || null,
    };

    await revalidateWebsite().catch(() => false);
    return NextResponse.json(formattedItem, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/designers error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create designer" },
      { status: 500 }
    );
  }
}

export const GET = withCors(getHandler);
export const POST = withCors(postHandler);
export const OPTIONS = withCors(async () => NextResponse.json({}));
