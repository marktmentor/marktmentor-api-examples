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
import {
  fields,
  flag,
  historyScope,
  listScope,
  productCode,
  productFilters,
  required,
  reviewQuery,
  whole,
} from "@/lib/input"
import {
  KEYWORD_PERIODS,
  type KeywordPeriod,
  type ReviewQuery,
  SELLER_PERIODS,
  type SellerPeriod,
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

/** A product code with the period, interval and market of a history endpoint. */
function historyInput(input: HistoryInput): HistoryInput {
  const o = fields(input)
  return { code: productCode(o.code), ...historyScope(o) }
}

/** GET research/products/ with every filter of the filter bar. */
export const searchProducts = createServerFn({ method: "GET" })
  .validator((input: ProductFilters) => productFilters(input))
  .handler(async ({ data }): Promise<ApiResult<ProductList>> =>
    apiGet<ProductList>("research/products/", productQuery(data), (mm) =>
      mm.products.list(productQuery(data))
    )
  )

/** The default list of Products: best-selling products, NL + BE, 30 days, page 1. */
export const defaultProducts = createServerFn({ method: "GET" }).handler(
  async () =>
    defaultList<ProductList>("research/products/", productQuery({}), (mm) =>
      mm.products.list(productQuery({}))
    )
)

export const getProduct = createServerFn({ method: "GET" })
  .validator(
    (input: { productCode: string; market?: Market; period?: ListPeriod }) => {
      const o = fields(input)
      return { productCode: productCode(o.productCode), ...listScope(o) }
    }
  )
  .handler(async ({ data }) => {
    const market = data.market ?? "ALL"
    const period = data.period ?? "30d"
    const result = await apiGet<{ data: Product }>(
      product(data.productCode),
      { market, period },
      (mm) => mm.products.get(data.productCode, { market, period })
    )
    // Snapshots always use both markets and 30 days, so the days compare.
    if (result.ok && market === "ALL" && period === "30d")
      saveSnapshot(result.data.data)
    return result
  })

export const getSalesHistory = createServerFn({ method: "GET" })
  .validator(historyInput)
  .handler(async ({ data }) => {
    const params = history(data.period, data.interval, data.market)
    return apiGet<History>(product(data.code, "sales-history/"), params, (mm) =>
      mm.products.salesHistory(data.code, params)
    )
  })

/** GET research/products/{code}/visibility-history/ */
export const getVisibilityHistory = createServerFn({ method: "GET" })
  .validator(historyInput)
  .handler(({ data }) => {
    const params = history(data.period, data.interval, data.market)
    return apiGet<VisibilityHistory>(
      product(data.code, "visibility-history/"),
      params,
      (mm) => mm.products.visibilityHistory(data.code, params)
    )
  })

/** GET research/products/{code}/category-rankings/ */
export const getCategoryRankings = createServerFn({ method: "GET" })
  .validator(historyInput)
  .handler(({ data }) => {
    const params = history(data.period, data.interval, data.market)
    return apiGet<CategoryRankings>(
      product(data.code, "category-rankings/"),
      params,
      (mm) => mm.products.categoryRankings(data.code, params)
    )
  })

/**
 * GET research/products/{code}/keyword-rankings/: the 10 keywords with the
 * most search volume (the API default), one position history each.
 */
export const getKeywordRankings = createServerFn({ method: "GET" })
  .validator(historyInput)
  .handler(({ data }) => {
    const params = history(data.period, data.interval, data.market)
    return apiGet<KeywordRankings>(
      product(data.code, "keyword-rankings/"),
      params,
      (mm) => mm.products.keywordRankings(data.code, params)
    )
  })

/** GET research/products/{code}/keywords/ (paginated) */
export const getKeywords = createServerFn({ method: "GET" })
  .validator(
    (input: {
      code: string
      period: KeywordPeriod
      page?: number
      market?: Market
    }) => {
      const o = fields(input)
      return {
        code: productCode(o.code),
        period: required(KEYWORD_PERIODS, o.period),
        page: whole(o.page, 1, 400),
        market: listScope(o).market,
      }
    }
  )
  .handler(({ data }) => {
    const params = {
      market: data.market ?? "ALL",
      period: data.period,
      page: data.page ?? 1,
      pageSize: 25,
    }
    return apiGet<KeywordList>(product(data.code, "keywords/"), params, (mm) =>
      mm.products.keywords(data.code, params)
    )
  })

/** GET research/products/{code}/sellers/: sellers, buy box and listing changes */
export const getSellers = createServerFn({ method: "GET" })
  .validator(
    (input: { code: string; period: SellerPeriod; market?: Market }) => {
      const o = fields(input)
      return {
        code: productCode(o.code),
        period: required(SELLER_PERIODS, o.period),
        market: listScope(o).market,
      }
    }
  )
  .handler(({ data }) => {
    const params = { market: data.market ?? "ALL", period: data.period }
    return apiGet<Sellers>(product(data.code, "sellers/"), params, (mm) =>
      mm.products.sellers(data.code, params)
    )
  })

/** GET research/products/{code}/reviews/ (paginated) */
export const getProductReviews = createServerFn({ method: "GET" })
  .validator((input: { code: string } & ReviewQuery) => {
    const o = fields(input)
    return { code: productCode(o.code), ...reviewQuery(o) }
  })
  .handler(({ data }) => {
    const params = { ...reviewParams(data), ...family(data.ownOnly) }
    return apiGet<ReviewList>(product(data.code, "reviews/"), params, (mm) =>
      mm.products.reviews(data.code, params)
    )
  })

/** GET research/products/{code}/reviews/summary/ */
export const getProductReviewSummary = createServerFn({ method: "GET" })
  .validator((input: { code: string; ownOnly?: boolean }) => {
    const o = fields(input)
    return { code: productCode(o.code), ownOnly: flag(o.ownOnly) }
  })
  .handler(({ data }) => {
    const params = family(data.ownOnly)
    return apiGet<ReviewSummary>(
      product(data.code, "reviews/summary/"),
      params,
      (mm) => mm.products.reviewSummary(data.code, params)
    )
  })

/** GET research/products/?variantsOf={code}: the full product family */
export const getVariants = createServerFn({ method: "GET" })
  .validator((input: { code: string }) => ({
    code: productCode(fields(input).code),
  }))
  .handler(({ data }) => {
    const params = {
      variantsOf: data.code,
      market: "ALL",
      period: "30d",
      pageSize: 25,
    } as const
    return apiGet<ProductList>("research/products/", params, (mm) =>
      mm.products.list(params)
    )
  })
