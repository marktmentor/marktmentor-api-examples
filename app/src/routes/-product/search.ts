// The URL of a product page: the open tab and its settings.
import {
  LIST_PERIODS,
  type ListPeriod,
  MARKETS,
  type Market,
} from "@/lib/filters"
import {
  type HistoryPeriod,
  type Interval,
  INTERVALS,
  KEYWORD_PERIODS,
  type KeywordPeriod,
  PERIODS,
  type ReviewQuery,
  SELLER_PERIODS,
  type SellerPeriod,
} from "@/lib/research-params"
import { parseReviewSearch } from "@/lib/search-params"

export const PRODUCT_TABS = [
  "sales",
  "visibility",
  "rankings",
  "keywordRankings",
  "keywords",
  "sellers",
  "reviews",
  "variants",
  "snapshots",
] as const
export type ProductTab = (typeof PRODUCT_TABS)[number]

export type ProductSearch = {
  tab?: ProductTab
  market?: Market
  /** Period of the product figures (30d, 90d, 365d). */
  dp?: ListPeriod
  period?: HistoryPeriod
  interval?: Interval
  kw?: KeywordPeriod
  sp?: SellerPeriod
  page?: number
} & Omit<ReviewQuery, "period" | "ownOnly"> & {
    reviewPeriod?: HistoryPeriod
    reviewsOwn?: true
  }

const pick = <T extends string>(list: readonly T[], v: unknown) =>
  list.includes(v as T) ? (v as T) : undefined

export const parseProductSearch = (
  s: Record<string, unknown>
): ProductSearch => ({
  tab: pick(PRODUCT_TABS, s.tab),
  market: pick(MARKETS, s.market),
  dp: pick(LIST_PERIODS, s.dp),
  period: pick(PERIODS, s.period),
  interval: pick(INTERVALS, s.interval),
  kw: pick(KEYWORD_PERIODS, s.kw),
  sp: pick(SELLER_PERIODS, s.sp),
  page: Number(s.page) > 1 ? Number(s.page) : undefined,
  ...parseReviewSearch(s),
})
