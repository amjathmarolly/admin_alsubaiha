"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ListEditor, type FieldDef, type Item } from "@/components/content/list-editor"

const FIELDS: FieldDef[] = [
  { key: "name", label: "Material", required: true, placeholder: "Boucle", half: true },
  { key: "surchargePct", label: "Extra price (%)", type: "number", placeholder: "10", hint: "Added to the size price. 0 = no extra.", half: true },
  { key: "description", label: "Short description", placeholder: "Soft looped textured fabric" },
  {
    key: "categories",
    label: "Categories it suits",
    type: "textarea",
    rows: 3,
    placeholder: "Sofa\nArmchair\nDining Chair",
    hint: "One category per line, exactly as named in Categories. Leave empty for every category.",
  },
  { key: "sortOrder", label: "Order", type: "number", half: true },
]

export default function MaterialsPage() {
  return (
    <DashboardLayout
      title="Materials"
      description="Materials clients can choose on product pages, each with a % extra on the price of the size they pick."
      requiredPermission="view_products"
    >
      <ListEditor
        endpoint="/api/materials"
        listKey="materials"
        noun="material"
        fields={FIELDS}
        blank={{ name: "", surchargePct: 0, description: "", categories: "", sortOrder: 0, status: "active" }}
        toForm={(m: Item) => ({ ...m, categories: (m.categories ?? []).join("\n") })}
        searchText={(m) => `${m.name} ${(m.categories ?? []).join(" ")}`}
        renderRow={(m) => (
          <div className="min-w-0">
            <p className="font-medium">
              {m.name} <span className="text-muted-foreground">· {Number(m.surchargePct) > 0 ? `+${m.surchargePct}%` : "no extra"}</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {(m.categories ?? []).length ? (m.categories as string[]).join(", ") : "All categories"}
            </p>
          </div>
        )}
      />
    </DashboardLayout>
  )
}
