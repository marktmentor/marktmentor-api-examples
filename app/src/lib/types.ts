// Types shared by the server functions and the pages. No secrets here.
// The API answers use the types of the SDK (MarktMentor.*) under a short
// name; the other types belong to this app (results, limits, local data).
import type { MarktMentor } from "@marktmentor/api"

export type Mode = "live" | "demo"

export type ApiSuccess<T> = {
  ok: true
  data: T
  fromCache: boolean
  fetchedAt: string
  mode: Mode
}
export type ApiFailure = {
  ok: false
  status: number
  code: string
  detail: string
  left?: number
  reserve?: number
  errors?: Record<string, string[]>
  retryAfter?: number
  requestId?: string | null
  /** The answer came from the public test key (header X-MarktMentor-Test-Key). */
  testKey?: boolean
}
export type ApiResult<T> = ApiSuccess<T> | ApiFailure

export type Quota = {
  researchLimit?: number
  researchRemaining?: number
  researchReset?: string
  rateLimit?: number
  rateRemaining?: number
  /** The plan from /usage/: "unmetered" means research without a counted bundle. */
  plan?: string
  updatedAt?: string
}

export type Bucket = "research" | "store" | "account" | "reference"
export type RateWindow = {
  limit: number
  remaining: number
  /** When the window has room again (from RateLimit-Reset or Retry-After). */
  resetAt: string
  updatedAt: string
}
export type Rates = Partial<Record<Bucket, RateWindow>>
export type RequestLogRow = {
  id: number
  at: string
  path: string
  status: number
  fromCache: number
  bucket: Bucket | null
  rateLimit: number | null
  rateRemaining: number | null
  retryAfter: number | null
  requestId: string | null
}

export type Pagination = MarktMentor.Pagination
export type MarketMetrics = MarktMentor.ProductMarketMetrics
export type Product = MarktMentor.ProductItem &
  Partial<Pick<MarktMentor.ProductDetail, "variantCodes">>
export type ProductList = MarktMentor.ProductListResponse
export type HistoryPoint = MarktMentor.SalesHistoryPoint
export type History = MarktMentor.SalesHistoryResponse
export type Niche = MarktMentor.NicheItem
export type NicheList = MarktMentor.NicheListResponse
export type Usage = MarktMentor.Usage
export type StoreOverview = MarktMentor.StoreOverviewResponse
export type StoreProduct = MarktMentor.StorePerformanceProductPerformanceItem
export type StoreProducts = MarktMentor.StoreProductsResponse
export type StockRow = MarktMentor.StoreInventoryRow
export type StoreInventory = MarktMentor.StoreInventoryResponse
export type TrackedProduct = {
  productCode: string
  ean: string | null
  title: string | null
  addedAt: string
  snapshots: {
    day: string
    market: string
    price: number | null
    sales: number | null
    revenue: number | null
  }[]
}
export type Status = {
  mode: Mode
  baseUrl: string
  reserve: number
  keyHint: string | null
  quota: Quota | null
  usage: ApiResult<Usage>
  organizations: ApiResult<{ id: number; name: string }[]>
  localRows: {
    cache: number
    tracked: number
    snapshots: number
    requests: number
  }
  researchToday: { live: number; cached: number }
}

// -- product and niche detail endpoints ---------------------------------------

export type VisibilityHistory = MarktMentor.VisibilityHistoryResponse
export type CategoryRankings = MarktMentor.CategoryRankingsResponse
export type KeywordRankings = MarktMentor.KeywordRankingsResponse
export type KeywordList = MarktMentor.KeywordResponse
export type Sellers = MarktMentor.SellerResponse
export type Review = MarktMentor.ReviewItem
export type ReviewList = MarktMentor.ReviewListResponse
export type ReviewSummary = MarktMentor.ReviewSummaryResponse
export type ReviewHistory = MarktMentor.NicheHistoryResponse
export type ProductDistributions = MarktMentor.NicheDistributionsResponse
export type NicheDetail = MarktMentor.NicheDetail
export type TrendPoint = {
  date: string
  sales: number | null
  revenue: number | null
}
export type OverviewProduct = {
  productCode: string
  ean: string | null
  title: string | null
  imageUrl: string | null
  /** The last snapshot: NL + BE sales and revenue (30 days), NL price. */
  sales: number | null
  revenue: number | null
  price: number | null
  day: string | null
  /** Monthly sales history from the cache (no request), or null when not loaded. */
  trend: TrendPoint[] | null
  /** False when the trend is missing or from an earlier month: Load trends fetches it. */
  trendCurrent: boolean
  /** Sales in the last full month and the month before (from the trend). */
  lastSales: number | null
  prevSales: number | null
  /** Relative change, to rank risers and fallers. */
  change: number | null
}
export type Overview = {
  products: OverviewProduct[]
  store: ApiResult<StoreOverview>
  /** Best sellers to follow, when the watchlist is empty. */
  suggestions:
    | { kind: "result"; result: ApiResult<ProductList> }
    | { kind: "skipped"; reason: SkipReason }
    | null
}

/** Why a page did not fetch its default list. */
export type SkipReason = "noAccess" | "paymentFailed" | "reserve"
