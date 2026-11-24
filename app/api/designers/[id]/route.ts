import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/config";
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

// GET /api/designers/[id]
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Resolve promise params for Next.js 15/16
    const resolvedParams = await params;
    const { id } = resolvedParams;
    await ensureDesignerColumns();

    const items = await query<DesignerRow[]>(
      "SELECT * FROM designers WHERE id = ?",
      [id]
    );

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Designer not found" },
        { status: 404 }
      );
    }

    const item = items[0];
    const formattedItem = {
      ...item,
      design_principles: parseJSONField(item.design_principles),
      notable_works: parseJSONField(item.notable_works),
      social_links: parseJSONField(item.social_links),
      hover_video: item.hover_video || null,
    };

    return NextResponse.json(formattedItem);
  } catch (error: any) {
    console.error("GET /api/designers/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch designer" },
      { status: 500 }
    );
  }
}

// PUT /api/designers/[id]
async function putHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    await ensureDesignerColumns();
    const body = await request.json();
    const hover = readHoverVideo(body);
    if (hover.provided && "error" in hover) {
      return NextResponse.json({ error: hover.error }, { status: 400 });
    }
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

    // Verify designer exists
    const existing = await query<any[]>("SELECT id FROM designers WHERE id = ?", [id]);
    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Designer not found" },
        { status: 404 }
      );
    }

    const updateQuery = `
      UPDATE designers 
      SET name = ?, image = ?, short_bio = ?, inspiration_text = ?, 
          design_principles = ?, notable_works = ?, website = ?, social_links = ?, 
          status = ?, sort_order = ?${hover.provided ? ", hover_video = ?" : ""}
      WHERE id = ?
    `;

    await query<ResultSetHeader>(updateQuery, [
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
      ...(hover.provided && "value" in hover ? [hover.value] : []),
      id,
    ]);

    const [updatedItem] = await query<DesignerRow[]>("SELECT * FROM designers WHERE id = ?", [id]);

    const formattedItem = {
      ...updatedItem,
      design_principles: parseJSONField(updatedItem.design_principles),
      notable_works: parseJSONField(updatedItem.notable_works),
      social_links: parseJSONField(updatedItem.social_links),
      hover_video: updatedItem.hover_video || null,
    };

    await revalidateWebsite().catch(() => false);
    return NextResponse.json(formattedItem);
  } catch (error: any) {
    console.error("PUT /api/designers/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update designer" },
      { status: 500 }
    );
  }
}

// DELETE /api/designers/[id]
async function deleteHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const existing = await query<any[]>("SELECT id FROM designers WHERE id = ?", [id]);
    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Designer not found" },
        { status: 404 }
      );
    }

    await query<ResultSetHeader>("DELETE FROM designers WHERE id = ?", [id]);
    await revalidateWebsite().catch(() => false);

    return NextResponse.json({ success: true, message: "Designer deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/designers/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete designer" },
      { status: 500 }
    );
  }
}

export const GET = withCors(getHandler);
export const PUT = withCors(putHandler);
export const DELETE = withCors(deleteHandler);
export const OPTIONS = withCors(async () => NextResponse.json({}));
