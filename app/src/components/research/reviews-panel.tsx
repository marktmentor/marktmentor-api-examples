import { ReviewFilters } from "@/components/research/review-filters"
import { ReviewItems } from "@/components/research/review-list"
import { ReviewSummaryCard } from "@/components/research/review-summary-card"
import { SourceBadge } from "@/components/source-badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useI18n } from "@/i18n"
import type { ReviewQuery } from "@/lib/research-params"
import type { ApiResult, ReviewList, ReviewSummary } from "@/lib/types"

/** Review summary plus the review list with its filters. Used for products and niches. */
export function ReviewsPanel({
  summary,
  list,
  query,
  onQuery,
  bolReviewCount,
  familySwitch,
}: {
  summary: ApiResult<ReviewSummary>
  list: ApiResult<ReviewList>
  query: ReviewQuery
  onQuery: (next: ReviewQuery) => void
  /** The review count of the product from bol (product endpoint), if known. */
  bolReviewCount?: number | null
  /** Products: reviews of the whole family or this EAN only (includeVariants). */
  familySwitch?: boolean
}) {
  const { m } = useI18n()
  return (
    <div className="grid gap-4 @4xl/main:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <ReviewSummaryCard
        summary={summary}
        bolReviewCount={bolReviewCount}
        familySwitch={familySwitch}
        ownOnly={query.ownOnly}
      />
      <Card>
        <CardHeader>
          <CardTitle>{m.reviews.listTitle}</CardTitle>
          <CardDescription>{m.reviews.listDescription}</CardDescription>
          <CardAction>
            <SourceBadge result={list} />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ReviewFilters
            query={query}
            onQuery={onQuery}
            familySwitch={familySwitch}
          />
          <ReviewItems list={list} query={query} onQuery={onQuery} />
        </CardContent>
      </Card>
    </div>
  )
}
