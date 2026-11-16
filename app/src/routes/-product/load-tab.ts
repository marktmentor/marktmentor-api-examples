// The request(s) of the open tab only: a closed tab costs nothing.
import {
  getCategoryRankings,
  getKeywordRankings,
  getKeywords,
  getProductReviewSummary,
  getProductReviews,
  getSalesHistory,
  getSellers,
  getVariants,
  getVisibilityHistory,
} from "@/api/products"
import { listTracked } from "@/api/tracked"
import { reviewQuery } from "@/lib/search-params"
import type { ProductSearch } from "./search"

export async function loadProductTab(code: string, s: ProductSearch) {
  const market = s.market ?? "ALL"
  const period = s.period ?? "3M"
  const interval = s.interval ?? "month"
  switch (s.tab ?? "sales") {
    case "sales":
      return {
        kind: "sales" as const,
        result: await getSalesHistory({
          data: { productCode: code, period, interval, market },
        }),
      }
    case "visibility":
      return {
        kind: "visibility" as const,
        result: await getVisibilityHistory({
          data: { code, period, interval, market },
        }),
      }
    case "rankings":
      return {
        kind: "rankings" as const,
        result: await getCategoryRankings({
          data: { code, period, interval, market },
        }),
      }
    case "keywordRankings":
      return {
        kind: "keywordRankings" as const,
        result: await getKeywordRankings({
          data: { code, period, interval, market },
        }),
      }
    case "keywords":
      return {
        kind: "keywords" as const,
        result: await getKeywords({
          data: { code, period: s.kw ?? "30d", page: s.page, market },
        }),
      }
    case "sellers":
      return {
        kind: "sellers" as const,
        result: await getSellers({
          data: { code, period: s.sp ?? "90d", market },
        }),
      }
    case "reviews":
      return {
        kind: "reviews" as const,
        summary: await getProductReviewSummary({
          data: { code, ownOnly: s.reviewsOwn },
        }),
        list: await getProductReviews({ data: { code, ...reviewQuery(s) } }),
      }
    case "variants":
      return {
        kind: "variants" as const,
        result: await getVariants({ data: { code } }),
      }
    case "snapshots":
      return {
        kind: "snapshots" as const,
        snapshots:
          (await listTracked()).find((t) => t.productCode === code)
            ?.snapshots ?? [],
      }
  }
}

export type ProductTabData = Awaited<ReturnType<typeof loadProductTab>>
