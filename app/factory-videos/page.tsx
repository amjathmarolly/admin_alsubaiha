"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ListEditor, type FieldDef, type Item } from "@/components/content/list-editor"

const FIELDS: FieldDef[] = [
  { key: "youtubeId", label: "YouTube link or video ID", required: true, placeholder: "https://youtube.com/shorts/…", hint: "Paste the Short's link; the ID is taken from it." },
  { key: "title", label: "Title", required: true, hint: "Use the same title as on YouTube, so Google sees one story." },
  { key: "description", label: "Description", type: "textarea", rows: 3 },
  { key: "uploadDate", label: "Published on YouTube", type: "datetime", half: true },
  { key: "duration", label: "Length", placeholder: "0:25", half: true, hint: "Minutes:seconds or seconds" },
  { key: "stage", label: "Stage shown on the card", placeholder: "Upholstery", half: true },
  { key: "sortOrder", label: "Order", type: "number", half: true, hint: "Lower numbers show first" },
  { key: "linkLabel", label: "Link text", placeholder: "Explore bespoke armchairs", half: true },
  { key: "linkUrl", label: "Link to", placeholder: "/collections/armchair", half: true, hint: "A product or collection on the website" },
]

const fmt = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "")
const local = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "")

export default function FactoryVideosPage() {
  return (
    <DashboardLayout
      title="Factory Videos"
      description="YouTube Shorts from the factory, shown on the website's Atelier Live page with video schema for Google."
      requiredPermission="view_our_work"
    >
      <ListEditor
        endpoint="/api/factory-videos"
        listKey="videos"
        noun="video"
        fields={FIELDS}
        blank={{ youtubeId: "", title: "", description: "", uploadDate: "", duration: "", stage: "", sortOrder: 0, linkLabel: "", linkUrl: "", status: "active" }}
        toForm={(v: Item) => ({ ...v, duration: fmt(v.durationSeconds), uploadDate: local(v.uploadDate) })}
        searchText={(v) => `${v.title} ${v.stage ?? ""} ${v.youtubeId}`}
        renderRow={(v) => (
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`} alt="" className="h-16 w-12 shrink-0 rounded object-cover" loading="lazy" />
            <div className="min-w-0">
              <p className="truncate font-medium">{v.title}</p>
              <p className="text-xs text-muted-foreground">
                {[v.stage, fmt(v.durationSeconds), v.uploadDate ? new Date(v.uploadDate).toLocaleDateString() : null, v.linkUrl].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        )}
      />
    </DashboardLayout>
  )
}
