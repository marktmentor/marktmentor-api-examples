// The URL of a niche page: the open tab and its filters.
import {
  LIST_PERIODS,
  type ListPeriod,
  type ProductFilters,
  parseProductFilters,
} from "@/lib/filters"
import {
  type HistoryPeriod,
  type Interval,
  INTERVALS,
  PERIODS,
  type ReviewQuery,
} from "@/lib/research-params"
import { parseReviewSearch } from "@/lib/search-params"

export const NICHE_TABS = [
  "products",
  "periods",
  "distributions",
  "reviews",
  "reviewHistory",
] as const
export type NicheTab = (typeof NICHE_TABS)[number]

export type NicheSearch = ProductFilters & {
  score?: number
  verified?: boolean
  search?: string
  reviewPeriod?: HistoryPeriod
  /** Review sort; products use `sort`. */
  rsort?: ReviewQuery["sort"]
  tab?: NicheTab
  dist?: ListPeriod
  hp?: HistoryPeriod
  interval?: Interval
}

/** Each tab has its own filters: these keys reset when you change tab. */
export const NICHE_TAB_KEYS = [
  "q",
  "ean",
  "brand",
  "categoryId",
  "minSales",
  "maxSales",
  "minRevenue",
  "maxRevenue",
  "minPrice",
  "maxPrice",
  "minRating",
  "maxRating",
  "sort",
  "page",
  "size",
  "score",
  "verified",
  "search",
  "reviewPeriod",
  "rsort",
] as const

const pick = <T extends string>(list: readonly T[], v: unknown) =>
  list.includes(v as T) ? (v as T) : undefined

export function parseNicheSearch(s: Record<string, unknown>): NicheSearch {
  const review = parseReviewSearch(s)
  return {
    ...parseProductFilters(s),
    score: review.score,
    reviewPeriod: review.reviewPeriod,
    verified: review.verified,
    search: review.search,
    rsort: pick(["date", "-date", "score", "-score"] as const, s.rsort),
    tab: pick(NICHE_TABS, s.tab),
    dist: pick(LIST_PERIODS, s.dist),
    hp: pick(PERIODS, s.hp),
    interval: pick(INTERVALS, s.interval),
  }
}
