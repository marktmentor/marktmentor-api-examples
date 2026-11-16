// Parameters of the research detail endpoints, shared by pages and server.

/** Period and interval of the history endpoints (3M and month by default, as in the API). */
export const PERIODS = ["3M", "6M", "1Y", "2Y"] as const
export const INTERVALS = ["month", "week"] as const
export const KEYWORD_PERIODS = ["7d", "30d", "90d"] as const
export type KeywordPeriod = (typeof KEYWORD_PERIODS)[number]
export const SELLER_PERIODS = ["90d", "180d", "365d", "730d"] as const
export type SellerPeriod = (typeof SELLER_PERIODS)[number]

export type HistoryPeriod = "3M" | "6M" | "1Y" | "2Y"

export type Interval = (typeof INTERVALS)[number]

/** The intervals the API accepts for a period: two years only per month. */
export const intervalsFor = (period: HistoryPeriod): readonly Interval[] =>
  period === "2Y" ? ["month"] : INTERVALS

/** The interval to send: week falls back to month where the API refuses it. */
export const intervalFor = (
  period: HistoryPeriod,
  interval: Interval | undefined
): Interval =>
  interval && intervalsFor(period).includes(interval) ? interval : "month"

export type ReviewQuery = {
  /** Review period (3M default in the API; 1Y here so a list is rarely empty). */
  period?: HistoryPeriod
  page?: number
  score?: number
  verified?: boolean
  sort?: "date" | "-date" | "score" | "-score"
  search?: string
  /** Products only: includeVariants=false (only the reviews of this EAN). */
  ownOnly?: boolean
}
