"use client"

import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ListEditor, type FieldDef, type Item } from "@/components/content/list-editor"

const FIELDS: FieldDef[] = [
  { key: "question", label: "Question", required: true, placeholder: "How long does a bespoke sofa take?" },
  { key: "answer", label: "Answer", type: "textarea", rows: 5, required: true, hint: "Plain text. Write the full answer: Google and AI assistants quote it." },
  {
    key: "pages",
    label: "Show on pages",
    type: "textarea",
    rows: 3,
    placeholder: "/faq\n/collections/sofa",
    hint: "One website path per line. Leave empty to show it on the FAQ page only. Add /faq to keep it there too.",
  },
  { key: "category", label: "Category", half: true, placeholder: "Ordering & delivery", hint: "FAQs with the same category are grouped together" },
  { key: "sortOrder", label: "Order", type: "number", half: true, hint: "Lower numbers show first" },
  { key: "image", label: "Photo", type: "image", hint: "Optional. Shown next to the answer on the website." },
  { key: "imageAlt", label: "Photo description (alt text)", placeholder: "Bespoke boucle sofa being upholstered in our Sharjah factory", hint: "Describe the photo for Google and screen readers" },
]

export default function FaqsPage() {
  return (
    <DashboardLayout
      title="FAQ"
      description="Questions and answers for the website's FAQ page and collection or product pages, with FAQ schema for Google."
      requiredPermission="view_products"
    >
      <ListEditor
        endpoint="/api/faqs"
        listKey="faqs"
        noun="question"
        fields={FIELDS}
        blank={{ question: "", answer: "", pages: "", category: "", image: "", imageAlt: "", sortOrder: 0, status: "active" }}
        toForm={(f: Item) => ({ ...f, pages: (f.pages ?? []).join("\n") })}
        searchText={(f) => `${f.question} ${f.answer} ${f.category ?? ""} ${(f.pages ?? []).join(" ")}`}
        renderRow={(f) => (
          <div className="flex min-w-0 gap-3">
            {f.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.image} alt={f.imageAlt || ""} className="h-14 w-14 shrink-0 rounded-md object-cover" />
            )}
            <div className="min-w-0">
            <p className="font-medium">{f.question}</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">{f.answer}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {[f.category, (f.pages?.length ? f.pages : ["/faq"]).join(" · ")].filter(Boolean).join(" — ")}
            </p>
            </div>
          </div>
        )}
      />
    </DashboardLayout>
  )
}
