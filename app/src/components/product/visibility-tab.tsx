import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
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
import { marketValue } from "@/lib/markets"
import type { HistoryPeriod, Interval } from "@/lib/research-params"
import type { ApiResult, VisibilityHistory } from "@/lib/types"

/** GET research/products/{code}/visibility-history/ */
export function VisibilityTab({
  result,
  period,
  interval,
  onChange,
}: {
  result: ApiResult<VisibilityHistory>
  period: HistoryPeriod
  interval: Interval
  onChange: (next: { period: HistoryPeriod; interval: Interval }) => void
}) {
  const { m, date, month, num } = useI18n()
  const config = {
    category: { label: m.visibility.category, color: "var(--chart-3)" },
    keyword: { label: m.visibility.keyword, color: "var(--chart-4)" },
  } satisfies ChartConfig
  return (
    <TabCard
      title={m.visibility.title}
      description={m.visibility.description}
      result={result}
      isEmpty={(d) => d.data.length === 0}
      emptyText={m.visibility.empty}
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
          <BarChart
            accessibilityLayer
            data={d.data.map((p) => ({
              date: p.date,
              category: marketValue(p.markets, "categoryImpressions"),
              keyword: marketValue(p.markets, "keywordImpressions"),
            }))}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(v: string) => month(v)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => num(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent labelFormatter={(v) => date(String(v))} />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              isAnimationActive={false}
              dataKey="category"
              fill="var(--color-category)"
              radius={4}
            />
            <Bar
              isAnimationActive={false}
              dataKey="keyword"
              fill="var(--color-keyword)"
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      )}
    </TabCard>
  )
}
