import path from "path"

/**
 * Where uploaded files are stored.
 *
 * Set UPLOAD_DIR (Hostinger -> Environment variables) to a folder OUTSIDE the app's
 * build folder, e.g. /home/<user>/domains/admin.alsubaiha.ae/uploads. Every deploy
 * replaces the build folder, so files saved inside it are lost; and the production
 * server only serves files that were in public/ at build time.
 */
export function uploadDir(): string {
  return path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads"))
}

/** Older uploads that shipped inside the build (public/uploads). Read-only fallback. */
export function bundledUploadDir(): string {
  return path.resolve(process.cwd(), "public", "uploads")
}

export const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
}

/** Resolves a relative upload path inside `dir`, or null if it would leave it. */
export function safeJoin(dir: string, rel: string): string | null {
  const full = path.resolve(dir, rel)
  return full === dir || !full.startsWith(dir + path.sep) ? null : full
}

/** A safe file name: letters, digits, dot, dash and underscore only. */
export function cleanBaseName(name: string): string {
  return (
    path
      .basename(name)
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(0, 80) || "file"
  )
}
