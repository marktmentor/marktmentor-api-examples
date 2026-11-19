import { DownloadIcon, PackageOpenIcon, TriangleAlertIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Pager } from "@/components/research/pager"
import { OptionSelect } from "@/components/research/period-select"
import { TabCard } from "@/components/research/tab-card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { CategoryPicker } from "@/components/filters/category-picker"
import { Input } from "@/components/ui/input"
import { StoreProductsTable } from "@/components/store/store-products-table"
import { useI18n } from "@/i18n"
import { downloadCsv } from "@/lib/csv"
import {
  STORE_PAGE_SIZES,
  STORE_SORTS,
  type StoreSort,
} from "@/lib/store-params"
import { type StoreProductsQuery } from "@/api/store"
import type { ApiResult, StoreProducts } from "@/lib/types"

/** GET store/products/ with its filters. */
export function StoreProductsTab({
  result,
  query,
  onQuery,
}: {
  result: ApiResult<StoreProducts>
  query: StoreProductsQuery
  onQuery: (q: StoreProductsQuery) => void
}) {
  const { m, fill } = useI18n()
  const [eans, setEans] = useState(query.eans ?? "")
  useEffect(() => {
    setEans(query.eans ?? "")
  }, [query.eans])
  const sizeLabels = Object.fromEntries(
    STORE_PAGE_SIZES.map((n) => [n, fill(m.storeFilters.pageSize, { n })])
  ) as Record<(typeof STORE_PAGE_SIZES)[number], string>
  return (
    <TabCard
      title={m.store.productsTab}
      description={m.store.productsDescription}
      result={result}
      controls={
        <form
          className="flex w-full flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            onQuery({
              ...query,
              eans: eans || undefined,
              page: undefined,
            })
          }}
        >
          <OptionSelect<StoreSort>
            value={query.sort ?? "-revenue"}
            options={STORE_SORTS}
            labels={m.storeFilters.sorts}
            onChange={(sort) =>
              onQuery({
                ...query,
                sort: sort === "-revenue" ? undefined : sort,
                page: undefined,
              })
            }
            className="w-48"
          />
          <CategoryPicker
            value={query.categoryId}
            onChange={(categoryId) =>
              onQuery({ ...query, categoryId, page: undefined })
            }
            className="h-8 w-full sm:w-56"
          />
          <Input
            value={eans}
            onChange={(e) => setEans(e.target.value)}
            aria-label={m.storeFilters.eans}
            placeholder={m.storeFilters.eans}
            className="h-8 w-full sm:w-64"
          />
          <Button type="submit" size="sm" variant="outline">
            {m.storeFilters.apply}
          </Button>
          <div className="flex items-center gap-2 sm:ml-auto">
            <OptionSelect
              value={
                String(
                  query.pageSize ?? 25
                ) as (typeof STORE_PAGE_SIZES)[number]
              }
              options={STORE_PAGE_SIZES}
              labels={sizeLabels}
              onChange={(n) =>
                onQuery({
                  ...query,
                  pageSize: n === "25" ? undefined : Number(n),
                  page: undefined,
                })
              }
              className="w-36"
            />
            {result.ok && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label={m.common.csv}
                onClick={() =>
                  downloadCsv(
                    "store-products.csv",
                    [
                      "ean",
                      "title",
                      "sales",
                      "revenue",
                      "totalProfits",
                      "totalMargin",
                      "salesRoi",
                      "conversion",
                      "acos",
                      "hasProductCosts",
                    ],
                    result.data.data
                  )
                }
              >
                <DownloadIcon />
                <span className="hidden sm:inline">{m.common.csv}</span>
              </Button>
            )}
          </div>
          <p className="basis-full text-xs text-muted-foreground">
            {m.filters.storeCategoryHelp}
          </p>
        </form>
      }
    >
      {(d) => (
        <>
          {d.pagination.totalMayBeCapped && (
            <Alert>
              <TriangleAlertIcon />
              <AlertDescription>{m.store.capped}</AlertDescription>
            </Alert>
          )}
          {!d.costsVisible && (
            <Alert>
              <TriangleAlertIcon />
              <AlertDescription>{m.store.costsHidden}</AlertDescription>
            </Alert>
          )}
          {d.data.length === 0 ? (
            <Empty className="flex-none border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <PackageOpenIcon />
                </EmptyMedia>
                <EmptyTitle>{m.store.emptyProducts}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <StoreProductsTable products={d.data} />
          )}
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
