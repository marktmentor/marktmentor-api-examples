import { Line, LineChart } from "recharts"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import type { TrendPoint } from "@/lib/types"

/** A small trend line of monthly sales, in the colour of the product in the chart. */
export function Sparkline({
  points,
  color = "var(--chart-1)",
}: {
  points: TrendPoint[]
  color?: string
}) {
  const config = { sales: { label: "Sales", color } } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="aspect-auto h-8 w-24">
      <LineChart
        data={points}
        margin={{ top: 2, bottom: 2, left: 2, right: 2 }}
      >
        <Line
          isAnimationActive={false}
          dataKey="sales"
          stroke="var(--color-sales)"
          strokeWidth={1.5}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  )
}
