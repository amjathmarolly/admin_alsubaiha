// Service-to-service endpoint: the tracker calls this to get the current
// Monday.com token. Protected by the shared INTERNAL_API_KEY, never by a browser session.
import { NextRequest, NextResponse } from "next/server"
import { hasValidInternalKey, readMondayToken } from "@/lib/integration-token"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (!hasValidInternalKey(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const stored = await readMondayToken()
    if (!stored) {
      return NextResponse.json({ error: "Monday.com token not configured" }, { status: 404 })
    }
    return NextResponse.json(
      { token: stored.token, updatedAt: stored.updatedAt },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("GET /api/internal/monday-token error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to read token" }, { status: 500 })
  }
}
