import { StarIcon } from "lucide-react"
import { ApiError } from "@/components/api-error"
import { SourceBadge } from "@/components/source-badge"
import { Badge } from "@/components/ui/badge"
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
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { useI18n } from "@/i18n"
import type { ApiResult, ReviewSummary } from "@/lib/types"

/** The review totals: average, count per star, the most named topics. */
export function ReviewSummaryCard({
  summary,
  bolReviewCount,
  familySwitch,
  ownOnly,
}: {
  summary: ApiResult<ReviewSummary>
  /** The review count of the product from bol (product endpoint), if known. */
  bolReviewCount?: number | null
  familySwitch?: boolean
  ownOnly?: boolean
}) {
  const { m, fill, num, dec } = useI18n()
  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>{m.reviews.summaryTitle}</CardTitle>
        {familySwitch && (
          <CardDescription>
            {ownOnly ? m.reviews.scopeOwnNote : m.reviews.scopeFamilyNote}
          </CardDescription>
        )}
        <CardAction>
          <SourceBadge result={summary} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!summary.ok ? (
          <ApiError error={summary} />
        ) : summary.data.data.reviewCount === 0 ? (
          <Empty className="flex-none border">
            <EmptyHeader>
              <EmptyTitle>{m.reviews.noneTitle}</EmptyTitle>
              <EmptyDescription>
                {bolReviewCount && !(familySwitch && !ownOnly)
                  ? fill(m.reviews.noneFromBol, { n: num(bolReviewCount) })
                  : m.reviews.noneBody}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">
                {dec(summary.data.data.averageRating)}
              </span>
              <span className="text-sm text-muted-foreground">
                {fill(m.reviews.count, {
                  n: num(summary.data.data.reviewCount),
                })}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {[...summary.data.data.ratings]
                .sort((a, b) => b.rating - a.rating)
                .map((r) => (
                  <div
                    key={r.rating}
                    className="grid grid-cols-[2.5rem_1fr_3rem] items-center gap-2 text-sm"
                  >
                    <span className="flex items-center gap-1 tabular-nums">
                      {r.rating} <StarIcon className="size-3" />
                    </span>
                    <Progress
                      value={
                        summary.data.data.reviewCount
                          ? (r.count / summary.data.data.reviewCount) * 100
                          : 0
                      }
                      className="h-1.5"
                    />
                    <span className="text-right text-muted-foreground tabular-nums">
                      {num(r.count)}
                    </span>
                  </div>
                ))}
            </div>
            <Separator />
            <Topics
              title={m.reviews.positive}
              topics={summary.data.data.positiveTopics}
              variant="secondary"
            />
            <Topics
              title={m.reviews.negative}
              topics={summary.data.data.negativeTopics}
              variant="outline"
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function Topics({
  title,
  topics,
  variant,
}: {
  title: string
  topics: { topic: string; count: number }[]
  variant: "secondary" | "outline"
}) {
  const { num } = useI18n()
  if (topics.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {topics.map((t) => (
          <Badge key={t.topic} variant={variant}>
            {t.topic}{" "}
            <span className="text-muted-foreground tabular-nums">
              {num(t.count)}
            </span>
          </Badge>
        ))}
      </div>
    </div>
  )
}
