// Position history (1 is the top): summaries for the ranking table and its
// charts. Generic: a row is a category now, and can be a keyword or a page
// position later, with the same table and chart.

export type RankMarket = "NL" | "BE"
export const RANK_MARKETS: readonly RankMarket[] = ["NL", "BE"]

export type RankPoint = {
  date: string
  positions: Partial<Record<RankMarket, number | null>>
}

export type RankRow = { id: string; label: string; points: RankPoint[] }

export type RankSummary = {
  /** The last known position per market, or null. */
  now: Record<RankMarket, number | null>
  /** The best (lowest) position in the period, per market. */
  best: Record<RankMarket, number | null>
  /** Places gained since the first point of the period (positive = higher). */
  change: Record<RankMarket, number | null>
  /** The worst (highest) position of all markets: the bottom of the chart. */
  worst: number | null
  ranked: boolean
}

const values = (row: RankRow, market: RankMarket) =>
  row.points
    .map((p) => p.positions[market])
    .filter((v): v is number => v != null)

export function summarize(row: RankRow): RankSummary {
  const per = <T>(f: (v: number[]) => T) =>
    Object.fromEntries(
      RANK_MARKETS.map((mk) => [mk, f(values(row, mk))])
    ) as Record<RankMarket, T>
  const all = RANK_MARKETS.flatMap((mk) => values(row, mk))
  return {
    now: per((v) => v.at(-1) ?? null),
    best: per((v) => (v.length ? Math.min(...v) : null)),
    change: per((v) => (v.length > 1 ? places(v[0] - v[v.length - 1]) : null)),
    worst: all.length ? Math.max(...all) : null,
    ranked: all.length > 0,
  }
}

// Positions are averages (6.4). The change is shown in whole places, so it
// is rounded the same way: -0.3 is no change, not "down 0". `|| 0` drops -0.
const places = (n: number) => Math.round(n) || 0

/** Ranked rows first, best current position first; NL decides, then BE. */
export function sortRows(rows: RankRow[]) {
  const key = (s: RankSummary) => s.now.NL ?? s.now.BE ?? Infinity
  return rows
    .map((row) => ({ row, summary: summarize(row) }))
    .sort((a, b) => key(a.summary) - key(b.summary))
}

/** Whole-number ticks from 1 to the worst position, at most about six. */
export function rankTicks(worst: number) {
  const max = Math.max(Math.ceil(worst), 2)
  const step =
    [1, 2, 5, 10, 20, 50, 100, 200, 500].find((s) => max / s <= 5) ?? 1000
  const ticks = [1]
  for (let v = step; v < max; v += step) if (v > 1) ticks.push(v)
  // No label just above another one (20 and 21): the bottom value replaces it.
  if (ticks.length > 1 && max - ticks[ticks.length - 1] < step / 2) ticks.pop()
  ticks.push(max)
  return ticks
}
