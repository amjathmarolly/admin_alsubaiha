/**
 * Who may call which /api route. Checked for every request in proxy.ts.
 *
 * Default: staff only. A route is open without sign-in only when it is listed
 * here, so a new route is private until someone decides otherwise.
 */
export type Access =
  /** Anyone (the route may still check a key or secret itself). */
  | "public"
  /** A signed-in customer or staff member; the route limits customers to their own data. */
  | "customer"
  /** A signed-in staff member. */
  | "staff"
  /** Switched off on the live site. */
  | "disabled"

/** Read by the website (and the browser) without sign-in. */
const PUBLIC_READ = [
  /^\/api\/products(\/.*)?$/,
  /^\/api\/categories(\/.*)?$/,
  /^\/api\/projects(\/.*)?$/,
  /^\/api\/designers(\/[^/]+)?$/,
  /^\/api\/faqs(\/.*)?$/,
  /^\/api\/factory-videos(\/.*)?$/,
  /^\/api\/our-work(\/.*)?$/,
  /^\/api\/blogs(\/.*)?$/,
  /^\/api\/atelier-items\/public$/,
  /^\/api\/membership-plans(\/[^/]+)?$/,
  /^\/api\/seo$/,
  /^\/api\/seo\/(site|structured-data|sitemap|settings)$/,
  /^\/api\/health$/,
]

/** Sign-in flow: each route checks what it needs itself. */
const AUTH_OPEN = /^\/api\/auth\/(login|logout|me|signup|verify-email|verify-otp|change-password)$/

/** Server-to-server routes protected by their own shared key. */
const KEYED = [
  { method: "POST", path: /^\/api\/seo\/404$/ }, // x-revalidate-secret
  { method: "GET", path: /^\/api\/internal\/monday-token$/ }, // INTERNAL_API_KEY
  { method: "POST", path: /^\/api\/client-logins\/sync$/ }, // CLIENT_SYNC_KEY, or an owner's session
]

/** One-off database setup routes. Some of them drop tables. */
const DISABLED = [/^\/api\/setup(\/.*)?$/, /^\/api\/setup-db(\/.*)?$/, /^\/api\/designers\/setup$/]

/** Routes a session that must change its password can still use. */
export const PASSWORD_CHANGE_ALLOWED = /^\/api\/auth\/(me|logout|change-password)$/

export function accessFor(method: string, rawPath: string): Access {
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath
  const m = method.toUpperCase()
  if (m === "OPTIONS") return "public"
  if (DISABLED.some((r) => r.test(path))) return "disabled"
  if (AUTH_OPEN.test(path)) return "public"
  if (KEYED.some((k) => k.method === m && k.path.test(path))) return "public"
  if ((m === "GET" || m === "HEAD") && PUBLIC_READ.some((r) => r.test(path))) return "public"
  if (m === "GET" && path === "/api/orders") return "customer"
  return "staff"
}
