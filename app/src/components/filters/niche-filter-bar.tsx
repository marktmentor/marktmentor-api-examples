import { CoinsIcon, SearchIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { FilterChips } from "@/components/filters/filter-chips"
import { MarketToggle } from "@/components/filters/market-toggle"
import { OptionSelect } from "@/components/research/period-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CategoryPicker } from "@/components/filters/category-picker"
import { Input } from "@/components/ui/input"
import { useDemo } from "@/hooks/use-demo"
import { useI18n } from "@/i18n"
import {
  LIST_PERIODS,
  NICHE_SORTS,
  type NicheFilters,
  allMarketsOnly,
} from "@/lib/filters"

/** All parameters of research/niches/ in one bar. */
export function NicheFilterBar({
  value,
  onApply,
}: {
  value: NicheFilters
  onApply: (next: NicheFilters) => void
}) {
  const { m, fill } = useI18n()
  // The test key has one example niche: sorting cannot change the list.
  const demo = useDemo()
  const [draft, setDraft] = useState<NicheFilters>(value)
  useEffect(() => setDraft(value), [value])
  const market = draft.market ?? "ALL"
  const now = (patch: Partial<NicheFilters>) =>
    onApply({ ...draft, ...patch, page: undefined })
  const sorts = NICHE_SORTS.filter(
    (s) => market === "ALL" || !allMarketsOnly(s)
  )
  const chips = [
    ...(value.q
      ? [{ key: "q", label: fill(m.filters.chip.q, { v: value.q }) }]
      : []),
    ...(value.categoryId
      ? [
          {
            key: "categoryId",
            label: fill(m.filters.chip.categoryId, { v: value.categoryId }),
          },
        ]
      : []),
  ]
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
          <Input
            aria-label={m.products.query}
            value={draft.q ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, q: e.target.value || undefined }))
            }
            placeholder={m.filters.searchPlaceholder}
            className="w-full sm:w-72"
          />
          <CategoryPicker
            value={draft.categoryId}
            onChange={(categoryId) =>
              onApply({ ...draft, categoryId, page: undefined })
            }
            className="w-full sm:w-56"
          />
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
            value={draft.sort ?? "-volume"}
            options={sorts}
            labels={m.filters.nicheSorts}
            onChange={(s) => now({ sort: s === "-volume" ? undefined : s })}
            className="w-56"
            disabled={demo}
          />
          <Button type="submit" size="sm" className="sm:ml-auto">
            <SearchIcon />
            {m.common.search}
          </Button>
        </form>
        <FilterChips
          chips={chips}
          onRemove={(key) =>
            onApply({ ...value, [key]: undefined, page: undefined })
          }
          onClear={() =>
            onApply({ market: value.market, period: value.period })
          }
        />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CoinsIcon className="size-3.5" />
          {m.filters.cost} {m.filters.categoryHelp}
        </p>
        {demo && (
          <p className="text-xs text-muted-foreground">{m.demo.oneNiche}</p>
        )}
      </CardContent>
    </Card>
  )
}
