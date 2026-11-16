import { ActivityIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import type { RequestLogRow } from "@/lib/types"

function statusVariant(status: number) {
  if (status >= 200 && status < 300) return "secondary" as const
  if (status === 429 || status === 402) return "destructive" as const
  return "outline" as const
}

/** The last calls of this app with their status and the per-minute limit left. */
export function RecentRequests({ rows }: { rows: RequestLogRow[] }) {
  const { m, fill, num, locale } = useI18n()
  const time = (v: string) =>
    new Date(v).toLocaleTimeString(locale === "nl" ? "nl-NL" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.requests.title}</CardTitle>
        <CardDescription>{m.requests.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty className="flex-none border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ActivityIcon />
              </EmptyMedia>
              <EmptyTitle>{m.requests.empty}</EmptyTitle>
              <EmptyDescription>{m.requests.emptyHint}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.requests.time}</TableHead>
                <TableHead>{m.requests.endpoint}</TableHead>
                <TableHead>{m.requests.status}</TableHead>
                <TableHead className="hidden sm:table-cell">
                  {m.requests.source}
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  {m.requests.rateLeft}
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  {m.requests.retryAfter}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="tabular-nums">{time(r.at)}</TableCell>
                  <TableCell
                    className="max-w-[9rem] truncate font-mono text-xs sm:max-w-xs"
                    title={r.path}
                  >
                    {r.path}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {r.fromCache ? m.requests.cache : m.requests.live}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {r.rateLimit === null || r.rateRemaining === null
                      ? m.common.none
                      : fill(m.rate.left, {
                          left: num(r.rateRemaining),
                          limit: num(r.rateLimit),
                        })}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {r.retryAfter ? `${r.retryAfter} s` : m.common.none}
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
