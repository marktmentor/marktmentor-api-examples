import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/i18n"
import type { StoreProduct } from "@/lib/types"

/** GET store/products/ with its filters. */
/** One page of store products: sales, revenue, profit, margin, ROI, conversion and ACoS. */
const pct = (v: number | null, dec: (n: number) => string, none: string) =>
  v === null ? none : `${dec(v)}%`

export function StoreProductsTable({ products }: { products: StoreProduct[] }) {
  const { m, num, eur, dec } = useI18n()
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{m.products.product}</TableHead>
          <TableHead className="text-right">{m.product.sales}</TableHead>
          <TableHead className="text-right">{m.product.revenue}</TableHead>
          <TableHead className="hidden text-right sm:table-cell">
            {m.store.profit}
          </TableHead>
          <TableHead className="hidden text-right md:table-cell">
            {m.store.margin}
          </TableHead>
          <TableHead className="hidden text-right lg:table-cell">
            {m.store.roi}
          </TableHead>
          <TableHead className="hidden text-right lg:table-cell">
            {m.store.conversion}
          </TableHead>
          <TableHead className="hidden text-right md:table-cell">
            {m.store.acos}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((p) => (
          <TableRow key={p.ean}>
            <TableCell className="max-w-[12rem] sm:max-w-sm xl:max-w-lg">
              <div className="truncate font-medium">{p.title}</div>
              <div className="truncate text-xs text-muted-foreground">
                {m.common.ean} {p.ean}
                {!p.hasProductCosts && ` · ${m.store.noCosts}`}
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {num(p.sales)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {eur(p.revenue)}
            </TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">
              {eur(p.totalProfits)}
            </TableCell>
            <TableCell className="hidden text-right tabular-nums md:table-cell">
              {pct(p.totalMargin, dec, m.common.none)}
            </TableCell>
            <TableCell className="hidden text-right tabular-nums lg:table-cell">
              {pct(p.salesRoi, dec, m.common.none)}
            </TableCell>
            <TableCell className="hidden text-right tabular-nums lg:table-cell">
              {pct(p.conversion, dec, m.common.none)}
            </TableCell>
            <TableCell className="hidden text-right tabular-nums md:table-cell">
              {pct(p.acos, dec, m.common.none)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
