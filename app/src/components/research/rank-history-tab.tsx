import { useState } from "react"
import { HistoryControls } from "@/components/research/history-controls"
import { RankChart } from "@/components/research/rank-chart"
import { RankTable } from "@/components/research/rank-table"
import { TabCard } from "@/components/research/tab-card"
import { type RankRow, sortRows } from "@/lib/rank-history"
import type { HistoryPeriod, Interval } from "@/lib/research-params"
import type { ApiResult } from "@/lib/types"

/**
 * A position history (categories or keywords): a table with one row per
 * item (current position, best, change, trend), and the large chart of the
 * selected row below it.
 */
export function RankHistoryTab<T extends { data: unknown[] }>({
  title,
  description,
  emptyText,
  itemLabel,
  result,
  rows: toRows,
  period,
  interval,
  onChange,
}: {
  title: string
  description: string
  emptyText: string
  itemLabel: string
  result: ApiResult<T>
  rows: (data: T) => RankRow[]
  period: HistoryPeriod
  interval: Interval
  onChange: (next: { period: HistoryPeriod; interval: Interval }) => void
}) {
  const [picked, setPicked] = useState<string | null>(null)
  return (
    <TabCard
      title={title}
      description={description}
      result={result}
      isEmpty={(d) => d.data.length === 0}
      emptyText={emptyText}
      controls={
        <HistoryControls
          period={period}
          interval={interval}
          onChange={onChange}
        />
      }
    >
      {(d) => {
        const rows = sortRows(toRows(d))
        // The picked row, or else the best-ranked one.
        const selected =
          rows.find((r) => r.row.id === picked && r.summary.ranked) ??
          rows.find((r) => r.summary.ranked)
        return (
          <div className="flex min-w-0 flex-col gap-6">
            <RankTable
              rows={rows}
              itemLabel={itemLabel}
              selected={selected?.row.id ?? null}
              onSelect={setPicked}
            />
            {selected && <RankChart row={selected.row} />}
          </div>
        )
      }}
    </TabCard>
  )
}
