import { StarIcon } from "lucide-react"
import { ApiError } from "@/components/api-error"
import { Pager } from "@/components/research/pager"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { useI18n } from "@/i18n"
import type { ReviewQuery } from "@/lib/research-params"
import type { ApiResult, ReviewList } from "@/lib/types"

/** The reviews of one page, with the pager. */
export function ReviewItems({
  list,
  query,
  onQuery,
}: {
  list: ApiResult<ReviewList>
  query: ReviewQuery
  onQuery: (next: ReviewQuery) => void
}) {
  const { m, fill, date } = useI18n()
  return !list.ok ? (
    <ApiError error={list} />
  ) : list.data.data.length === 0 ? (
    <Empty className="flex-none border">
      <EmptyHeader>
        <EmptyTitle>
          {query.score || query.verified || query.search
            ? m.reviews.empty
            : m.reviews.noneTitle}
        </EmptyTitle>
      </EmptyHeader>
    </Empty>
  ) : (
    <>
      <ul className="flex flex-col divide-y">
        {list.data.data.map((r) => (
          <li key={r.reviewId} className="flex flex-col gap-1 py-3 first:pt-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {r.rating != null && (
                <span
                  className="flex items-center gap-0.5"
                  aria-label={fill(m.reviews.stars, { n: r.rating })}
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <StarIcon
                      key={i}
                      className={
                        i < (r.rating ?? 0)
                          ? "size-3.5 fill-current"
                          : "size-3.5 text-muted-foreground"
                      }
                    />
                  ))}
                </span>
              )}
              {r.title && <span className="font-medium">{r.title}</span>}
              {r.verifiedPurchase && (
                <Badge variant="secondary">{m.reviews.verified}</Badge>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {date(r.date)}
              </span>
            </div>
            {r.text && (
              <p className="text-sm whitespace-pre-line text-muted-foreground">
                {r.text}
              </p>
            )}
            {r.helpfulVotes != null && r.helpfulVotes > 0 && (
              <span className="text-xs text-muted-foreground">
                {fill(m.reviews.helpful, { n: r.helpfulVotes })}
              </span>
            )}
          </li>
        ))}
      </ul>
      <Pager
        pagination={list.data.pagination}
        onPage={(page) => onQuery({ ...query, page })}
      />
    </>
  )
}
