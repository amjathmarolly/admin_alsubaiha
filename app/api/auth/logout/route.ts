import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { withCors } from "@/lib/cors"

// POST /api/auth/logout
const logoutHandler = async (req: NextRequest) => {
  try {
    const cookieStore = await cookies()
    cookieStore.delete("session")
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/auth/logout error:", error)
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    )
  }
}

export const POST = withCors(logoutHandler)

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
}
