// Server functions for Product Research: niches.
import { createServerFn } from "@tanstack/react-start"
import {
  LIST_PERIODS,
  type ListPeriod,
  type Market,
  type NicheFilters,
  type ProductFilters,
  nicheQuery,
  productQuery,
} from "@/lib/filters"
import {
  fields,
  historyScope,
  listScope,
  nicheFilters,
  nicheId as checkNicheId,
  productFilters,
  required,
  reviewQuery,
} from "@/lib/input"
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
import { history, niche, nicheId, reviewParams } from "@/server/research-query"

export const searchNiches = createServerFn({ method: "GET" })
  .validator((input: NicheFilters) => nicheFilters(input))
  .handler(async ({ data }) =>
    apiGet<NicheList>("research/niches/", nicheQuery(data), (mm) =>
      mm.niches.list(nicheQuery(data))
    )
  )

/** The default list of Niches: highest search volume, NL + BE, 30 days, page 1. */
export const defaultNiches = createServerFn({ method: "GET" }).handler(
  async () =>
    defaultList<NicheList>("research/niches/", nicheQuery({}), (mm) =>
      mm.niches.list(nicheQuery({}))
    )
)

/** GET research/niches/{id}/?comparePeriods=true: also metrics for 30d, 90d, 365d */
export const getNicheDetail = createServerFn({ method: "GET" })
  .validator((input: { id: string; market?: Market; period?: ListPeriod }) => {
    const o = fields(input)
    return { id: checkNicheId(o.id), ...listScope(o) }
  })
  .handler(({ data }) => {
    const params = {
      market: data.market ?? "ALL",
      period: data.period ?? "30d",
      comparePeriods: true,
    }
    return apiGet<{ data: NicheDetail }>(niche(data.id), params, (mm) =>
      mm.niches.get(nicheId(data.id), params)
    )
  })

/** GET research/niches/{id}/products/ with every product filter (paginated) */
export const getNicheProducts = createServerFn({ method: "GET" })
  .validator((input: { id: string; filters: ProductFilters }) => {
    const o = fields(input)
    return { id: checkNicheId(o.id), filters: productFilters(o.filters) }
  })
  .handler(({ data }) => {
    const params = productQuery(data.filters)
    return apiGet<ProductList>(niche(data.id, "products/"), params, (mm) =>
      mm.niches.products(nicheId(data.id), params)
    )
  })

/** GET research/niches/{id}/product-distributions/ (both markets together) */
export const getNicheDistributions = createServerFn({ method: "GET" })
  .validator((input: { id: string; period: ListPeriod }) => {
    const o = fields(input)
    return {
      id: checkNicheId(o.id),
      period: required(LIST_PERIODS, o.period),
    }
  })
  .handler(({ data }) => {
    const params = { period: data.period }
    return apiGet<ProductDistributions>(
      niche(data.id, "product-distributions/"),
      params,
      (mm) => mm.niches.productDistributions(nicheId(data.id), params)
    )
  })

/** GET research/niches/{id}/reviews/ (paginated) */
export const getNicheReviews = createServerFn({ method: "GET" })
  .validator((input: { id: string } & ReviewQuery) => {
    const o = fields(input)
    return { id: checkNicheId(o.id), ...reviewQuery(o) }
  })
  .handler(({ data }) => {
    const params = reviewParams(data)
    return apiGet<ReviewList>(niche(data.id, "reviews/"), params, (mm) =>
      mm.niches.reviews(nicheId(data.id), params)
    )
  })

/** GET research/niches/{id}/reviews/summary/ */
export const getNicheReviewSummary = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => ({
    id: checkNicheId(fields(input).id),
  }))
  .handler(({ data }) =>
    apiGet<ReviewSummary>(niche(data.id, "reviews/summary/"), {}, (mm) =>
      mm.niches.reviewSummary(nicheId(data.id))
    )
  )

/** GET research/niches/{id}/review-history/ */
export const getNicheReviewHistory = createServerFn({ method: "GET" })
  .validator(
    (input: { id: string; period: HistoryPeriod; interval: Interval }) => {
      const o = fields(input)
      const { period, interval } = historyScope(o)
      return { id: checkNicheId(o.id), period, interval }
    }
  )
  .handler(({ data }) => {
    // Reviews of a niche: both markets together (market ALL only).
    const params = {
      ...history(data.period, data.interval),
      market: "ALL" as const,
    }
    return apiGet<ReviewHistory>(
      niche(data.id, "review-history/"),
      params,
      (mm) => mm.niches.reviewHistory(nicheId(data.id), params)
    )
  })
