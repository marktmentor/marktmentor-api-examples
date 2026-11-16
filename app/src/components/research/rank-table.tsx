import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { RankSparkline } from "@/components/research/rank-sparkline"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/i18n"
import { MARKET_COLORS } from "@/lib/colors"
import type { RankRow, RankSummary } from "@/lib/rank-history"
import { cn } from "@/lib/utils"

function Change({ value }: { value: number | null }) {
  const { m, num } = useI18n()
  if (value == null)
    return <span className="text-muted-foreground">{m.common.none}</span>
  if (value === 0) return <span className="text-muted-foreground">0</span>
  const up = value > 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5",
        // As the change badges elsewhere: only a loss gets a colour.
        up ? "text-foreground" : "text-destructive"
      )}
      title={up ? m.rankTable.upTip : m.rankTable.downTip}
    >
      {up ? (
        <ArrowUpIcon className="size-3" />
      ) : (
        <ArrowDownIcon className="size-3" />
      )}
      {num(Math.abs(value))}
    </span>
  )
}

/**
 * One row per item (a category now; a keyword works the same): the current
 * position per market, the best one, the change and a trend line. Select a
 * row to show its large chart.
 */
export function RankTable({
  rows,
  itemLabel,
  selected,
  onSelect,
}: {
  rows: { row: RankRow; summary: RankSummary }[]
  /** The header of the first column, for example "Category". */
  itemLabel: string
  selected: string | null
  onSelect: (id: string) => void
}) {
  const { m, num } = useI18n()
  const pos = (v: number | null) => (v == null ? m.common.none : num(v))
  return (
    <div className="flex flex-col gap-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{itemLabel}</TableHead>
            <TableHead className="text-right">{m.rankTable.nowNL}</TableHead>
            <TableHead className="hidden text-right sm:table-cell">
              {m.rankTable.nowBE}
            </TableHead>
            <TableHead className="hidden text-right sm:table-cell">
              {m.rankTable.best}
            </TableHead>
            <TableHead className="text-right">{m.rankTable.change}</TableHead>
            <TableHead className="hidden md:table-cell">
              {m.rankTable.trend}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ row, summary: s }) => (
            <TableRow
              key={row.id}
              data-state={row.id === selected ? "selected" : undefined}
              className={cn(s.ranked && "cursor-pointer")}
              onClick={s.ranked ? () => onSelect(row.id) : undefined}
            >
              <TableCell className="min-w-32 font-medium whitespace-normal">
                {s.ranked ? (
                  <button
                    type="button"
                    className="text-left hover:underline"
                    aria-pressed={row.id === selected}
                  >
                    {row.label}
                  </button>
                ) : (
                  row.label
                )}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {pos(s.now.NL)}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">
                {pos(s.now.BE)}
              </TableCell>
              <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                {pos(s.best.NL ?? s.best.BE)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <Change value={s.change.NL ?? s.change.BE} />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {s.ranked ? (
                  <RankSparkline points={row.points} worst={s.worst ?? 2} />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {m.rankTable.notRanked}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(["NL", "BE"] as const).map((mk) => (
          <span key={mk} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-3.5"
              style={{ background: MARKET_COLORS[mk] }}
            />
            {mk === "NL" ? m.common.nl : m.common.be}
          </span>
        ))}
        <span>{m.rankTable.legend}</span>
      </div>
    </div>
  )
}
