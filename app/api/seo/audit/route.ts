// SEO health score + duplicate detection across every entry type.
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/integration-token"
import { listAllEntries } from "@/lib/seo-entries"

export const dynamic = "force-dynamic"

export interface AuditIssue {
  code: string
  message: string
  severity: "error" | "warning" | "info"
}

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied
  try {
    const entries = await listAllEntries()
    const rows = entries.map((e) => ({
      e,
      title: (e.seo?.title || e.defaults.title || "").trim(),
      description: (e.seo?.description || e.defaults.description || "").trim(),
      image: e.seo?.ogImage || e.defaults.image || "",
    }))

    const count = (field: "title" | "description") => {
      const m = new Map<string, number>()
      for (const r of rows) {
        const k = r[field].toLowerCase()
        if (k) m.set(k, (m.get(k) ?? 0) + 1)
      }
      return m
    }
    const titles = count("title")
    const descs = count("description")

    const results = rows.map(({ e, title, description, image }) => {
      const issues: AuditIssue[] = []
      let score = 100
      const add = (code: string, message: string, severity: AuditIssue["severity"], penalty: number) => {
        issues.push({ code, message, severity })
        score -= penalty
      }
      if (!title) add("no_title", "No SEO title", "error", 25)
      else if (title.length < 30) add("short_title", `Title is short (${title.length} chars, aim for 30–60)`, "warning", 8)
      else if (title.length > 60) add("long_title", `Title is too long (${title.length}/60) and may be cut off`, "warning", 8)

      if (!description) add("no_description", "No meta description", "error", 25)
      else if (description.length < 70) add("short_description", `Description is short (${description.length} chars, aim for 70–160)`, "warning", 8)
      else if (description.length > 160) add("long_description", `Description is too long (${description.length}/160)`, "warning", 8)

      if (!image) add("no_image", "No social share image", "warning", 15)
      if (!e.seo) add("no_custom", "Using automatic values only", "info", 0)
      if (e.seo?.noindex) add("noindex", "Hidden from search engines (noindex)", "info", 0)

      const dt = title ? titles.get(title.toLowerCase()) ?? 0 : 0
      if (dt > 1) add("duplicate_title", `Same title used on ${dt} entries`, "warning", 10)
      const dd = description ? descs.get(description.toLowerCase()) ?? 0 : 0
      if (dd > 1) add("duplicate_description", `Same description used on ${dd} entries`, "warning", 10)

      return {
        type: e.type,
        key: e.key,
        label: e.label,
        path: e.path,
        score: Math.max(0, score),
        issues,
      }
    })

    const avg = results.length ? Math.round(results.reduce((a, r) => a + r.score, 0) / results.length) : 100
    return NextResponse.json({ average: avg, total: results.length, results })
  } catch (error) {
    console.error("GET /api/seo/audit error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to run SEO audit" }, { status: 500 })
  }
}
