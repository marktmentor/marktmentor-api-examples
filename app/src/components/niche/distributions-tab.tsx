import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { OptionSelect } from "@/components/research/period-select"
import { TabCard } from "@/components/research/tab-card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useI18n } from "@/i18n"
import { LIST_PERIODS, type ListPeriod } from "@/lib/filters"
import type { ApiResult, ProductDistributions } from "@/lib/types"

const KEYS = ["price", "sales", "revenue"] as const

/** GET research/niches/{id}/product-distributions/: three histograms. */
export function DistributionsTab({
  result,
  period,
  onPeriod,
}: {
  result: ApiResult<ProductDistributions>
  period: ListPeriod
  onPeriod: (p: ListPeriod) => void
}) {
  const { m, fill, num, eur } = useI18n()
  const config = {
    productCount: { label: m.distributions.products, color: "var(--chart-3)" },
  } satisfies ChartConfig
  return (
    <TabCard
      title={m.distributions.title}
      description={m.distributions.description}
      result={result}
      isEmpty={(d) => d.data.productCount === 0}
      emptyText={fill(m.distributions.total, { n: 0 })}
      controls={
        <>
          <OptionSelect
            value={period}
            options={LIST_PERIODS}
            labels={m.filters.periods}
            onChange={onPeriod}
            className="w-32"
          />
          {result.ok && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {fill(m.distributions.total, {
                n: num(result.data.data.productCount),
              })}
            </span>
          )}
        </>
      }
    >
      {(d) => (
        <div className="grid gap-6 @4xl/main:grid-cols-3">
          {KEYS.map((key) => {
            const fmt = key === "sales" ? num : eur
            const label = (from: number | null, to: number | null) =>
              from == null
                ? fill(m.distributions.below, { to: fmt(to) })
                : to == null
                  ? fill(m.distributions.above, { from: fmt(from) })
                  : fill(m.distributions.range, {
                      from: fmt(from),
                      to: fmt(to),
                    })
            const rows = (d.data.total?.[key] ?? []).map((b) => ({
              range: label(b.fromValue, b.toValue),
              productCount: b.productCount,
            }))
            return (
              <div key={key} className="flex min-w-0 flex-col gap-2">
                <span className="text-sm font-medium">
                  {m.distributions[key]}
                </span>
                <ChartContainer
                  config={config}
                  className="aspect-auto h-[220px] w-full min-w-0"
                >
                  <BarChart accessibilityLayer data={rows}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="range"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval="preserveStartEnd"
                      fontSize={11}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      tickFormatter={(v: number) => num(v)}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      isAnimationActive={false}
                      dataKey="productCount"
                      fill="var(--color-productCount)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            )
          })}
        </div>
      )}
    </TabCard>
  )
}
