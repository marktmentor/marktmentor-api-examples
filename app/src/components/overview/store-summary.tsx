import { Link } from "@tanstack/react-router"
import { ArrowRightIcon } from "lucide-react"
import { ApiError } from "@/components/api-error"
import { ChangeBadge } from "@/components/change-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useI18n } from "@/i18n"
import type { ApiResult, StoreOverview } from "@/lib/types"

const KEYS = [
  { key: "revenue", money: true, up: true },
  { key: "profit", money: true, up: true },
  { key: "orders", money: false, up: true },
  { key: "returns", money: false, up: false },
] as const

/** GET store/overview/ (free): the last 30 days of the own store. */
export function StoreSummary({ result }: { result: ApiResult<StoreOverview> }) {
  const { m, num, eur } = useI18n()
  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>{m.home.storeTitle}</CardTitle>
        <CardDescription>{m.home.storeDescription}</CardDescription>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <Link to="/store">
              {m.home.storeLink}
              <ArrowRightIcon />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!result.ok ? (
          <ApiError error={result} />
        ) : (
          <dl className="grid grid-cols-2 gap-4">
            {KEYS.map((k) => {
              return (
                <div key={k.key} className="flex flex-col gap-1">
                  <dt className="text-xs text-muted-foreground">
                    {m.store.kpis[k.key]}
                  </dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold tabular-nums">
                      {k.money
                        ? eur(result.data.kpis[k.key])
                        : num(result.data.kpis[k.key])}
                    </span>
                    <ChangeBadge
                      current={result.data.kpis[k.key]}
                      previous={result.data.previous[k.key]}
                      kind={k.money ? "money" : "count"}
                      higherIsBetter={k.up}
                    />
                  </dd>
                </div>
              )
            })}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
