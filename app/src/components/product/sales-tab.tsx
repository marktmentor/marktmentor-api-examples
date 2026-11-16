import { DownloadIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { HistoryControls } from "@/components/research/history-controls"
import { TabCard } from "@/components/research/tab-card"
import { Button } from "@/components/ui/button"
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
import { downloadCsv } from "@/lib/csv"
import type { HistoryPeriod, Interval } from "@/lib/research-params"
import type { ApiResult, History } from "@/lib/types"

/** GET research/products/{code}/sales-history/ as a stacked bar chart. */
export function SalesTab({
  result,
  ean,
  period,
  interval,
  onChange,
}: {
  result: ApiResult<History>
  ean: string
  period: HistoryPeriod
  interval: Interval
  onChange: (next: { period: HistoryPeriod; interval: Interval }) => void
}) {
  const { m, date, month, num } = useI18n()
  const rows = result.ok
    ? result.data.data.map((p) => ({
        date: p.date,
        NL: p.markets.NL?.sales ?? null,
        BE: p.markets.BE?.sales ?? null,
        revenueNL: p.markets.NL?.revenue ?? null,
        revenueBE: p.markets.BE?.revenue ?? null,
      }))
    : []
  const config = {
    NL: { label: m.common.nl, color: MARKET_COLORS.NL },
    BE: { label: m.common.be, color: MARKET_COLORS.BE },
  } satisfies ChartConfig
  return (
    <TabCard
      title={m.product.history}
      description={m.product.historyDescription}
      result={result}
      isEmpty={(d) => d.data.length === 0}
      emptyText={m.product.noHistory}
      controls={
        <>
          <HistoryControls
            period={period}
            interval={interval}
            onChange={onChange}
          />
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(
                `sales-history-${ean}.csv`,
                ["date", "NL", "BE", "revenueNL", "revenueBE"],
                rows
              )
            }
          >
            <DownloadIcon />
            <span className="hidden sm:inline">{m.common.csv}</span>
          </Button>
        </>
      }
    >
      {() => (
        <ChartContainer
          config={config}
          className="aspect-auto h-[280px] w-full min-w-0"
        >
          <BarChart accessibilityLayer data={rows}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(d: string) => month(d)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(v: number) => num(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent labelFormatter={(d) => date(String(d))} />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              isAnimationActive={false}
              dataKey="NL"
              stackId="a"
              fill="var(--color-NL)"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              isAnimationActive={false}
              dataKey="BE"
              stackId="a"
              fill="var(--color-BE)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      )}
    </TabCard>
  )
}
