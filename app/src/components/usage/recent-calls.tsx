import { Link } from "@tanstack/react-router"
import { ChevronRightIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useUsage } from "@/hooks/use-usage"
import { useI18n } from "@/i18n"
import type { CallKind } from "@/lib/ticker-core"

const KIND_VARIANT: Record<
  CallKind,
  "default" | "secondary" | "outline" | "destructive"
> = {
  cost: "default",
  cache: "secondary",
  free: "outline",
  failed: "destructive",
}

/** research/products/9300…/sales-history/ → products/{code}/sales-history */
const shortPath = (path: string) =>
  path
    .replace(/^research\//, "")
    .replace(/^(products|niches)\/[^/]+\//, "$1/{id}/")
    .replace(/\/$/, "")

export function RecentCalls() {
  const { m, num } = useI18n()
  const { data } = useUsage()
  const kindLabel = {
    cost: m.ticker.kindCost,
    cache: m.ticker.kindCache,
    free: m.ticker.kindFree,
    failed: m.ticker.kindFailed,
  }
  const time = (at: string) =>
    new Date(at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium">{m.ticker.recentTitle}</span>
      {!data?.recent.length && (
        <span className="text-xs text-muted-foreground">{m.ticker.empty}</span>
      )}
      <ul className="flex flex-col gap-1">
        {data?.recent.map((r) => (
          <li
            key={r.id}
            className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 text-xs"
          >
            <span className="text-muted-foreground tabular-nums">
              {time(r.at)}
            </span>
            <span className="truncate font-mono" title={r.path}>
              {shortPath(r.path)}
            </span>
            <span className="tabular-nums">{num(r.status)}</span>
            <Badge variant={KIND_VARIANT[r.kind]}>{kindLabel[r.kind]}</Badge>
          </li>
        ))}
      </ul>
      <Separator />
      <p className="text-xs text-muted-foreground">{m.ticker.localOnly}</p>
      <Button asChild variant="outline" size="sm">
        <Link to="/usage">
          {m.ticker.allUsage}
          <ChevronRightIcon />
        </Link>
      </Button>
    </div>
  )
}
