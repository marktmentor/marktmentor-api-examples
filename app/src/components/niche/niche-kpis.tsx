import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/i18n"
import type { Market } from "@/lib/filters"
import { marketValue } from "@/lib/markets"
import type { NicheDetail } from "@/lib/types"

type Key = "searchVolume" | "sales" | "revenue"
const DAYS = { "30d": 30, "90d": 90, "365d": 365 } as const

/** The niche figures, each compared with an average period of the same length in the last year (comparePeriods). */
export function NicheKpis({
  niche,
  market,
  period,
}: {
  niche: NicheDetail
  market: Market
  period: "30d" | "90d" | "365d"
}) {
  const { m, fill, num, eur, dec, pct } = useI18n()
  const year = niche.periods?.find((p) => p.period === "365d")
  const change = (key: Key) => {
    const now = marketValue(niche.markets, key, market)
    const total = marketValue(year?.markets, key, market)
    if (now == null || !total || period === "365d") return null
    // Totals per period: scale the year to the same number of days.
    const average = (total * DAYS[period]) / 365
    return average ? (now / average - 1) * 100 : null
  }
  const cards: {
    key: string
    label: string
    value: string
    change: number | null
    footer?: string
  }[] = [
    {
      key: "searchVolume",
      label: m.niche.searchVolume,
      value: num(marketValue(niche.markets, "searchVolume", market)),
      change: change("searchVolume"),
    },
    {
      key: "sales",
      label: m.niche.sales,
      value: num(marketValue(niche.markets, "sales", market)),
      change: change("sales"),
    },
    {
      key: "revenue",
      label: m.niche.revenue,
      value: eur(marketValue(niche.markets, "revenue", market)),
      change: change("revenue"),
    },
    {
      key: "scores",
      label: `${m.niche.quality} / ${m.niche.competition}`,
      value: `${dec(niche.qualityScore)} / ${dec(niche.competitionScore)}`,
      change: null,
      footer: `${num(niche.productCount)} ${m.niche.products.toLowerCase()} · ${m.niche.scoreHint}`,
    },
  ]
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.key}>
          <CardHeader>
            <CardDescription>{c.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {c.value}
            </CardTitle>
            {c.change !== null && (
              <CardAction>
                <Badge variant="outline">
                  {c.change > 0 ? (
                    <TrendingUpIcon />
                  ) : c.change < 0 ? (
                    <TrendingDownIcon />
                  ) : (
                    <MinusIcon />
                  )}
                  {pct(c.change)}
                </Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">
            {c.footer ??
              (c.change !== null
                ? fill(m.niche.vsYear, { days: DAYS[period] })
                : m.niche.marketPeriod)}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

/** comparePeriods as a table: totals and the average per 30 days. */
export function PeriodsTable({
  niche,
  market,
}: {
  niche: NicheDetail
  market: Market
}) {
  const { m, num, eur } = useI18n()
  const keys = ["searchVolume", "sales", "revenue"] as const
  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.periodsTable.title}</CardTitle>
        <CardDescription>{m.periodsTable.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.periodsTable.period}</TableHead>
              {keys.map((k) => (
                <TableHead key={k} className="text-right">
                  {m.niche[k]}
                </TableHead>
              ))}
              {keys.map((k) => (
                <TableHead
                  key={`${k}-avg`}
                  className="hidden text-right md:table-cell"
                >
                  {m.niche[k]}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({m.niche.perMonth.toLowerCase()})
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(niche.periods ?? []).map((r) => {
              const days = DAYS[r.period as keyof typeof DAYS]
              return (
                <TableRow key={r.period}>
                  <TableCell className="font-medium">
                    {m.periodsTable.periods[r.period as keyof typeof DAYS]}
                  </TableCell>
                  {keys.map((k) => (
                    <TableCell key={k} className="text-right tabular-nums">
                      {(k === "revenue" ? eur : num)(
                        marketValue(r.markets, k, market)
                      )}
                    </TableCell>
                  ))}
                  {keys.map((k) => {
                    const v = marketValue(r.markets, k, market)
                    return (
                      <TableCell
                        key={`${k}-avg`}
                        className="hidden text-right text-muted-foreground tabular-nums md:table-cell"
                      >
                        {(k === "revenue" ? eur : num)(
                          v == null ? null : (v * 30) / days
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
