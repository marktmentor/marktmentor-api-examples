import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from "@/i18n"
import type { Quota } from "@/lib/types"

/** The research allowance from the X-Research-Requests-* headers. */
export function QuotaMeter({
  quota,
  reserve,
  demo,
  detailed,
  stacked,
}: {
  quota: Quota | null
  reserve: number
  demo: boolean
  detailed?: boolean
  /** Label above the value, for the narrow sidebar. */
  stacked?: boolean
}) {
  const { m, fill, num, date } = useI18n()
  const known =
    quota?.researchLimit !== undefined && quota.researchRemaining !== undefined
  const left = quota?.researchRemaining ?? 0
  const limit = quota?.researchLimit ?? 0
  return (
    <div className="flex flex-col gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={
              stacked
                ? "flex flex-col gap-0.5 text-sm"
                : "flex flex-wrap items-baseline justify-between gap-x-2 text-sm"
            }
          >
            <span className="text-xs text-muted-foreground">
              {m.quota.label}
            </span>
            <span className="font-medium tabular-nums">
              {known
                ? fill(m.quota.of, { left: num(left), limit: num(limit) })
                : quota?.plan === "unmetered"
                  ? m.quota.unmetered
                  : m.quota.unknown}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>{m.quota.tooltip}</TooltipContent>
      </Tooltip>
      {quota?.plan !== "unmetered" && (
        <Progress value={known && limit ? (left / limit) * 100 : 0} />
      )}
      {detailed && (
        <p className="text-xs text-muted-foreground">
          {fill(m.quota.stopsAt, { reserve: num(reserve) })}{" "}
          {!demo &&
            quota?.researchReset &&
            fill(m.quota.resets, { date: date(quota.researchReset) })}{" "}
        </p>
      )}
    </div>
  )
}
