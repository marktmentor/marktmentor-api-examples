import type { ReviewQuery } from "./research-params"

/** The URL keys: `period` is taken by the history tabs, so reviews use their own. */
type ReviewSearch = Omit<ReviewQuery, "period" | "ownOnly"> & {
  reviewPeriod?: ReviewQuery["period"]
  reviewsOwn?: true
}

const SORTS = ["date", "-date", "score", "-score"] as const

/** Review filters in the URL: page, score, verified, sort, q. */
export function parseReviewSearch(s: Record<string, unknown>): ReviewSearch {
  const score = Number(s.score)
  const PERIODS = ["3M", "6M", "1Y", "2Y"] as const
  return {
    // `period` is taken by the history tabs: reviews use their own key.
    reviewPeriod: PERIODS.includes(s.reviewPeriod as (typeof PERIODS)[number])
      ? (s.reviewPeriod as ReviewQuery["period"])
      : undefined,
    score: score >= 1 && score <= 5 ? score : undefined,
    verified: s.verified === true || s.verified === "true" ? true : undefined,
    sort: SORTS.includes(s.sort as (typeof SORTS)[number])
      ? (s.sort as ReviewQuery["sort"])
      : undefined,
    search:
      s.search !== undefined && s.search !== "" ? String(s.search) : undefined,
    reviewsOwn:
      s.reviewsOwn === true || s.reviewsOwn === "true" ? true : undefined,
  }
}

export function reviewQuery(s: ReviewSearch): ReviewQuery {
  return {
    period: s.reviewPeriod,
    page: s.page,
    score: s.score,
    verified: s.verified,
    sort: s.sort,
    search: s.search,
    ownOnly: s.reviewsOwn,
  }
}

/** A review query from the panel back to URL keys. */
export function reviewSearch(q: ReviewQuery) {
  return {
    reviewPeriod: q.period,
    page: q.page,
    score: q.score,
    verified: q.verified,
    sort: q.sort,
    search: q.search,
    reviewsOwn: q.ownOnly || undefined,
  }
}
