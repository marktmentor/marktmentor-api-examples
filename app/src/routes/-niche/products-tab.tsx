import { DownloadIcon } from "lucide-react"
import { ProductFilterBar } from "@/components/filters/product-filter-bar"
import { ResultMeta } from "@/components/filters/result-meta"
import { Pager } from "@/components/research/pager"
import { ProductTable } from "@/components/research/product-table"
import { TabCard } from "@/components/research/tab-card"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n"
import { PRODUCT_CSV_COLUMNS, downloadCsv, flattenProduct } from "@/lib/csv"
import type { ProductFilters } from "@/lib/filters"
import type { ApiResult, Product, ProductList } from "@/lib/types"

/** Tab Products of a niche: the product filter bar and the list. */
export function NicheProductsTab({
  nicheId,
  result,
  filters,
  tracked,
  onToggle,
  onFilters,
  go,
}: {
  nicheId: string
  result: ApiResult<ProductList>
  filters: ProductFilters
  tracked: Set<string>
  onToggle: (p: Product) => void
  onFilters: (f: ProductFilters) => void
  go: (patch: Partial<ProductFilters>) => void
}) {
  const { m } = useI18n()
  return (
    <div className="flex flex-col gap-4">
      <ProductFilterBar value={filters} onApply={onFilters} />
      <TabCard
        title={m.niches.productsTitle}
        description={m.niches.productsDescription}
        result={result}
        isEmpty={(d) => d.data.length === 0}
        emptyText={m.products.empty}
        controls={
          result.ok && (
            <>
              <ResultMeta
                total={result.data.pagination.total}
                size={filters.size ?? 25}
                onSize={(s) =>
                  go({ size: s === 25 ? undefined : s, page: undefined })
                }
              />
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() =>
                  downloadCsv(
                    `niche-${nicheId}.csv`,
                    PRODUCT_CSV_COLUMNS,
                    result.data.data.map(flattenProduct)
                  )
                }
              >
                <DownloadIcon />
                <span className="hidden sm:inline">{m.common.csv}</span>
              </Button>
            </>
          )
        }
      >
        {(d) => (
          <>
            <ProductTable
              products={d.data}
              market={filters.market ?? "ALL"}
              tracked={tracked}
              onToggle={onToggle}
            />
            <Pager pagination={d.pagination} onPage={(page) => go({ page })} />
          </>
        )}
      </TabCard>
    </div>
  )
}
