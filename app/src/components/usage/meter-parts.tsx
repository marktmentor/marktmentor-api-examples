import { OctagonAlertIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useCountUp } from "@/hooks/use-count-up"
import { useNow } from "@/hooks/use-now"
import { useUsage } from "@/hooks/use-usage"
import { useI18n } from "@/i18n"
import type { Quota, Rates } from "@/lib/types"
import { cn } from "@/lib/utils"

// The parts of the usage meter: the last action, the counters and a stop.
const PULSE =
  "animate-in fade-in zoom-in-50 duration-300 motion-reduce:animate-none"

export type UsageProps = {
  quota: Quota | null
  rates: Rates
  reserve: number
  demo: boolean
}

/** A stop that the user must see: the reserve, or a per-minute limit with countdown. */
export function useStop({ quota, rates, reserve }: UsageProps) {
  const limited = Object.values(rates).filter((w) => w.remaining === 0)
  const now = useNow(limited.length > 0)
  const seconds = Math.max(
    0,
    ...limited.map((w) =>
      now === null ? 0 : Math.ceil((Date.parse(w.resetAt) - now) / 1000)
    )
  )
  const atReserve =
    quota?.researchRemaining !== undefined && quota.researchRemaining <= reserve
  return { atReserve, seconds }
}

export function LastAction({ compact }: { compact?: boolean }) {
  const { m, fill, num } = useI18n()
  const { last } = useUsage()
  if (!last)
    return (
      <span className="text-xs text-muted-foreground">{m.ticker.none}</span>
    )
  const parts = [
    last.cache && fill(m.ticker.cache, { n: num(last.cache) }),
    last.free && fill(m.ticker.free, { n: num(last.free) }),
    last.failed && fill(m.ticker.failed, { n: num(last.failed) }),
    last.reused && m.ticker.reused,
  ].filter(Boolean)
  return (
    <span key={last.seq} className="flex min-w-0 items-center gap-1.5 text-xs">
      <Badge
        variant={last.cost ? "default" : "secondary"}
        className={cn("tabular-nums", PULSE)}
        title={m.ticker.costTip}
      >
        +{num(last.cost)}
      </Badge>
      {!compact && (
        <span className={cn("truncate text-muted-foreground", PULSE)}>
          {parts.join(" · ")}
        </span>
      )}
    </span>
  )
}

export function StopLine(props: UsageProps) {
  const { m, fill, num } = useI18n()
  const { atReserve, seconds } = useStop(props)
  if (!atReserve && !seconds) return null
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
      <OctagonAlertIcon className="size-3.5 shrink-0" />
      <span className="truncate">
        {atReserve
          ? fill(m.ticker.reserve, { reserve: num(props.reserve) })
          : `${m.ticker.rateLimited} · ${fill(m.rate.roomIn, { n: seconds })}`}
      </span>
    </span>
  )
}

export function Counts() {
  const { m, fill, num } = useI18n()
  const { data, session } = useUsage()
  const s = useCountUp(session)
  const t = useCountUp(data?.today.cost ?? 0)
  return (
    <span
      className="text-xs text-muted-foreground tabular-nums"
      title={m.ticker.countsTip}
    >
      {fill(m.ticker.session, { n: num(s) })} ·{" "}
      {fill(m.ticker.today, { n: num(t) })}
    </span>
  )
}
