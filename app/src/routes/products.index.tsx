import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { DownloadIcon, SearchXIcon } from "lucide-react"
import { ApiError } from "@/components/api-error"
import {
  DefaultHeading,
  SkippedDefault,
} from "@/components/filters/default-list"
import { ProductFilterBar } from "@/components/filters/product-filter-bar"
import { ResultMeta } from "@/components/filters/result-meta"
import { PageHeader } from "@/components/page-header"
import { Pager } from "@/components/research/pager"
import { ProductTable } from "@/components/research/product-table"
import { SourceBadge } from "@/components/source-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useI18n } from "@/i18n"
import { PRODUCT_CSV_COLUMNS, downloadCsv, flattenProduct } from "@/lib/csv"
import {
  type ProductFilters,
  isDefaultView,
  parseProductFilters,
} from "@/lib/filters"
import { useFollow } from "@/hooks/use-follow"
import { defaultProducts, searchProducts } from "@/api/products"
import { getTrackedCodes } from "@/api/tracked"
import type { Product } from "@/lib/types"

export const Route = createFileRoute("/products/")({
  validateSearch: (s: Record<string, unknown>): ProductFilters =>
    parseProductFilters(s),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const tracked = new Set(await getTrackedCodes())
    // Without any search or filter: the default list (one request a day).
    if (isDefaultView(deps)) {
      const list = await defaultProducts()
      return list.kind === "result"
        ? { result: list.result, skipped: null, isDefault: true, tracked }
        : { result: null, skipped: list.reason, isDefault: true, tracked }
    }
    return {
      result: await searchProducts({ data: deps }),
      skipped: null,
      isDefault: false,
      tracked,
    }
  },
  // No page skeleton: on a tab, filter or market change the page stays and
  // only the changed part shows that it loads. Visited URLs come from the
  // router cache for a minute.
  staleTime: 60_000,
  component: Products,
})

function Products() {
  const { result, tracked, skipped, isDefault } = Route.useLoaderData()
  const filters = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { m } = useI18n()
  const apply = (next: ProductFilters) => navigate({ search: next })

  const follow = useFollow()
  const toggle = (p: Product) => follow(p, tracked.has(p.productCode))

  return (
    <>
      <PageHeader
        title={m.products.title}
        description={m.products.description}
      />
      <ProductFilterBar value={filters} onApply={apply} />
      {result && !result.ok && <ApiError error={result} />}
      {skipped && <SkippedDefault reason={skipped} />}
      {result?.ok && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col gap-3">
              {isDefault && (
                <DefaultHeading
                  title={m.defaults.products}
                  hint={m.defaults.productsHint}
                />
              )}
              <ResultMeta
                total={result.data.pagination.total}
                size={filters.size ?? 25}
                onSize={(n) =>
                  apply({
                    ...filters,
                    size: n === 25 ? undefined : n,
                    page: undefined,
                  })
                }
              />
            </CardTitle>
            <CardAction className="flex items-center gap-2">
              <SourceBadge result={result} />
              <Button
                variant="outline"
                size="sm"
                disabled={!result.data.data.length}
                onClick={() =>
                  downloadCsv(
                    "products.csv",
                    PRODUCT_CSV_COLUMNS,
                    result.data.data.map(flattenProduct)
                  )
                }
              >
                <DownloadIcon />
                <span className="hidden sm:inline">{m.common.csv}</span>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {result.data.data.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchXIcon />
                  </EmptyMedia>
                  <EmptyTitle>{m.products.empty}</EmptyTitle>
                  <EmptyDescription>{m.products.emptyHint}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ProductTable
                products={result.data.data}
                market={filters.market}
                tracked={tracked}
                onToggle={toggle}
              />
            )}
          </CardContent>
          {(result.data.pagination.page > 1 ||
            result.data.pagination.hasNext) && (
            <CardFooter className="border-t">
              <Pager
                pagination={result.data.pagination}
                onPage={(page) => apply({ ...filters, page })}
              />
            </CardFooter>
          )}
        </Card>
      )}
    </>
  )
}
