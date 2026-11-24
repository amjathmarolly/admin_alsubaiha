import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const products = [
  {
    name: "Oslo Modern Sofa",
    category: "Sofas",
    sales: 234,
    revenue: "$582,660",
    progress: 95,
  },
  {
    name: "Copenhagen Dining Table",
    category: "Tables",
    sales: 189,
    revenue: "$349,650",
    progress: 78,
  },
  {
    name: "Stockholm Bed Frame",
    category: "Beds",
    sales: 156,
    revenue: "$201,240",
    progress: 65,
  },
  {
    name: "Bergen Armchair",
    category: "Chairs",
    sales: 142,
    revenue: "$139,160",
    progress: 58,
  },
  {
    name: "Helsinki Coffee Table",
    category: "Tables",
    sales: 128,
    revenue: "$89,600",
    progress: 52,
  },
]

export function TopProducts() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Top Products</CardTitle>
          <CardDescription>Best performing products this month</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-primary" asChild>
          <Link href="/products">
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {products.map((product, index) => (
            <Link
              key={product.name}
              href={`/products?search=${encodeURIComponent(product.name)}`}
              className="block space-y-2 rounded-lg p-2 -mx-2 transition-colors hover:bg-secondary/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{product.revenue}</p>
                  <p className="text-xs text-muted-foreground">{product.sales} sold</p>
                </div>
              </div>
              <Progress value={product.progress} className="h-1.5" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
