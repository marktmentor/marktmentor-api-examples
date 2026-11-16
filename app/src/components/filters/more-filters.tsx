import { Button } from "@/components/ui/button"
import { BrandPicker } from "@/components/filters/brand-picker"
import { CategoryPicker } from "@/components/filters/category-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useI18n } from "@/i18n"
import {
  type ProductFilters,
  RANGES,
  type RangeKey,
  allMarketsOnly,
} from "@/lib/filters"

/** The filters behind "More filters": brand, category and the ranges. */
export function MoreFilters({
  draft,
  set,
  market,
  onApply,
}: {
  draft: ProductFilters
  set: (p: Partial<ProductFilters>) => void
  market: string
  onApply: () => void
}) {
  const { m } = useI18n()
  const num = (v: string) => (v === "" ? undefined : Number(v))
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="f-brand">{m.filters.brand}</Label>
          <BrandPicker
            id="f-brand"
            value={draft.brand}
            onChange={(brand) => set({ brand })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="f-cat">{m.filters.category}</Label>
          <CategoryPicker
            id="f-cat"
            value={draft.categoryId}
            onChange={(categoryId) => set({ categoryId })}
          />
        </div>
      </div>
      <Separator />
      {(Object.keys(RANGES) as RangeKey[]).map((key) => {
        const [min, max] = RANGES[key]
        const off = market !== "ALL" && allMarketsOnly(key)
        return (
          <div
            key={key}
            className="grid grid-cols-[7rem_1fr_1fr] items-center gap-2"
          >
            <Label className={off ? "text-muted-foreground" : ""}>
              {m.filters.ranges[key]}
            </Label>
            <Input
              aria-label={`${m.filters.ranges[key]} ${m.filters.min}`}
              inputMode="decimal"
              placeholder={m.filters.min}
              disabled={off}
              value={draft[min] ?? ""}
              onChange={(e) => set({ [min]: num(e.target.value) })}
            />
            <Input
              aria-label={`${m.filters.ranges[key]} ${m.filters.max}`}
              inputMode="decimal"
              placeholder={m.filters.max}
              disabled={off}
              value={draft[max] ?? ""}
              onChange={(e) => set({ [max]: num(e.target.value) })}
            />
          </div>
        )
      })}
      {market !== "ALL" && (
        <p className="text-xs text-muted-foreground">
          {m.filters.allMarketsOnly}
        </p>
      )}
      <Button size="sm" onClick={onApply}>
        {m.filters.apply}
      </Button>
    </div>
  )
}
