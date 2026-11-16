import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"
import { HistoryControls } from "@/components/research/history-controls"
import { TabCard } from "@/components/research/tab-card"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useI18n } from "@/i18n"
import type { HistoryPeriod, Interval } from "@/lib/research-params"
import type { ApiResult, ReviewHistory } from "@/lib/types"

/** GET research/niches/{id}/review-history/: new reviews and their average rating. */
export function ReviewHistoryTab({
  result,
  period,
  interval,
  onChange,
}: {
  result: ApiResult<ReviewHistory>
  period: HistoryPeriod
  interval: Interval
  onChange: (next: { period: HistoryPeriod; interval: Interval }) => void
}) {
  const { m, date, month, dec } = useI18n()
  const config = {
    reviewCount: { label: m.reviewHistory.count, color: "var(--chart-3)" },
    averageRating: { label: m.reviewHistory.rating, color: "var(--chart-4)" },
  } satisfies ChartConfig
  return (
    <TabCard
      title={m.reviewHistory.title}
      description={m.reviewHistory.description}
      result={result}
      isEmpty={(d) => d.data.reviews.length === 0}
      emptyText={m.reviewHistory.empty}
      controls={
        <HistoryControls
          period={period}
          interval={interval}
          onChange={onChange}
        />
      }
    >
      {(d) => (
        <ChartContainer
          config={config}
          className="aspect-auto h-[280px] w-full min-w-0"
        >
          <ComposedChart accessibilityLayer data={d.data.reviews}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(v: string) => month(v)}
            />
            <YAxis yAxisId="count" hide />
            <YAxis
              yAxisId="rating"
              orientation="right"
              domain={[0, 5]}
              tickLine={false}
              axisLine={false}
              width={28}
              tickFormatter={(v: number) => dec(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent labelFormatter={(v) => date(String(v))} />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              yAxisId="count"
              isAnimationActive={false}
              dataKey="reviewCount"
              fill="var(--color-reviewCount)"
              radius={4}
            />
            <Line
              yAxisId="rating"
              isAnimationActive={false}
              dataKey="averageRating"
              stroke="var(--color-averageRating)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ChartContainer>
      )}
    </TabCard>
  )
}
