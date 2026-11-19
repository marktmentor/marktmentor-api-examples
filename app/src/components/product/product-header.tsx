import { Link } from "@tanstack/react-router"
import { StarIcon } from "lucide-react"
import { SourceBadge } from "@/components/source-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from "@/i18n"
import { marketValue } from "@/lib/markets"
import type { ApiResult, Product } from "@/lib/types"

/** Title, follow button and the NL + BE, NL and BE cards of a product. */
export function ProductHeader({
  result,
  product: p,
  tracked,
  onToggle,
  controls,
}: {
  result: ApiResult<unknown>
  product: Product
  tracked: boolean
  onToggle: () => void
  /** Market and period of the figures. */
  controls?: React.ReactNode
}) {
  const { m, fill, num, eur, price } = useI18n()
  const cards = [
    {
      key: "both",
      label: m.common.both,
      sales: marketValue(p.markets, "sales"),
      revenue: marketValue(p.markets, "revenue"),
    },
    { key: "NL", label: m.common.nl, ...p.markets.NL },
    { key: "BE", label: m.common.be, ...p.markets.BE },
  ] as const
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {p.imageUrl && (
          <img
            src={p.imageUrl}
            alt=""
            className="size-20 shrink-0 rounded-lg bg-muted object-contain p-1 sm:size-24"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1
            className="line-clamp-2 text-xl font-semibold tracking-tight text-balance sm:text-2xl"
            title={p.title ?? undefined}
          >
            {p.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {p.brand} · {m.common.ean} {p.ean} ·{" "}
            {fill(m.product.codes, { code: p.productCode })}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {p.categories.map((c) => (
              <Tooltip key={c.categoryId}>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" asChild>
                    <Link to="/products" search={{ categoryId: c.categoryId }}>
                      {c.name}
                    </Link>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {fill(m.filters.categoryTip, { id: c.categoryId })}
                </TooltipContent>
              </Tooltip>
            ))}
            <SourceBadge result={result} />
          </div>
        </div>
        <Button
          variant={tracked ? "secondary" : "default"}
          onClick={onToggle}
          className="self-start"
        >
          <StarIcon className={tracked ? "fill-current" : ""} />
          {tracked ? m.common.following : m.common.follow}
        </Button>
      </div>
      {controls && (
        <div className="flex flex-wrap items-center gap-2">{controls}</div>
      )}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
        {cards.map((x) => (
          <Card key={x.key}>
            <CardHeader>
              <CardDescription>{x.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {eur(x.revenue)}
              </CardTitle>
            </CardHeader>
            <CardFooter className="grid grid-cols-3 gap-2 text-sm">
              <Metric label={m.product.sales} value={num(x.sales)} />
              {x.key === "both" ? (
                <div className="col-span-2 flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    {m.common.both}
                  </span>
                  <span className="font-medium tabular-nums">
                    {fill(m.products.salesSplit, {
                      nl: num(p.markets.NL?.sales),
                      be: num(p.markets.BE?.sales),
                    })}
                  </span>
                </div>
              ) : (
                <>
                  <Metric label={m.product.price} value={price(x.price)} />
                  <Metric
                    label={m.product.sellers}
                    value={num(x.sellerCount)}
                  />
                </>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}
