import { DistributionsTab } from "@/components/niche/distributions-tab"
import { PeriodsTable } from "@/components/niche/niche-kpis"
import { ReviewHistoryTab } from "@/components/niche/review-history-tab"
import { ReviewsPanel } from "@/components/research/reviews-panel"
import { useFollow } from "@/hooks/use-follow"
import { reviewQuery, reviewSearch } from "@/lib/search-params"
import type { NicheDetail } from "@/lib/types"
import type { NicheTabData } from "./load-tab"
import { NicheProductsTab } from "./products-tab"
import type { NicheSearch } from "./search"

/** The content of the open tab of a niche page. */
export function NicheTabPanel({
  tab,
  niche: n,
  search,
  tracked,
  go,
  onFilters,
}: {
  tab: NicheTabData
  niche: NicheDetail
  search: NicheSearch
  tracked: Set<string>
  go: (patch: Partial<NicheSearch>) => void
  onFilters: (f: NicheSearch) => void
}) {
  const follow = useFollow()
  const market = search.market ?? "ALL"
  switch (tab.kind) {
    case "products":
      return (
        <NicheProductsTab
          nicheId={n.nicheId}
          result={tab.result}
          filters={search}
          tracked={tracked}
          onToggle={(p) => follow(p, tracked.has(p.productCode))}
          onFilters={onFilters}
          go={go}
        />
      )
    case "periods":
      return <PeriodsTable niche={n} market={market} />
    case "distributions":
      return (
        <DistributionsTab
          result={tab.result}
          period={search.dist ?? "30d"}
          onPeriod={(p) => go({ dist: p === "30d" ? undefined : p })}
        />
      )
    case "reviews":
      return (
        <ReviewsPanel
          summary={tab.summary}
          list={tab.list}
          query={reviewQuery({ ...search, sort: search.rsort })}
          onQuery={(q) =>
            go({ ...reviewSearch(q), sort: undefined, rsort: q.sort })
          }
        />
      )
    case "reviewHistory":
      return (
        <ReviewHistoryTab
          result={tab.result}
          period={search.hp ?? "3M"}
          interval={search.interval ?? "month"}
          onChange={({ period, interval }) => go({ hp: period, interval })}
        />
      )
  }
}
