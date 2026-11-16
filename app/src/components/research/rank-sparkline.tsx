import { MARKET_COLORS } from "@/lib/colors"
import {
  RANK_MARKETS,
  type RankMarket,
  type RankPoint,
} from "@/lib/rank-history"

/** A step line per market, position 1 at the top. A week without a value is a gap. */
function stepPath(
  points: RankPoint[],
  market: RankMarket,
  x: (i: number) => number,
  y: (v: number) => number
) {
  let d = ""
  let open = false
  points.forEach((p, i) => {
    const v = p.positions[market]
    if (v == null) {
      open = false
      return
    }
    d += open ? `H${x(i)}V${y(v)}` : `M${x(i)},${y(v)}`
    open = true
  })
  return d
}

/** A small trend line for a table row: plain SVG, no axes. */
export function RankSparkline({
  points,
  worst,
  width = 140,
  height = 28,
}: {
  points: RankPoint[]
  worst: number
  width?: number
  height?: number
}) {
  const max = Math.max(worst, 2)
  const x = (i: number) =>
    2 + (i * (width - 4)) / Math.max(points.length - 1, 1)
  const y = (v: number) => 2 + ((v - 1) * (height - 4)) / (max - 1)
  // BE first, so NL is drawn on top where the lines overlap.
  return (
    <svg width={width} height={height} aria-hidden className="block">
      {[...RANK_MARKETS].reverse().map((mk) => (
        <path
          key={mk}
          d={stepPath(points, mk, x, y)}
          fill="none"
          stroke={MARKET_COLORS[mk]}
          strokeWidth={mk === "NL" ? 2 : 1.5}
        />
      ))}
    </svg>
  )
}
