import { ChangeBadge } from "@/components/change-badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useI18n } from "@/i18n"
import type { OverviewProduct } from "@/lib/types"

/** A few figures about the watchlist. */
export function OverviewKpis({ products }: { products: OverviewProduct[] }) {
  const { m, num, eur } = useI18n()
  const revenue = products.reduce<number | null>(
    (s, p) => (p.revenue == null ? s : (s ?? 0) + p.revenue),
    null
  )
  // A riser went up, a faller went down: a single falling product is no riser.
  const up = products.filter((p) => (p.change ?? 0) > 0)
  const down = products.filter((p) => (p.change ?? 0) < 0)
  const riser = up.length
    ? up.reduce((a, b) => ((b.change ?? 0) > (a.change ?? 0) ? b : a))
    : null
  const faller = down.length
    ? down.reduce((a, b) => ((b.change ?? 0) < (a.change ?? 0) ? b : a))
    : null
  const loaded = products.some((p) => p.change !== null)
  const mover = (label: string, p: OverviewProduct | null, none: string) => (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className="line-clamp-2 text-base font-semibold"
          title={p?.title ?? undefined}
        >
          {p ? p.title : m.common.none}
        </CardTitle>
        {p && (
          <CardAction>
            <ChangeBadge
              current={p.lastSales}
              previous={p.prevSales}
              kind="count"
            />
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="text-sm text-muted-foreground">
        {p ? m.home.changeHint : loaded ? none : m.home.noTrend}
      </CardFooter>
    </Card>
  )
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>{m.home.followed}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {num(products.length)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          {m.home.followCost}
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>{m.home.revenue30}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums">
            {eur(revenue)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="text-sm text-muted-foreground">
          {m.home.revenueHint}
        </CardFooter>
      </Card>
      {mover(m.home.riser, riser, m.home.noRiser)}
      {mover(m.home.faller, faller, m.home.noFaller)}
    </div>
  )
}
