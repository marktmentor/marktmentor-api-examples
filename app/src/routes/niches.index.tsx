import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { SearchXIcon } from "lucide-react"
import { ApiError } from "@/components/api-error"
import {
  DefaultHeading,
  SkippedDefault,
} from "@/components/filters/default-list"
import { NicheFilterBar } from "@/components/filters/niche-filter-bar"
import { ResultMeta } from "@/components/filters/result-meta"
import { PageHeader } from "@/components/page-header"
import { Pager } from "@/components/research/pager"
import { SourceBadge } from "@/components/source-badge"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
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
import { useDemo } from "@/hooks/use-demo"
import { useI18n } from "@/i18n"
import {
  type NicheFilters,
  isDefaultView,
  parseNicheFilters,
} from "@/lib/filters"
import { defaultNiches, searchNiches } from "@/api/niches"
import { marketValue } from "@/lib/markets"

export const Route = createFileRoute("/niches/")({
  validateSearch: (s: Record<string, unknown>): NicheFilters =>
    parseNicheFilters(s),
  loaderDeps: ({ search }) => search,
  // Without search words or a category: no request yet.
  // Without any search or filter: the default list (one request a day).
  loader: async ({ deps }) => {
    if (isDefaultView(deps)) {
      const list = await defaultNiches()
      return list.kind === "result"
        ? { result: list.result, skipped: null, isDefault: true }
        : { result: null, skipped: list.reason, isDefault: true }
    }
    return {
      result: await searchNiches({ data: deps }),
      skipped: null,
      isDefault: false,
    }
  },
  // No page skeleton: on a tab, filter or market change the page stays and
  // only the changed part shows that it loads. Visited URLs come from the
  // router cache for a minute.
  staleTime: 60_000,
  component: Niches,
})

function Niches() {
  const { result, skipped, isDefault } = Route.useLoaderData()
  const filters = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { m, num, eur, dec } = useI18n()
  const demo = useDemo()
  const apply = (next: NicheFilters) => navigate({ search: next })
  const market = filters.market ?? "ALL"
  const label = m.filters.markets[market]

  return (
    <>
      <PageHeader title={m.niches.title} description={m.niches.description} />
      <NicheFilterBar value={filters} onApply={apply} />
      {result && !result.ok && <ApiError error={result} />}
      {skipped && <SkippedDefault reason={skipped} />}
      {result?.ok && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col gap-3">
              {isDefault && (
                <DefaultHeading
                  title={m.defaults.niches}
                  hint={m.defaults.nichesHint}
                />
              )}
              <ResultMeta
                total={result.data.pagination.total}
                size={filters.size ?? 25}
                sizeDisabled={demo}
                onSize={(n) =>
                  apply({
                    ...filters,
                    size: n === 25 ? undefined : n,
                    page: undefined,
                  })
                }
              />
            </CardTitle>
            <CardAction>
              <SourceBadge result={result} />
            </CardAction>
          </CardHeader>
          <CardContent>
            {result.data.data.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchXIcon />
                  </EmptyMedia>
                  <EmptyTitle>{m.niches.empty}</EmptyTitle>
                  <EmptyDescription>{m.niches.emptyHint}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m.niches.niche}</TableHead>
                    <TableHead className="text-right">
                      {m.niche.searchVolume}{" "}
                      <span className="hidden font-normal text-muted-foreground sm:inline">
                        ({label})
                      </span>
                    </TableHead>
                    <TableHead className="hidden text-right sm:table-cell">
                      {m.niche.sales}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({label})
                      </span>
                    </TableHead>
                    <TableHead className="hidden text-right lg:table-cell">
                      {m.niche.revenue}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({label})
                      </span>
                    </TableHead>
                    <TableHead className="hidden text-right md:table-cell">
                      {m.niches.products}
                    </TableHead>
                    <TableHead className="hidden text-right md:table-cell">
                      {m.niches.quality}
                    </TableHead>
                    <TableHead className="hidden text-right md:table-cell">
                      {m.niches.competition}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.data.data.map((n) => (
                    <TableRow key={n.nicheId}>
                      <TableCell className="font-medium">
                        <Link
                          to="/niches/$nicheId"
                          params={{ nicheId: n.nicheId }}
                          search={{
                            market: filters.market,
                            period: filters.period,
                          }}
                          className="hover:underline"
                        >
                          {n.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {num(marketValue(n.markets, "searchVolume", market))}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {num(marketValue(n.markets, "sales", market))}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums lg:table-cell">
                        {eur(marketValue(n.markets, "revenue", market))}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {num(n.productCount)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {dec(n.qualityScore)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {dec(n.competitionScore)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          {(result.data.pagination.page > 1 ||
            result.data.pagination.hasNext) && (
            <CardFooter className="border-t">
              <Pager
                pagination={result.data.pagination}
                onPage={(page) => apply({ ...filters, page })}
              />
            </CardFooter>
          )}
        </Card>
      )}
    </>
  )
}
