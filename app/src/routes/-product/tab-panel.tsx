import { KeywordsTab } from "@/components/product/keywords-tab"
import {
  KeywordRankingsTab,
  RankingsTab,
} from "@/components/product/rankings-tab"
import { SalesTab } from "@/components/product/sales-tab"
import { SellersTab } from "@/components/product/sellers-tab"
import { SnapshotsTab } from "@/components/product/snapshots-tab"
import { VariantsTab } from "@/components/product/variants-tab"
import { VisibilityTab } from "@/components/product/visibility-tab"
import { ReviewsPanel } from "@/components/research/reviews-panel"
import { reviewQuery, reviewSearch } from "@/lib/search-params"
import type { Product } from "@/lib/types"
import type { ProductTabData } from "./load-tab"
import type { ProductSearch } from "./search"

/** The content of the open tab of a product page. */
export function ProductTabPanel({
  tab,
  product: p,
  search,
  go,
}: {
  tab: ProductTabData
  product: Product
  search: ProductSearch
  go: (patch: Partial<ProductSearch>) => void
}) {
  const history = {
    period: search.period ?? "3M",
    interval: search.interval ?? "month",
  } as const
  switch (tab.kind) {
    case "sales":
      return (
        <SalesTab result={tab.result} ean={p.ean} {...history} onChange={go} />
      )
    case "visibility":
      return <VisibilityTab result={tab.result} {...history} onChange={go} />
    case "rankings":
      return (
        <RankingsTab
          result={tab.result}
          categoryNames={Object.fromEntries(
            (p.categories ?? []).map((c) => [c.categoryId, c.name])
          )}
          {...history}
          onChange={go}
        />
      )
    case "keywordRankings":
      return (
        <KeywordRankingsTab result={tab.result} {...history} onChange={go} />
      )
    case "keywords":
      return (
        <KeywordsTab
          result={tab.result}
          period={search.kw ?? "30d"}
          onPeriod={(kw) => go({ kw, page: undefined })}
          onPage={(page) => go({ page })}
        />
      )
    case "sellers":
      return (
        <SellersTab
          result={tab.result}
          period={search.sp ?? "90d"}
          onPeriod={(sp) => go({ sp })}
        />
      )
    case "reviews":
      return (
        <ReviewsPanel
          summary={tab.summary}
          list={tab.list}
          query={reviewQuery(search)}
          onQuery={(q) => go(reviewSearch(q))}
          bolReviewCount={p.reviewCount}
          familySwitch
        />
      )
    case "variants":
      return <VariantsTab result={tab.result} current={p.productCode} />
    case "snapshots":
      return <SnapshotsTab snapshots={tab.snapshots} />
  }
}
