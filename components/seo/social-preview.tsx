"use client"

import { useState } from "react"
import { ExternalLink } from "lucide-react"

interface Props {
  url: string // e.g. alsubaiha.ae/collections/sofas
  title: string
  description: string
  image: string
  twitterCard: "summary" | "summary_large_image"
}

const PLATFORMS = ["WhatsApp", "Facebook", "X", "LinkedIn"] as const
type Platform = (typeof PLATFORMS)[number]

export function SocialPreview({ url, title, description, image, twitterCard }: Props) {
  const [tab, setTab] = useState<Platform>("WhatsApp")
  const host = url.split("/")[0]
  const full = `https://${url}`
  const img = (cls: string) =>
    image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" className={`${cls} object-cover`} />
    ) : (
      <div className={`${cls} flex items-center justify-center bg-secondary text-xs text-muted-foreground`}>No image</div>
    )

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setTab(p)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${tab === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="rounded-md border bg-secondary/30 p-3">
        {tab === "WhatsApp" && (
          <div className="max-w-xs overflow-hidden rounded-lg bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-white">
            {img("h-36 w-full")}
            <div className="space-y-0.5 p-2 text-sm">
              <p className="line-clamp-2 font-medium">{title}</p>
              <p className="line-clamp-2 text-xs opacity-80">{description}</p>
              <p className="text-xs opacity-60">{host}</p>
            </div>
          </div>
        )}
        {tab === "Facebook" && (
          <div className="max-w-md overflow-hidden border bg-white text-black">
            {img("aspect-[1200/630] w-full")}
            <div className="space-y-0.5 bg-[#f2f3f5] p-3">
              <p className="text-xs uppercase text-gray-500">{host}</p>
              <p className="line-clamp-2 font-semibold">{title}</p>
              <p className="line-clamp-1 text-sm text-gray-600">{description}</p>
            </div>
          </div>
        )}
        {tab === "X" &&
          (twitterCard === "summary_large_image" ? (
            <div className="max-w-md overflow-hidden rounded-2xl border bg-white text-black">
              {img("aspect-[1200/630] w-full")}
              <div className="p-3 text-sm">
                <p className="text-xs text-gray-500">{host}</p>
                <p className="line-clamp-1 font-medium">{title}</p>
                <p className="line-clamp-2 text-gray-500">{description}</p>
              </div>
            </div>
          ) : (
            <div className="flex max-w-md overflow-hidden rounded-2xl border bg-white text-black">
              {img("h-24 w-24 shrink-0")}
              <div className="min-w-0 p-3 text-sm">
                <p className="text-xs text-gray-500">{host}</p>
                <p className="line-clamp-1 font-medium">{title}</p>
                <p className="line-clamp-2 text-gray-500">{description}</p>
              </div>
            </div>
          ))}
        {tab === "LinkedIn" && (
          <div className="max-w-md overflow-hidden border bg-white text-black shadow-sm">
            {img("aspect-[1200/630] w-full")}
            <div className="p-3">
              <p className="line-clamp-2 text-sm font-semibold">{title}</p>
              <p className="text-xs text-gray-500">{host}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Apps cache previews. After changing the image, re-scrape:</span>
        <a className="inline-flex items-center gap-1 underline" target="_blank" rel="noreferrer" href={`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(full)}`}>
          Facebook / WhatsApp <ExternalLink className="h-3 w-3" />
        </a>
        <a className="inline-flex items-center gap-1 underline" target="_blank" rel="noreferrer" href={`https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(full)}`}>
          LinkedIn <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}
