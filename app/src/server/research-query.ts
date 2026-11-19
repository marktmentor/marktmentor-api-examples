import "@tanstack/react-start/server-only"

// Paths and query parameters of the research endpoints, in one place.
import type { Market } from "@/lib/filters"
import {
  type HistoryPeriod,
  type Interval,
  intervalFor,
  type ReviewQuery,
} from "@/lib/research-params"

export const product = (code: string, endpoint = "") =>
  `research/products/${encodeURIComponent(code)}/${endpoint}`

export const niche = (id: string, endpoint = "") =>
  `research/niches/${encodeURIComponent(id)}/${endpoint}`

/** The niche id as the SDK takes it: a number (the URL gives a string). */
export const nicheId = (id: string) => Number(id)

export const history = (
  period: HistoryPeriod,
  interval: Interval,
  market: Market = "ALL"
) => ({
  market,
  period,
  // week with 2Y gets HTTP 400: send month there (an old URL can still ask it).
  interval: intervalFor(period, interval),
})

export const reviewParams = (q: ReviewQuery) => ({
  market: "ALL" as const,
  period: q.period ?? "1Y",
  page: q.page ?? 1,
  pageSize: 10,
  score: q.score,
  verified: q.verified,
  sort: q.sort ?? "-date",
  search: q.search,
})

/**
 * includeVariants: leave it out for the API default, the
 * whole product family; send false for the reviews of this product only.
 */
export const family = (ownOnly?: boolean) =>
  ownOnly ? { includeVariants: false } : {}

export type HistoryInput = {
  code: string
  period: HistoryPeriod
  interval: Interval
  market?: Market
}
