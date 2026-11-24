import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const files = formData.getAll("file") as File[]

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
        }

        const uploadDir = path.join(process.cwd(), "public/uploads")

        // Ensure upload directory exists
        try {
            await mkdir(uploadDir, { recursive: true })
        } catch (e) {
            // Ignore if directory already exists
        }

        const uploadedUrls: string[] = []

        for (const file of files) {
            if (!file.name) continue

            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)

            // Create a unique filename
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
            const extension = path.extname(file.name)
            const filename = `${path.basename(file.name, extension)}-${uniqueSuffix}${extension}`
            const filepath = path.join(uploadDir, filename)

            await writeFile(filepath, buffer)

            // Store the public URL
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
