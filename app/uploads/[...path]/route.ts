// Serves uploaded files from UPLOAD_DIR (kept outside the build folder, so they
// survive deploys), falling back to files that shipped in public/uploads.
import { NextRequest, NextResponse } from "next/server"
import { createReadStream } from "fs"
import { stat } from "fs/promises"
import path from "path"
import { Readable } from "stream"
import { bundledUploadDir, CONTENT_TYPES, safeJoin, uploadDir } from "@/lib/uploads"

export const dynamic = "force-dynamic"

async function findFile(rel: string): Promise<{ file: string; size: number; mtime: Date } | null> {
  for (const dir of [uploadDir(), bundledUploadDir()]) {
    const file = safeJoin(dir, rel)
    if (!file) return null
    try {
      const st = await stat(file)
      if (st.isFile()) return { file, size: st.size, mtime: st.mtime }
    } catch {
      /* try the next folder */
    }
  }
  return null
}

/**
 * Parses a single "bytes=" range. Returns null to send the whole file (no usable
 * range, or several ranges, which are rarely used), or "invalid" for a range that
 * starts past the end of the file.
 */
function parseRange(header: string, size: number): { start: number; end: number } | null | "invalid" {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!m || (m[1] === "" && m[2] === "")) return null
  let start: number
  let end: number
  if (m[1] === "") {
    // Suffix range: the last N bytes.
    const n = Number(m[2])
    if (n === 0) return "invalid"
    start = Math.max(0, size - n)
    end = size - 1
  } else {
    start = Number(m[1])
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1)
  }
  if (start >= size || start > end) return "invalid"
  return { start, end }
}

async function serve(request: NextRequest, params: Promise<{ path: string[] }>, head: boolean) {
  const parts = (await params).path ?? []
  let rel: string
  try {
    rel = parts.map((p) => decodeURIComponent(p)).join("/")
  } catch {
    return new NextResponse("Not found", { status: 404 })
  }
  const type = CONTENT_TYPES[path.extname(rel).toLowerCase()]
  if (!type) return new NextResponse("Not found", { status: 404 })
  const found = await findFile(rel)
  if (!found) return new NextResponse("Not found", { status: 404 })

  const headers = new Headers({
    "Content-Type": type,
    "Content-Length": String(found.size),
    // File names include a timestamp, so a file never changes once uploaded.
    "Cache-Control": "public, max-age=31536000, immutable",
    "Last-Modified": found.mtime.toUTCString(),
    "Access-Control-Allow-Origin": "*",
    "X-Content-Type-Options": "nosniff",
    // Byte ranges let browsers (Safari in particular) seek and play videos.
    "Accept-Ranges": "bytes",
  })
  // SVGs can contain scripts; never let them run.
  if (type === "image/svg+xml") headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox")

  const rangeHeader = request.headers.get("range")
  if (rangeHeader && found.size > 0) {
    const range = parseRange(rangeHeader, found.size)
    if (range === "invalid") {
      headers.set("Content-Range", `bytes */${found.size}`)
      headers.set("Content-Length", "0")
      return new NextResponse(null, { status: 416, headers })
    }
    if (range) {
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${found.size}`)
      headers.set("Content-Length", String(range.end - range.start + 1))
      if (head) return new NextResponse(null, { status: 206, headers })
      const part = Readable.toWeb(createReadStream(found.file, { start: range.start, end: range.end })) as unknown as ReadableStream
      return new NextResponse(part, { status: 206, headers })
    }
  }

  if (head) return new NextResponse(null, { status: 200, headers })
  const since = request.headers.get("if-modified-since")
  if (since && new Date(since).getTime() >= Math.floor(found.mtime.getTime() / 1000) * 1000) {
    return new NextResponse(null, { status: 304, headers })
  }
  const body = Readable.toWeb(createReadStream(found.file)) as unknown as ReadableStream
  return new NextResponse(body, { status: 200, headers })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return serve(request, params, false)
}

export async function HEAD(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return serve(request, params, true)
}
