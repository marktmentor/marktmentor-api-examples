// Server functions for Product Research: products. Each research call is one
// research request, or free when today's answer is in the local cache. A
// product page calls only the endpoint of the tab that is open.
import { createServerFn } from "@tanstack/react-start"
import {
  type ListPeriod,
  type Market,
  type ProductFilters,
  productQuery,
} from "@/lib/filters"
import type {
  HistoryPeriod,
  Interval,
  ReviewQuery,
} from "@/lib/research-params"
import type {
  ApiResult,
  CategoryRankings,
  History,
  KeywordList,
  KeywordRankings,
  Product,
  ProductList,
  ReviewList,
  ReviewSummary,
  Sellers,
  VisibilityHistory,
} from "@/lib/types"
import { apiGet } from "@/server/client"
import { defaultList } from "@/server/defaults"
import {
  type HistoryInput,
  family,
  history,
  product,
  reviewParams,
} from "@/server/research-query"
import { saveSnapshot } from "@/server/snapshots"

/** GET research/products/ with every filter of the filter bar. */
export const searchProducts = createServerFn({ method: "GET" })
  .validator((input: ProductFilters) => input)
  .handler(async ({ data }): Promise<ApiResult<ProductList>> =>
    apiGet<ProductList>("research/products/", productQuery(data))
  )

/** The default list of Products: best-selling products, NL + BE, 30 days, page 1. */
export const defaultProducts = createServerFn({ method: "GET" }).handler(
  async () => defaultList<ProductList>("research/products/", productQuery({}))
)

export const getProduct = createServerFn({ method: "GET" })
  .validator(
    (input: {
      productCode: string
      market?: Market
      period?: ListPeriod
      refresh?: boolean
    }) => input
  )
  .handler(async ({ data }) => {
    const market = data.market ?? "ALL"
    const period = data.period ?? "30d"
    const result = await apiGet<{ data: Product }>(
      `research/products/${encodeURIComponent(data.productCode)}/`,
      { market, period },
      { refresh: data.refresh }
    )
    // Snapshots always use both markets and 30 days, so the days compare.
    if (result.ok && market === "ALL" && period === "30d")
      saveSnapshot(result.data.data)
    return result
  })

export const getSalesHistory = createServerFn({ method: "GET" })
  .validator(
    (input: {
      productCode: string
      period: HistoryPeriod
      interval: Interval
      market?: Market
    }) => input
  )
  .handler(async ({ data }) =>
    apiGet<History>(
      product(data.productCode, "sales-history/"),
      history(data.period, data.interval, data.market)
    )
  )

/** GET research/products/{code}/visibility-history/ */
export const getVisibilityHistory = createServerFn({ method: "GET" })
  .validator((input: HistoryInput) => input)
  .handler(({ data }) =>
    apiGet<VisibilityHistory>(
      product(data.code, "visibility-history/"),
      history(data.period, data.interval, data.market)
    )
  )

/** GET research/products/{code}/category-rankings/ */
export const getCategoryRankings = createServerFn({ method: "GET" })
  .validator((input: HistoryInput) => input)
  .handler(({ data }) =>
    apiGet<CategoryRankings>(
      product(data.code, "category-rankings/"),
      history(data.period, data.interval, data.market)
    )
  )

/**
 * GET research/products/{code}/keyword-rankings/: the 10 keywords with the
 * most search volume (the API default), one position history each.
 */
export const getKeywordRankings = createServerFn({ method: "GET" })
  .validator((input: HistoryInput) => input)
  .handler(({ data }) =>
    apiGet<KeywordRankings>(
      product(data.code, "keyword-rankings/"),
      history(data.period, data.interval, data.market)
    )
  )

/** GET research/products/{code}/keywords/ (paginated) */
export const getKeywords = createServerFn({ method: "GET" })
  .validator(
    (input: {
      code: string
      period: "7d" | "30d" | "90d"
      page?: number
      market?: Market
    }) => input
  )
  .handler(({ data }) =>
    apiGet<KeywordList>(product(data.code, "keywords/"), {
      market: data.market ?? "ALL",
      period: data.period,
      page: data.page ?? 1,
      pageSize: 25,
    })
  )

/** GET research/products/{code}/sellers/: sellers, buy box and listing changes */
export const getSellers = createServerFn({ method: "GET" })
  .validator(
    (input: {
      code: string
      period: "90d" | "180d" | "365d" | "730d"
      market?: Market
    }) => input
  )
  .handler(({ data }) =>
    apiGet<Sellers>(product(data.code, "sellers/"), {
      market: data.market ?? "ALL",
      period: data.period,
    })
  )

/** GET research/products/{code}/reviews/ (paginated) */
export const getProductReviews = createServerFn({ method: "GET" })
  .validator((input: { code: string } & ReviewQuery) => input)
  .handler(({ data }) =>
    apiGet<ReviewList>(product(data.code, "reviews/"), {
      ...reviewParams(data),
      ...family(data.ownOnly),
    })
  )

/** GET research/products/{code}/reviews/summary/ */
export const getProductReviewSummary = createServerFn({ method: "GET" })
  .validator((input: { code: string; ownOnly?: boolean }) => input)
  .handler(({ data }) =>
    apiGet<ReviewSummary>(
      product(data.code, "reviews/summary/"),
      family(data.ownOnly)
    )
  )

/** GET research/products/?variantsOf={code}: the full product family */
export const getVariants = createServerFn({ method: "GET" })
  .validator((input: { code: string }) => input)
  .handler(({ data }) =>
    apiGet<ProductList>("research/products/", {
      variantsOf: data.code,
      market: "ALL",
      period: "30d",
      pageSize: 25,
    })
  )
