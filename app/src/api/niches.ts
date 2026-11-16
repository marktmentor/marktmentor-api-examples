// Server functions for Product Research: niches.
import { createServerFn } from "@tanstack/react-start"
import {
  type ListPeriod,
  type Market,
  type NicheFilters,
  type ProductFilters,
  nicheQuery,
  productQuery,
} from "@/lib/filters"
import type {
  HistoryPeriod,
  Interval,
  ReviewQuery,
} from "@/lib/research-params"
import type {
  NicheDetail,
  NicheList,
  ProductDistributions,
  ProductList,
  ReviewHistory,
  ReviewList,
  ReviewSummary,
} from "@/lib/types"
import { apiGet } from "@/server/client"
import { defaultList } from "@/server/defaults"
import { history, niche, reviewParams } from "@/server/research-query"

export const searchNiches = createServerFn({ method: "GET" })
  .validator((input: NicheFilters) => input)
  .handler(async ({ data }) =>
    apiGet<NicheList>("research/niches/", nicheQuery(data))
  )

/** The default list of Niches: highest search volume, NL + BE, 30 days, page 1. */
export const defaultNiches = createServerFn({ method: "GET" }).handler(
  async () => defaultList<NicheList>("research/niches/", nicheQuery({}))
)

/** GET research/niches/{id}/?comparePeriods=true: also metrics for 30d, 90d, 365d */
export const getNicheDetail = createServerFn({ method: "GET" })
  .validator(
    (input: { id: string; market?: Market; period?: ListPeriod }) => input
  )
  .handler(({ data }) =>
    apiGet<{ data: NicheDetail }>(niche(data.id), {
      market: data.market ?? "ALL",
      period: data.period ?? "30d",
      comparePeriods: true,
    })
  )

/** GET research/niches/{id}/products/ with every product filter (paginated) */
export const getNicheProducts = createServerFn({ method: "GET" })
  .validator((input: { id: string; filters: ProductFilters }) => input)
  .handler(({ data }) =>
    apiGet<ProductList>(niche(data.id, "products/"), productQuery(data.filters))
  )

/** GET research/niches/{id}/product-distributions/ (both markets together) */
export const getNicheDistributions = createServerFn({ method: "GET" })
  .validator((input: { id: string; period: "30d" | "90d" | "365d" }) => input)
  .handler(({ data }) =>
    apiGet<ProductDistributions>(niche(data.id, "product-distributions/"), {
      period: data.period,
    })
  )

/** GET research/niches/{id}/reviews/ (paginated) */
export const getNicheReviews = createServerFn({ method: "GET" })
  .validator((input: { id: string } & ReviewQuery) => input)
  .handler(({ data }) =>
    apiGet<ReviewList>(niche(data.id, "reviews/"), reviewParams(data))
  )

/** GET research/niches/{id}/reviews/summary/ */
export const getNicheReviewSummary = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => input)
  .handler(({ data }) =>
    apiGet<ReviewSummary>(niche(data.id, "reviews/summary/"))
  )

/** GET research/niches/{id}/review-history/ */
export const getNicheReviewHistory = createServerFn({ method: "GET" })
  .validator(
    (input: { id: string; period: HistoryPeriod; interval: Interval }) => input
  )
  .handler(({ data }) =>
    apiGet<ReviewHistory>(
      niche(data.id, "review-history/"),
      history(data.period, data.interval)
    )
  )
