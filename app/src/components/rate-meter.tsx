import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useNow } from "@/hooks/use-now"
import { useI18n } from "@/i18n"
import type { Bucket, Rates } from "@/lib/types"

const BUCKETS: Bucket[] = ["research", "store", "account", "reference"]

/** The per-minute limits from the RateLimit-* headers, one row per group. */
export function RateMeter({
  rates,
  showTitle = true,
}: {
  rates: Rates
  showTitle?: boolean
}) {
  const { m, fill, num } = useI18n()
  const shown = BUCKETS.filter((b) => rates[b])
  const now = useNow(shown.length > 0)
  return (
    <div className="flex flex-col gap-2">
      {showTitle && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground">
              {m.rate.title}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{m.rate.tooltip}</TooltipContent>
        </Tooltip>
      )}
      {shown.length === 0 && <span className="text-sm">{m.rate.none}</span>}
      {shown.map((bucket) => {
        const w = rates[bucket]!
        const seconds =
          now === null ? 0 : Math.ceil((Date.parse(w.resetAt) - now) / 1000)
        // After the reset moment the window has room again; the next response tells the exact number.
        const remaining = now === null || seconds > 0 ? w.remaining : w.limit
        return (
          <div key={bucket} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span>{m.rate[bucket]}</span>
              <span className="font-medium tabular-nums">
                {fill(m.rate.left, {
                  left: num(remaining),
                  limit: num(w.limit),
                })}
              </span>
            </div>
            <Progress
              value={w.limit ? (remaining / w.limit) * 100 : 0}
              className="h-1"
            />
            {seconds > 0 && remaining < w.limit && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {fill(m.rate.roomIn, { n: seconds })}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
