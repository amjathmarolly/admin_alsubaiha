/**
 * Designer hover video: a short muted clip the website plays while the mouse is
 * over a designer's thumbnail. Stored in designers.hover_video (added on first use).
 */
import { addColumnIfMissing } from "@/lib/seo"

let ready: Promise<void> | null = null
export function ensureDesignerColumns(): Promise<void> {
  ready ??= addColumnIfMissing("designers", "hover_video", "VARCHAR(500) NULL").catch((e) => {
    ready = null
    throw e
  })
  return ready
}

export type HoverVideoInput = { provided: false } | { provided: true; value: string | null } | { provided: true; error: string }

/** Reads `hover_video` or `hoverVideo` from a request body. Absent = leave unchanged. */
export function readHoverVideo(body: Record<string, unknown>): HoverVideoInput {
  const raw = body.hover_video !== undefined ? body.hover_video : body.hoverVideo
  if (raw === undefined) return { provided: false }
  if (raw === null) return { provided: true, value: null }
  if (typeof raw !== "string") return { provided: true, error: "Hover video must be a link" }
  const v = raw.trim()
  if (!v) return { provided: true, value: null }
  if (v.length > 500) return { provided: true, error: "Hover video link is too long" }
  if (!/^(\/uploads\/|https:\/\/)/i.test(v)) return { provided: true, error: "Hover video must be an uploaded file or start with https://" }
  return { provided: true, value: v }
}
