"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface Row { key: string; clicks: number; impressions: number; ctr: number; position: number }
interface Data { configured: boolean; error?: string; range?: { start: string; end: string }; pages?: Row[]; queries?: Row[] }

function Table({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <Card><CardContent className="p-0">
      <h3 className="border-b p-4 font-medium">{title}</h3>
      {rows.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No data.</p> : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-3">&nbsp;</th><th className="p-3">Clicks</th><th className="p-3">Impr.</th><th className="p-3">CTR</th><th className="p-3">Pos.</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.key} className="border-t">
              <td className="max-w-[260px] truncate p-3" title={r.key}>{r.key.replace(/^https?:\/\/[^/]+/, "") || "/"}</td>
              <td className="p-3">{r.clicks}</td><td className="p-3">{r.impressions}</td><td className="p-3">{(r.ctr * 100).toFixed(1)}%</td><td className="p-3">{r.position.toFixed(1)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </CardContent></Card>
  )
}

export function SearchConsoleTab() {
  const [data, setData] = useState<Data | null>(null)
  useEffect(() => { fetch("/api/seo/search-console").then((r) => r.json()).then(setData).catch((e) => setData({ configured: true, error: e.message })) }, [])

  if (!data) return <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
  if (!data.configured)
    return (
      <Card><CardContent className="space-y-3 p-6 text-sm">
        <h3 className="font-medium">Connect Google Search Console</h3>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>In Google Cloud, enable the <b>Google Search Console API</b> and create a <b>service account</b> + JSON key.</li>
          <li>In Search Console → Settings → Users and permissions, add the service account's email as a <b>Restricted</b> user.</li>
          <li>Add to the admin's environment and restart:
            <pre className="mt-1 overflow-x-auto rounded bg-secondary p-2 text-xs">{`GSC_CLIENT_EMAIL=name@project.iam.gserviceaccount.com\nGSC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n…\\n-----END PRIVATE KEY-----\\n"\nGSC_SITE_URL=sc-domain:alsubaiha.ae   # or https://alsubaiha.ae/`}</pre>
          </li>
        </ol>
      </CardContent></Card>
    )
  if (data.error) return <Card><CardContent className="p-6 text-sm text-destructive">Search Console error: {data.error}</CardContent></Card>
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Last 28 days ({data.range?.start} → {data.range?.end}). Search Console data is ~2 days behind.</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Table title="Top pages" rows={data.pages ?? []} />
        <Table title="Top search queries" rows={data.queries ?? []} />
      </div>
    </div>
  )
}
