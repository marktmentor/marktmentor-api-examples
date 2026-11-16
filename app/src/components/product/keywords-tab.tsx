import { KEYWORD_PERIODS, type KeywordPeriod } from "@/lib/research-params"
import { OptionSelect } from "@/components/research/period-select"
import { Pager } from "@/components/research/pager"
import { TabCard } from "@/components/research/tab-card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/i18n"
import type { ApiResult, KeywordList } from "@/lib/types"

/** GET research/products/{code}/keywords/ (paginated) */
export function KeywordsTab({
  result,
  period,
  onPeriod,
  onPage,
}: {
  result: ApiResult<KeywordList>
  period: KeywordPeriod
  onPeriod: (p: KeywordPeriod) => void
  onPage: (page: number) => void
}) {
  const { m, fill, num } = useI18n()
  return (
    <TabCard
      title={m.keywords.title}
      description={m.keywords.description}
      result={result}
      isEmpty={(d) => d.data.length === 0}
      emptyText={m.keywords.empty}
      controls={
        <>
          <OptionSelect
            value={period}
            options={KEYWORD_PERIODS}
            labels={m.keywords.periods}
            onChange={onPeriod}
          />
          {result.ok && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {fill(m.keywords.count, { n: num(result.data.pagination.total) })}
            </span>
          )}
        </>
      }
    >
      {(d) => (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.keywords.keyword}</TableHead>
                <TableHead className="text-right">
                  {m.keywords.position} {m.common.nlShort}
                </TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {m.keywords.volume} {m.common.nlShort}
                </TableHead>
                <TableHead className="text-right">
                  {m.keywords.position} {m.common.beShort}
                </TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  {m.keywords.volume} {m.common.beShort}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.data.map((k) => (
                <TableRow key={k.keywordId}>
                  <TableCell className="font-medium">{k.keyword}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {num(k.markets.NL?.position)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {num(k.markets.NL?.searchVolume)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {num(k.markets.BE?.position)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {num(k.markets.BE?.searchVolume)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pager pagination={d.pagination} onPage={onPage} />
        </>
      )}
    </TabCard>
  )
}
