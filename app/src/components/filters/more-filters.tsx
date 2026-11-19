import { useEffect, useState } from "react"
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

type RangeParam = (typeof RANGES)[RangeKey][number]
const PARAMS: RangeParam[] = Object.values(RANGES).flat()

/** "4,5" and "4.5" -> 4.5; empty, negative or not a number -> not set. */
function parse(raw: string | undefined) {
  const text = (raw ?? "").trim().replace(",", ".")
  const n = Number(text)
  return text === "" || !Number.isFinite(n) || n < 0 ? undefined : n
}

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
  // The fields keep what the user types ("4." or "4,5"); the draft gets the
  // parsed number, or nothing when the text is not a valid number.
  const [raw, setRaw] = useState<Partial<Record<RangeParam, string>>>(() =>
    Object.fromEntries(PARAMS.map((p) => [p, draft[p]?.toString() ?? ""]))
  )
  useEffect(() => {
    // Follow outside changes (for example a cleared filter).
    setRaw((r) => {
      const stale = PARAMS.filter((p) => parse(r[p]) !== draft[p])
      if (stale.length === 0) return r
      const next = { ...r }
      for (const p of stale) next[p] = draft[p]?.toString() ?? ""
      return next
    })
  }, [draft])
  const change = (param: RangeParam, text: string) => {
    setRaw((r) => ({ ...r, [param]: text }))
    set({ [param]: parse(text) })
  }
  const invalid = (param: RangeParam) =>
    !!raw[param]?.trim() && parse(raw[param]) === undefined
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
              value={raw[min] ?? ""}
              aria-invalid={invalid(min)}
              onChange={(e) => change(min, e.target.value)}
            />
            <Input
              aria-label={`${m.filters.ranges[key]} ${m.filters.max}`}
              inputMode="decimal"
              placeholder={m.filters.max}
              disabled={off}
              value={raw[max] ?? ""}
              aria-invalid={invalid(max)}
              onChange={(e) => change(max, e.target.value)}
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
