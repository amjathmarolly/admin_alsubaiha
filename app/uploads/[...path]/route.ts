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
  })
  // SVGs can contain scripts; never let them run.
  if (type === "image/svg+xml") headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox")

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
