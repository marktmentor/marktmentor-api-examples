import { Link } from "@tanstack/react-router"
import { StarIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from "@/i18n"
import { bothMarkets } from "@/lib/csv"
import type { Market } from "@/lib/filters"
import type { Product } from "@/lib/types"

/**
 * A list of products from any product list endpoint. With market NL or BE the
 * API returns that market only; with NL + BE the figures are added up.
 */
export function ProductTable({
  products,
  market = "ALL",
  tracked,
  onToggle,
  highlight,
}: {
  products: Product[]
  market?: Market
  tracked?: Set<string>
  onToggle?: (p: Product) => void
  highlight?: string
}) {
  const { m, fill, num, eur, price, dec } = useI18n()
  const value = (p: Product, key: "sales" | "revenue") =>
    market === "ALL" ? bothMarkets(p, key) : (p.markets[market]?.[key] ?? null)
  const priceOf = (p: Product) =>
    market === "BE"
      ? p.markets.BE?.price
      : (p.markets.NL?.price ?? p.markets.BE?.price)
  const marketLabel = m.filters.markets[market]
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{m.products.product}</TableHead>
          <TableHead className="hidden text-right sm:table-cell">
            {m.product.price}
          </TableHead>
          <TableHead className="text-right">
            {m.product.sales}{" "}
            <span className="hidden font-normal text-muted-foreground sm:inline">
              ({marketLabel})
            </span>
          </TableHead>
          <TableHead className="hidden text-right lg:table-cell">
            {m.product.revenue}{" "}
            <span className="font-normal text-muted-foreground">
              ({marketLabel})
            </span>
          </TableHead>
          <TableHead className="hidden text-right md:table-cell">
            {m.products.reviews}
          </TableHead>
          {onToggle && <TableHead className="w-0" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((p) => {
          const followed = tracked?.has(p.productCode) ?? false
          return (
            <TableRow key={p.productCode}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="size-10 shrink-0 rounded-md bg-muted object-contain"
                    />
                  ) : (
                    <div className="size-10 shrink-0 rounded-md bg-muted" />
                  )}
                  <div className="flex max-w-[9.5rem] min-w-0 flex-col sm:max-w-xs xl:max-w-md 2xl:max-w-xl">
                    <div className="flex items-center gap-2">
                      <Link
                        to="/products/$productCode"
                        params={{ productCode: p.productCode }}
                        className="truncate font-medium hover:underline"
                        title={p.title}
                      >
                        {p.title}
                      </Link>
                      {highlight === p.productCode && (
                        <Badge variant="secondary">{m.variants.current}</Badge>
                      )}
                    </div>
                    <span className="truncate text-xs text-muted-foreground">
                      <span className="sm:hidden">{price(priceOf(p))} · </span>
                      {p.brand} · {m.common.ean} {p.ean}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">
                {price(priceOf(p))}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {market === "ALL" ? (
                  <Tooltip>
                    <TooltipTrigger className="underline decoration-dotted underline-offset-4">
                      {num(value(p, "sales"))}
                    </TooltipTrigger>
                    <TooltipContent>
                      {fill(m.products.salesSplit, {
                        nl: num(p.markets.NL?.sales),
                        be: num(p.markets.BE?.sales),
                      })}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  num(value(p, "sales"))
                )}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums lg:table-cell">
                {eur(value(p, "revenue"))}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums md:table-cell">
                {dec(p.rating)}{" "}
                <span className="text-muted-foreground">
                  ({num(p.reviewCount)})
                </span>
              </TableCell>
              {onToggle && (
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={followed ? "secondary" : "ghost"}
                        size="sm"
                        aria-label={
                          followed ? m.common.following : m.common.follow
                        }
                        onClick={() => onToggle(p)}
                      >
                        <StarIcon className={followed ? "fill-current" : ""} />
                        <span className="hidden 2xl:inline">
                          {followed ? m.common.following : m.common.follow}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="2xl:hidden">
                      {followed ? m.common.following : m.common.follow}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
