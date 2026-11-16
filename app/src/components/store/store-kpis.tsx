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
import type { StoreOverview } from "@/lib/types"

const KPIS = [
  { key: "revenue", money: true, up: true },
  { key: "profit", money: true, up: true },
  { key: "orders", money: false, up: true },
  { key: "returns", money: false, up: false },
] as const

/** GET store/overview/: the totals and the change against the previous period. */
export function StoreKpis({ overview }: { overview: StoreOverview }) {
  const { m, num, eur } = useI18n()
  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {KPIS.map((k) => {
        return (
          <Card key={k.key}>
            <CardHeader>
              <CardDescription>{m.store.kpis[k.key]}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {k.money
                  ? eur(overview.kpis[k.key])
                  : num(overview.kpis[k.key])}
              </CardTitle>
              <CardAction>
                <ChangeBadge
                  current={overview.kpis[k.key]}
                  previous={overview.previous[k.key]}
                  kind={k.money ? "money" : "count"}
                  higherIsBetter={k.up}
                />
              </CardAction>
            </CardHeader>
            <CardFooter className="text-sm text-muted-foreground">
              {m.store.vsPrevious}
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
