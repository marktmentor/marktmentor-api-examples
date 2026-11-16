import { SELLER_PERIODS, type SellerPeriod } from "@/lib/research-params"
import { TriangleAlertIcon } from "lucide-react"
import { OptionSelect } from "@/components/research/period-select"
import { TabCard } from "@/components/research/tab-card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/i18n"
import type { ApiResult, Sellers } from "@/lib/types"

/** GET research/products/{code}/sellers/: buy box summary, listing changes and sellers. */
export function SellersTab({
  result,
  period,
  onPeriod,
}: {
  result: ApiResult<Sellers>
  period: SellerPeriod
  onPeriod: (p: SellerPeriod) => void
}) {
  const { m, num, dec, price } = useI18n()
  return (
    <TabCard
      title={m.sellers.title}
      description={m.sellers.description}
      result={result}
      isEmpty={(d) => d.data.length === 0}
      emptyText={m.sellers.empty}
      controls={
        <OptionSelect
          value={period}
          options={SELLER_PERIODS}
          labels={m.sellers.periods}
          onChange={onPeriod}
        />
      }
    >
      {(d) => (
        <>
          <div className="grid gap-4 @3xl/main:grid-cols-[2fr_1fr]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead className="text-right">
                    {m.common.nlShort}
                  </TableHead>
                  <TableHead className="text-right">
                    {m.common.beShort}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(
                  [
                    ["buyBoxSellers", "buyBoxSellerCount", num],
                    ["takeovers", "buyBoxTakeovers", num],
                    ["hoursInBuyBox", "averageHoursInBuyBox", dec],
                  ] as const
                ).map(([label, key, fmt]) => (
                  <TableRow key={key}>
                    <TableCell className="text-muted-foreground">
                      {m.sellers[label]}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(d.markets.NL?.[key])}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(d.markets.BE?.[key])}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">
                {m.sellers.listingChanges}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">
                  {m.sellers.mainImage}{" "}
                  <span className="tabular-nums">
                    {num(d.listingChanges.mainImage)}
                  </span>
                </Badge>
                <Badge variant="outline">
                  {m.sellers.titleChange}{" "}
                  <span className="tabular-nums">
                    {num(d.listingChanges.title)}
                  </span>
                </Badge>
                <Badge variant="outline">
                  {m.sellers.descriptionChange}{" "}
                  <span className="tabular-nums">
                    {num(d.listingChanges.description)}
                  </span>
                </Badge>
              </div>
            </div>
          </div>
          {d.hasMore && (
            <Alert>
              <TriangleAlertIcon />
              <AlertDescription>{m.sellers.hasMore}</AlertDescription>
            </Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.sellers.seller}</TableHead>
                <TableHead className="w-40">
                  {m.sellers.share} {m.common.nlShort}
                </TableHead>
                <TableHead className="hidden w-40 md:table-cell">
                  {m.sellers.share} {m.common.beShort}
                </TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {m.sellers.price}
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  {m.sellers.delivery}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.data.map((s) => (
                <TableRow key={s.sellerCode}>
                  <TableCell className="font-medium">
                    {s.name}
                    {s.rating != null && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {dec(s.rating)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Share value={s.markets.NL?.buyBoxShare} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Share value={s.markets.BE?.buyBoxShare} />
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {price(s.markets.NL?.averagePrice)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {dec(s.markets.NL?.deliveryDays)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </TabCard>
  )
}

function Share({ value }: { value: number | null | undefined }) {
  const { dec, m } = useI18n()
  if (value == null)
    return <span className="text-muted-foreground">{m.common.none}</span>
  return (
    <div className="flex items-center gap-2">
      <Progress value={value} className="h-1.5" />
      <span className="w-12 text-right text-xs tabular-nums">
        {dec(value)}%
      </span>
    </div>
  )
}
