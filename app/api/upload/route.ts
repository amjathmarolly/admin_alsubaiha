import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { cleanBaseName, CONTENT_TYPES, safeJoin, uploadDir } from "@/lib/uploads"

const MAX_BYTES = 200 * 1024 * 1024 // 200 MB (videos)

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const files = formData.getAll("file") as File[]

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
        }

        // Saved outside the build folder (UPLOAD_DIR) so uploads survive deploys;
        // served by app/uploads/[...path]/route.ts at the same /uploads/<name> URL.
        const dir = uploadDir()
        await mkdir(dir, { recursive: true })

        const uploadedUrls: string[] = []

        for (const file of files) {
            if (!file.name) continue

            const extension = path.extname(file.name).toLowerCase()
            if (!CONTENT_TYPES[extension]) {
                return NextResponse.json({ error: `File type ${extension || "(none)"} is not allowed` }, { status: 400 })
            }
            if (file.size > MAX_BYTES) {
                return NextResponse.json({ error: `${file.name} is larger than 200 MB` }, { status: 400 })
            }

            const buffer = Buffer.from(await file.arrayBuffer())

            // Unique, URL-safe file name: <original-name>-<timestamp>-<random>.<ext>
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
            const base = cleanBaseName(path.basename(file.name, path.extname(file.name)))
            const filename = `${base}-${uniqueSuffix}${extension}`
            const filepath = safeJoin(dir, filename)
            if (!filepath) continue

            await writeFile(filepath, buffer)
            uploadedUrls.push(`/uploads/${filename}`)
        }

        return NextResponse.json(
            { success: true, urls: uploadedUrls },
            { status: 200 }
        )
    } catch (error) {
        console.error("Upload error:", error)
        return NextResponse.json(
            { error: "Failed to upload files" },
            { status: 500 }
        )
    }
}
