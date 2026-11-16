import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useI18n } from "@/i18n"
import { MARKET_COLORS } from "@/lib/colors"
import { type RankRow, rankTicks, summarize } from "@/lib/rank-history"

/**
 * The large chart of one ranking row. A step line, because a position jumps
 * from one week to the next. The axis starts at 1 (the top) and has whole
 * numbers only. A week without a value stays a gap.
 */
export function RankChart({ row }: { row: RankRow }) {
  const { m, date, month, num } = useI18n()
  const { worst } = summarize(row)
  const config = {
    NL: { label: m.common.nl, color: MARKET_COLORS.NL },
    BE: { label: m.common.be, color: MARKET_COLORS.BE },
  } satisfies ChartConfig
  const ticks = rankTicks(worst ?? 2)
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-sm font-medium">{row.label}</span>
      <ChartContainer
        config={config}
        className="aspect-auto h-[260px] w-full min-w-0"
      >
        <LineChart
          accessibilityLayer
          margin={{ top: 12, left: 0, right: 8 }}
          data={row.points.map((p) => ({
            date: p.date,
            NL: p.positions.NL ?? null,
            BE: p.positions.BE ?? null,
          }))}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            tickMargin={8}
            axisLine={false}
            tickFormatter={(v: string) => month(v)}
          />
          {/* Position 1 is the top: lower values are higher in the chart. */}
          <YAxis
            reversed
            domain={[1, ticks.at(-1) ?? 2]}
            ticks={ticks}
            allowDecimals={false}
            interval={0}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v: number) => num(v)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent labelFormatter={(v) => date(String(v))} />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {(["BE", "NL"] as const).map((mk) => (
            <Line
              key={mk}
              isAnimationActive={false}
              type="stepAfter"
              dataKey={mk}
              stroke={`var(--color-${mk})`}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  )
}
