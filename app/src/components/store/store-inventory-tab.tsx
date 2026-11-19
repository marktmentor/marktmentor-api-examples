import { useEffect, useState } from "react"
import { Pager } from "@/components/research/pager"
import { OptionSelect } from "@/components/research/period-select"
import { TabCard } from "@/components/research/tab-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/i18n"
import { STOCK_STATES, type StockState } from "@/lib/store-params"
import type { ApiResult, StoreInventory } from "@/lib/types"

const VARIANT = {
  ok: "secondary",
  low: "outline",
  out_of_stock: "destructive",
  unknown: "outline",
} as const
const SIZES = ["25", "50", "100"] as const
type Query = {
  ean?: string
  stockState?: StockState
  page?: number
  pageSize?: number
}

/** GET store/inventory/ with its filters. */
export function StoreInventoryTab({
  result,
  query,
  onQuery,
}: {
  result: ApiResult<StoreInventory>
  query: Query
  onQuery: (q: Query) => void
}) {
  const { m, fill, num } = useI18n()
  const [ean, setEan] = useState(query.ean ?? "")
  useEffect(() => setEan(query.ean ?? ""), [query.ean])
  const states = ["all", ...STOCK_STATES] as const
  return (
    <TabCard
      title={m.store.stockTab}
      description={m.store.stockDescription}
      result={result}
      isEmpty={(d) => d.data.length === 0}
      emptyText={m.store.emptyStock}
      controls={
        <form
          className="flex w-full flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            onQuery({ ...query, ean: ean || undefined, page: undefined })
          }}
        >
          <OptionSelect
            value={query.stockState ?? "all"}
            options={states}
            labels={{ all: m.storeFilters.allStates, ...m.store.stockStates }}
            onChange={(s) =>
              onQuery({
                ...query,
                stockState: s === "all" ? undefined : s,
                page: undefined,
              })
            }
            className="w-44"
          />
          <Input
            value={ean}
            onChange={(e) => setEan(e.target.value)}
            aria-label={m.storeFilters.ean}
            placeholder={m.storeFilters.ean}
            inputMode="numeric"
            className="h-8 w-full sm:w-44"
          />
          <Button type="submit" size="sm" variant="outline">
            {m.storeFilters.apply}
          </Button>
          <OptionSelect
            value={String(query.pageSize ?? 25) as (typeof SIZES)[number]}
            options={SIZES}
            labels={
              Object.fromEntries(
                SIZES.map((n) => [n, fill(m.storeFilters.pageSize, { n })])
              ) as Record<(typeof SIZES)[number], string>
            }
            onChange={(n) =>
              onQuery({
                ...query,
                pageSize: n === "25" ? undefined : Number(n),
                page: undefined,
              })
            }
            className="w-36 sm:ml-auto"
          />
        </form>
      }
    >
      {(d) => (
        <>
          <p className="text-sm text-muted-foreground">
            {fill(m.storeFilters.counts, {
              ok: num(d.counts.ok),
              low: num(d.counts.low),
              out: num(d.counts.outOfStock),
              unknown: num(d.counts.unknown),
            })}
            {` · ${(m.storeFilters.countsScope as Record<string, string | undefined>)[d.countsScope] ?? d.countsScope}`}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.products.product}</TableHead>
                <TableHead>{m.store.status}</TableHead>
                <TableHead className="text-right">{m.store.stock}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.data.map((row) => {
                // A state that a newer API version adds shows as unknown.
                const state =
                  row.stockState in VARIANT ? row.stockState : "unknown"
                return (
                  <TableRow key={row.ean}>
                    <TableCell className="max-w-[12rem] sm:max-w-md">
                      <div className="truncate font-medium">{row.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.common.ean} {row.ean}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={VARIANT[state]}>
                        {m.store.stockStates[state]}
                      </Badge>
                      {row.unknownReason && (
                        <span className="ml-2 hidden font-mono text-xs text-muted-foreground sm:inline">
                          {row.unknownReason}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {num(row.stock)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <Pager
            free
            pagination={d.pagination}
            onPage={(page) => onQuery({ ...query, page })}
          />
        </>
      )}
    </TabCard>
  )
}
