import { Link } from "@tanstack/react-router"
import { TabCard } from "@/components/research/tab-card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/i18n"
import { bothMarkets } from "@/lib/csv"
import type { ApiResult, ProductList } from "@/lib/types"

/** GET research/products/?variantsOf={code}: the product family. */
export function VariantsTab({
  result,
  current,
}: {
  result: ApiResult<ProductList>
  current: string
}) {
  const { m, num, price } = useI18n()
  return (
    <TabCard
      title={m.variants.title}
      description={m.variants.description}
      result={result}
      isEmpty={(d) => d.data.length === 0}
      emptyText={m.variants.empty}
    >
      {(d) => (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.products.product}</TableHead>
              <TableHead className="text-right">{m.products.price}</TableHead>
              <TableHead className="text-right">
                {m.products.sales}{" "}
                <span className="hidden font-normal text-muted-foreground sm:inline">
                  ({m.common.both})
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {d.data.map((p) => (
              <TableRow key={p.productCode}>
                <TableCell className="max-w-[12rem] sm:max-w-md xl:max-w-xl">
                  <div className="flex items-center gap-2">
                    <Link
                      to="/products/$productCode"
                      params={{ productCode: p.productCode }}
                      className="truncate font-medium hover:underline"
                      title={p.title}
                    >
                      {p.title}
                    </Link>
                    {p.productCode === current && (
                      <Badge variant="secondary">{m.variants.current}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {price(p.markets.NL?.price)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {num(bothMarkets(p, "sales"))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </TabCard>
  )
}
