import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useI18n } from "@/i18n"
import { MARKETS, type Market } from "@/lib/filters"

/** NL + BE, NL or BE: the `market` parameter. */
export function MarketToggle({
  value,
  onChange,
}: {
  value: Market
  onChange: (m: Market) => void
}) {
  const { m } = useI18n()
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(v) => v && onChange(v as Market)}
      aria-label={m.filters.market}
    >
      {MARKETS.map((mk) => (
        <ToggleGroupItem key={mk} value={mk} className="px-3">
          {m.filters.markets[mk]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
