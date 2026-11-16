import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/i18n"
import { type ChangeKind, changeOf } from "@/lib/change"

/** The change against a previous value, with the rule from lib/change.ts. */
export function ChangeBadge({
  current,
  previous,
  kind,
  higherIsBetter = true,
}: {
  current: number | null | undefined
  previous: number | null | undefined
  kind: ChangeKind
  higherIsBetter?: boolean
}) {
  const { m, fill, num, eur, pct } = useI18n()
  const change = changeOf(current, previous, kind)
  if (!change) return null
  const fmt = kind === "money" ? eur : num
  const sign = (v: number) => (v > 0 ? "+" : "")
  const good = change.diff === 0 || change.diff > 0 === higherIsBetter
  return (
    <Badge variant={good ? "outline" : "destructive"} className="tabular-nums">
      {change.diff >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
      {change.type === "pct"
        ? pct(change.value)
        : `${sign(change.diff)}${fmt(change.diff)} · ${fill(m.common.was, { v: fmt(change.previous) })}`}
    </Badge>
  )
}
