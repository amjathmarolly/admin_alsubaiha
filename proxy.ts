/**
 * Guards every /api request (see lib/api-access.ts for the rules).
 * Pages are not checked here: they hold no data and load it through /api.
 */
import { NextRequest, NextResponse } from "next/server"
import { accessFor, PASSWORD_CHANGE_ALLOWED } from "@/lib/api-access"
import { decodeSession, SESSION_COOKIE } from "@/lib/session"

const deny = (status: number, error: string) => NextResponse.json({ error }, { status })

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  const access = accessFor(request.method, path)
  if (access === "public") return NextResponse.next()
  if (access === "disabled") return deny(404, "Not found")

  const session = await decodeSession(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session) return deny(401, "Please sign in")
  if (session.mustChange && !PASSWORD_CHANGE_ALLOWED.test(path)) {
    return deny(403, "Please change your temporary password first")
  }
  if (access === "staff" && session.isCustomer) return deny(403, "Staff only")
  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}
