// The shadcn chart tokens, used the same way everywhere.
// NL and BE always have the same colour; series that are no market use 3 and 4.
export const MARKET_COLORS = {
  NL: "var(--chart-1)",
  BE: "var(--chart-2)",
} as const

export const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

/** One colour per followed product with a trend (at most five), in list order. */
export function productColors(
  products: { productCode: string; trend: unknown[] | null }[]
) {
  const colors = new Map<string, string>()
  for (const p of products) {
    if (!p.trend?.length || colors.size >= SERIES_COLORS.length) continue
    colors.set(p.productCode, SERIES_COLORS[colors.size])
  }
  return colors
}
