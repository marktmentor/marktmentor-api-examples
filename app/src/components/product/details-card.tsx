import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/i18n"
import type { Product } from "@/lib/types"

/** The extra fields of GET research/products/{code}/ (no extra request). */
export function ProductDetailsCard({ product: p }: { product: Product }) {
  const { m, fill, num, dec, date, price } = useI18n()
  const d = p.dimensions
  const size =
    d && d.lengthCm != null && d.widthCm != null && d.heightCm != null
      ? `${dec(d.lengthCm)} × ${dec(d.widthCm)} × ${dec(d.heightCm)} cm`
      : m.common.none
  const rows: [string, React.ReactNode][] = [
    [
      m.details.family,
      p.familyName
        ? `${p.familyName} · ${fill(m.details.variants, { n: p.variantCodes?.length ?? 0 })}`
        : m.common.none,
    ],
    [m.details.availableSince, date(p.availableSince)],
    [m.details.mainCategoryPosition, num(p.mainCategoryPosition)],
    [
      m.details.lvb,
      p.lvbPossible == null
        ? m.common.none
        : p.lvbPossible
          ? m.details.yes
          : m.details.no,
    ],
    [m.details.dimensions, size],
    [
      m.details.weight,
      d?.weightGrams != null ? `${num(d.weightGrams)} g` : m.common.none,
    ],
    [m.details.package, d?.packageType ?? m.common.none],
    [
      m.details.commission,
      <ul key="c" className="flex flex-col gap-0.5">
        {(p.commission ?? []).map((c, i) => (
          <li key={i}>
            {c.priceBelow == null
              ? fill(m.details.commissionRest, {
                  pct: dec(c.percentage),
                  fixed: price(c.fixed),
                })
              : fill(m.details.commissionRow, {
                  price: price(c.priceBelow),
                  pct: dec(c.percentage),
                  fixed: price(c.fixed),
                })}
          </li>
        ))}
      </ul>,
    ],
  ]
  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.details.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 @5xl/main:grid-cols-4">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
