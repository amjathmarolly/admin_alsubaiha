// FAQs (Admin -> FAQ). ?page=/faq or ?page=/collections/sofas returns the questions for that page.
// GET is public (the website reads it); add ?all=1 when signed in to include drafts.
import { NextRequest, NextResponse } from "next/server"
import { hasStaffSession } from "@/lib/integration-token"
import { revalidateWebsite } from "@/lib/seo"
import { listFaqs, saveFaq } from "@/lib/site-content"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const all = request.nextUrl.searchParams.get("all") === "1" && (await hasStaffSession())
    const items = await listFaqs({ onlyActive: !all, page: request.nextUrl.searchParams.get("page") })
    return NextResponse.json({ faqs: items })
  } catch (error) {
    console.error("GET /api/faqs error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to load" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await hasStaffSession())) return NextResponse.json({ error: "Please sign in again" }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  try {
    const result = await saveFaq(body)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    const revalidated = await revalidateWebsite()
    return NextResponse.json({ ok: true, id: result.id, revalidated }, { status: 201 })
  } catch (error) {
    console.error("POST /api/faqs error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
