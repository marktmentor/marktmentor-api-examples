import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { useI18n } from "@/i18n"
import type { OverviewProduct } from "@/lib/types"

/**
 * Monthly sales of the followed products (at most five), from the cached
 * sales history. The table below is the legend: each row has the same colour.
 */
export function TrackedChart({
  products,
  colors,
}: {
  products: OverviewProduct[]
  colors: Map<string, string>
}) {
  const { m, date, month, num } = useI18n()
  const shown = products.filter((p) => colors.has(p.productCode))
  const config = Object.fromEntries(
    shown.map((p, i) => [
      `p${i}`,
      { label: p.title ?? p.productCode, color: colors.get(p.productCode) },
    ])
  ) satisfies ChartConfig
  const dates = [
    ...new Set(shown.flatMap((p) => p.trend?.map((t) => t.date) ?? [])),
  ].sort()
  const rows = dates.map((d) => ({
    date: d,
    ...Object.fromEntries(
      shown.map((p, i) => [
        `p${i}`,
        p.trend?.find((t) => t.date === d)?.sales ?? null,
      ])
    ),
  }))
  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.home.chartTitle}</CardTitle>
        <CardDescription>{m.home.chartDescription}</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        {shown.length === 0 ? (
          <Empty className="flex-none border">
            <EmptyHeader>
              <EmptyTitle>{m.home.chartEmpty}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-[260px] w-full min-w-0"
          >
            <LineChart
              accessibilityLayer
              data={rows}
              margin={{ left: 0, right: 8 }}
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
                width={44}
                tickFormatter={(v: number) => num(v)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="max-w-sm"
                    labelFormatter={(v) => date(String(v))}
                  />
                }
              />
              {shown.map((_, i) => (
                <Line
                  key={i}
                  isAnimationActive={false}
                  dataKey={`p${i}`}
                  stroke={`var(--color-p${i})`}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
