import { OptionSelect } from "@/components/research/period-select"
import { useI18n } from "@/i18n"
import {
  type HistoryPeriod,
  type Interval,
  intervalFor,
  intervalsFor,
  PERIODS,
} from "@/lib/research-params"

/** Period and interval for the history endpoints (3M default, as in the API).
 * With two years the API accepts only month, so week is not offered then. */
export function HistoryControls({
  period,
  interval,
  onChange,
}: {
  period: HistoryPeriod
  interval: Interval
  onChange: (next: { period: HistoryPeriod; interval: Interval }) => void
}) {
  const { m } = useI18n()
  return (
    <>
      <OptionSelect
        value={period}
        options={PERIODS}
        labels={m.product.periods}
        onChange={(p) =>
          onChange({ period: p, interval: intervalFor(p, interval) })
        }
      />
      <OptionSelect
        value={intervalFor(period, interval)}
        options={intervalsFor(period)}
        labels={m.product.intervals}
        onChange={(i) => onChange({ period, interval: i })}
      />
    </>
  )
}
