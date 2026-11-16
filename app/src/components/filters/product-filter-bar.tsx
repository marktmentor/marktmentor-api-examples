import { CoinsIcon, SearchIcon, SlidersHorizontalIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { FilterChips } from "@/components/filters/filter-chips"
import { MarketToggle } from "@/components/filters/market-toggle"
import { OptionSelect } from "@/components/research/period-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { MoreFilters } from "@/components/filters/more-filters"
import { useI18n } from "@/i18n"
import {
  LIST_PERIODS,
  PRODUCT_SORTS,
  type ProductFilters,
  activeMore,
  allMarketsOnly,
} from "@/lib/filters"

type Props = {
  value: ProductFilters
  onApply: (next: ProductFilters) => void
  /** Niche products: the search words are optional extras, not the main field. */
  showSearch?: boolean
}

/** All parameters of research/products/ (and of niche products) in one bar. */
export function ProductFilterBar({ value, onApply, showSearch = true }: Props) {
  const { m, fill } = useI18n()
  const [draft, setDraft] = useState<ProductFilters>(value)
  useEffect(() => setDraft(value), [value])
  const market = draft.market ?? "ALL"
  const set = (patch: Partial<ProductFilters>) =>
    setDraft((d) => ({ ...d, ...patch }))
  // Changing market, period or sort runs the search right away.
  const now = (patch: Partial<ProductFilters>) =>
    onApply({ ...draft, ...patch, page: undefined })
  const sorts = PRODUCT_SORTS.filter(
    (s) => market === "ALL" || !allMarketsOnly(s)
  )
  const more = activeMore(value)
  const chips = [
    ...(value.q
      ? [{ key: "q", label: fill(m.filters.chip.q, { v: value.q }) }]
      : []),
    ...(value.ean
      ? [{ key: "ean", label: fill(m.filters.chip.ean, { v: value.ean }) }]
      : []),
    ...more.map((k) => ({
      key: k,
      label: fill(m.filters.chip[k], { v: String(value[k]) }),
    })),
  ]
  const remove = (key: string) =>
    onApply({ ...value, [key]: undefined, page: undefined })

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            onApply({ ...draft, page: undefined })
          }}
        >
          {showSearch && (
            <>
              <Input
                aria-label={m.products.query}
                value={draft.q ?? ""}
                onChange={(e) =>
                  set({ q: e.target.value || undefined, ean: undefined })
                }
                placeholder={m.filters.searchPlaceholder}
                className="w-full sm:w-72"
              />
              <Input
                aria-label={m.common.ean}
                inputMode="numeric"
                value={draft.ean ?? ""}
                onChange={(e) =>
                  set({ ean: e.target.value || undefined, q: undefined })
                }
                placeholder={m.filters.eanPlaceholder}
                className="w-full sm:w-40"
              />
            </>
          )}
          <MarketToggle
            value={market}
            onChange={(mk) =>
              now({
                market: mk === "ALL" ? undefined : mk,
                sort:
                  mk !== "ALL" && draft.sort && allMarketsOnly(draft.sort)
                    ? undefined
                    : draft.sort,
              })
            }
          />
          <OptionSelect
            value={draft.period ?? "30d"}
            options={LIST_PERIODS}
            labels={m.filters.periods}
            onChange={(p) => now({ period: p === "30d" ? undefined : p })}
            className="w-32"
          />
          <OptionSelect
            value={draft.sort ?? "-sales"}
            options={sorts}
            labels={m.filters.productSorts}
            onChange={(s) => now({ sort: s === "-sales" ? undefined : s })}
            className="w-52"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <SlidersHorizontalIcon />
                {m.filters.more}
                {more.length > 0 && (
                  <Badge className="ml-1 h-4 min-w-4 px-1">{more.length}</Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(92vw,26rem)]">
              <MoreFilters
                draft={draft}
                set={set}
                market={market}
                onApply={() => onApply({ ...draft, page: undefined })}
              />
            </PopoverContent>
          </Popover>
          <Button type="submit" size="sm" className="sm:ml-auto">
            <SearchIcon />
            {m.common.search}
          </Button>
        </form>
        <FilterChips
          chips={chips}
          onRemove={remove}
          onClear={() =>
            onApply({ market: value.market, period: value.period })
          }
        />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CoinsIcon className="size-3.5" />
          {m.filters.cost}
        </p>
      </CardContent>
    </Card>
  )
}
