import { CameraIcon } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/i18n"
import type { TrackedProduct } from "@/lib/types"

/** The daily snapshots of a followed product, from the local database (no request). */
export function SnapshotsTab({
  snapshots,
}: {
  snapshots: TrackedProduct["snapshots"]
}) {
  const { m, num, eur, price, date } = useI18n()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.product.snapshotsTab}</CardTitle>
        <CardDescription>{m.product.snapshotsDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {snapshots.length === 0 ? (
          <Empty className="flex-none border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CameraIcon />
              </EmptyMedia>
              <EmptyTitle>{m.product.snapshotsTab}</EmptyTitle>
              <EmptyDescription>{m.product.noSnapshots}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.product.day}</TableHead>
                <TableHead>{m.product.market}</TableHead>
                <TableHead className="text-right">{m.product.price}</TableHead>
                <TableHead className="text-right">
                  {m.overview.sales30}
                </TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {m.product.revenue}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((s) => (
                <TableRow key={`${s.day}-${s.market}`}>
                  <TableCell>{date(s.day)}</TableCell>
                  <TableCell>{s.market}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {price(s.price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {num(s.sales)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {eur(s.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
