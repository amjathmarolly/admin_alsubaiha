"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface Size {
  label: string
  width: number
  depth: number
  height: number
  price: number
  fromCategory?: boolean
}
interface Material {
  id: string
  name: string
  surchargePct: number
  categories: string[]
  status: string
}
interface Options {
  sizes: Size[]
  materials: { id: string; name: string; surchargePct: number }[]
  fromPrice: number
  toPrice: number
}

const aed = (n: number) => `AED ${Math.round(n).toLocaleString("en-AE")}`
const price = (size: number, pct: number) => Math.round((size * (1 + pct / 100)) / 10) * 10

/** Sizes (three price steps) and the materials offered for one product. */
export function ProductOptionsDialog({
  product,
  onOpenChange,
}: {
  product: { id: string; name: string; category?: string } | null
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const [sizes, setSizes] = React.useState<Size[]>([])
  const [usesDefaults, setUsesDefaults] = React.useState(true)
  const [allMaterials, setAllMaterials] = React.useState<Material[]>([])
  const [chosen, setChosen] = React.useState<Set<string>>(new Set())
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!product) return
    setLoading(true)
    Promise.all([
      fetch(`/api/products/${encodeURIComponent(product.id)}/options`, { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/materials", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([o, m]: [Options, { materials: Material[] }]) => {
        setSizes(o.sizes ?? [])
        setUsesDefaults(Boolean(o.sizes?.[0]?.fromCategory))
        setAllMaterials(m.materials ?? [])
        setChosen(new Set((o.materials ?? []).map((x) => x.id)))
      })
      .catch(() => toast({ title: "Could not load sizes and materials", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [product, toast])

  const setSize = (i: number, key: keyof Size, value: string) =>
    setSizes((s) => s.map((x, j) => (j === i ? { ...x, [key]: key === "label" ? value : Number(value) || 0, fromCategory: false } : x)))

  const save = async (resetSizes = false) => {
    if (!product) return
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(product.id)}/options`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sizes: resetSizes ? null : sizes.map(({ label, width, depth, height, price }) => ({ label, width, depth, height, price })),
          materialIds: [...chosen],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Not saved")
      toast({ title: "Sizes and materials saved" })
      if (resetSizes && data.options) {
        setSizes(data.options.sizes)
        setUsesDefaults(true)
      } else onOpenChange(false)
    } catch (e) {
      toast({ title: "Not saved", description: (e as Error).message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const offered = allMaterials.filter((m) => chosen.has(m.id))
  const min = Math.min(...offered.map((m) => m.surchargePct), 0)

  return (
    <Dialog open={product !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Sizes & materials · {product?.name}</DialogTitle>
          <DialogDescription>
            Clients pick a size and a material on the product page and see the price. The first size at the listed price is the
            &quot;from&quot; price.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="space-y-6 text-sm">
            <div>
              <p className="mb-1 font-medium">Sizes (cm) and price in the base material</p>
              {usesDefaults && (
                <p className="mb-2 text-xs text-muted-foreground">
                  These are the standard sizes for {product?.category || "this category"}, priced from the listed price. Change any
                  value to give this product its own sizes.
                </p>
              )}
              <div className="grid grid-cols-[1.6fr_repeat(3,0.8fr)_1fr] gap-2 text-xs text-muted-foreground">
                <span>Name</span>
                <span>Width</span>
                <span>Depth</span>
                <span>Height</span>
                <span>Price (AED)</span>
              </div>
              {sizes.map((s, i) => (
                <div key={i} className="mt-1 grid grid-cols-[1.6fr_repeat(3,0.8fr)_1fr] gap-2">
                  <Input value={s.label} onChange={(e) => setSize(i, "label", e.target.value)} />
                  <Input type="number" value={s.width || ""} onChange={(e) => setSize(i, "width", e.target.value)} />
                  <Input type="number" value={s.depth || ""} onChange={(e) => setSize(i, "depth", e.target.value)} />
                  <Input type="number" value={s.height || ""} onChange={(e) => setSize(i, "height", e.target.value)} />
                  <Input type="number" value={s.price || ""} onChange={(e) => setSize(i, "price", e.target.value)} />
                </div>
              ))}
              {!usesDefaults && (
                <Button type="button" variant="link" className="h-auto px-0 text-xs" onClick={() => save(true)} disabled={saving}>
                  Go back to the standard sizes for this category
                </Button>
              )}
            </div>

            <div>
              <p className="mb-2 font-medium">Materials offered</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {allMaterials.map((m) => (
                  <label key={m.id} className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={chosen.has(m.id)}
                      onCheckedChange={(c) =>
                        setChosen((set) => {
                          const n = new Set(set)
                          if (c) n.add(m.id)
                          else n.delete(m.id)
                          return n
                        })
                      }
                    />
                    <span>
                      {m.name} <span className="text-muted-foreground">{m.surchargePct > 0 ? `+${m.surchargePct}%` : "no extra"}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Edit the list and the % in Admin → Materials.</p>
            </div>

            {offered.length > 0 && sizes.length > 0 && (
              <div>
                <p className="mb-2 font-medium">Prices clients will see</p>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="p-2 text-left">Size</th>
                        {offered.map((m) => (
                          <th key={m.id} className="p-2 text-right">
                            {m.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sizes.map((s, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="p-2">{s.label}</td>
                          {offered.map((m) => (
                            <td key={m.id} className="p-2 text-right">
                              {aed(price(s.price, m.surchargePct))}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">From {aed(price(sizes[0].price, min))}. Member discounts apply on top.</p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save(false)} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
