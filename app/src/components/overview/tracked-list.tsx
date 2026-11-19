import { ChangeBadge } from "@/components/change-badge"
import { Link } from "@tanstack/react-router"
import { LineChartIcon, RefreshCwIcon, StarIcon } from "lucide-react"
import { Sparkline } from "@/components/overview/sparkline"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
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
import type { OverviewProduct } from "@/lib/types"

/** The followed products as rich rows: photo, price, sales, trend line and change. */
export function TrackedList({
  products,
  busy,
  onLoadTrends,
  onRefresh,
  colors,
}: {
  products: OverviewProduct[]
  /** The colour of each product in the chart above (the table is its legend). */
  colors: Map<string, string>
  busy: "trends" | "refresh" | null
  onLoadTrends: () => void
  onRefresh: () => void
}) {
  const { m, fill, num, eur, price } = useI18n()
  const missing = products.filter((p) => !p.trendCurrent).length
  if (products.length === 0) {
    return (
      <Empty className="flex-none border py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <StarIcon />
          </EmptyMedia>
          <EmptyTitle>{m.home.emptyTitle}</EmptyTitle>
          <EmptyDescription>{m.home.emptyBody}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/products">{m.home.emptyAction}</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.home.listTitle}</CardTitle>
        <CardDescription>{m.home.listDescription}</CardDescription>
        <CardAction className="flex flex-wrap justify-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label={m.overview.refresh}
                onClick={onRefresh}
                disabled={busy !== null}
              >
                {busy === "refresh" ? <Spinner /> : <RefreshCwIcon />}
                <span className="hidden sm:inline">{m.overview.refresh}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {fill(m.overview.refreshCost, { n: products.length })}
            </TooltipContent>
          </Tooltip>
          {missing > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={onLoadTrends}
                  disabled={busy !== null}
                >
                  {busy === "trends" ? <Spinner /> : <LineChartIcon />}
                  {m.home.loadTrends} ({missing})
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {fill(m.home.loadTrendsCost, { n: missing })}
              </TooltipContent>
            </Tooltip>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.products.product}</TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                {m.product.price}
              </TableHead>
              <TableHead className="text-right">{m.overview.sales30}</TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                {m.product.revenue}
              </TableHead>
              <TableHead className="hidden md:table-cell">
                {m.home.trend}
              </TableHead>
              <TableHead className="text-right">{m.home.change}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.productCode}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{
                        background: colors.get(p.productCode) ?? "transparent",
                      }}
                    />
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="size-10 shrink-0 rounded-md bg-muted object-contain"
                      />
                    ) : (
                      <div className="size-10 shrink-0 rounded-md bg-muted" />
                    )}
                    <div className="flex max-w-[9rem] min-w-0 flex-col sm:max-w-xs xl:max-w-md">
                      <Link
                        to="/products/$productCode"
                        params={{ productCode: p.productCode }}
                        className="truncate font-medium hover:underline"
                        title={p.title ?? undefined}
                      >
                        {p.title ?? p.productCode}
                      </Link>
                      <span className="truncate text-xs text-muted-foreground">
                        {m.common.ean} {p.ean}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">
                  {price(p.price)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {num(p.sales)}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums lg:table-cell">
                  {eur(p.revenue)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {p.trend ? (
                    <Sparkline
                      points={p.trend}
                      color={colors.get(p.productCode)}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {m.common.none}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {p.lastSales === null ? (
                    <span className="text-muted-foreground">
                      {m.common.none}
                    </span>
                  ) : (
                    <ChangeBadge
                      current={p.lastSales}
                      previous={p.prevSales}
                      kind="count"
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
