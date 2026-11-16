// Types shared by the server functions and the pages. No secrets here.

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

export type Pagination = {
  page: number
  pageSize: number
  total: number | null
  hasNext: boolean
}
export type MarketMetrics = {
  price?: number | null
  sales?: number | null
  revenue?: number | null
  impressions?: number | null
  sellerCount?: number | null
  searchVolume?: number | null
}
export type Product = {
  productCode: string
  ean: string
  title: string
  brand?: string | null
  imageUrl?: string | null
  rating?: number | null
  reviewCount?: number | null
  updatedAt?: string
  categories?: { categoryId: number; name: string }[]
  markets: Partial<Record<"NL" | "BE", MarketMetrics>>
  // Product details only:
  familyName?: string | null
  availableSince?: string | null
  mainCategoryPosition?: number | null
  lvbPossible?: boolean | null
  dimensions?: {
    lengthCm: number | null
    widthCm: number | null
    heightCm: number | null
    weightGrams: number | null
    packageType: string | null
  } | null
  commission?: {
    priceBelow: number | null
    fixed: number
    percentage: number
  }[]
  variantCodes?: string[]
}
export type ProductList = { pagination: Pagination; data: Product[] }
export type HistoryPoint = {
  date: string
  markets: Partial<Record<"NL" | "BE", MarketMetrics>>
}
export type History = { period: string; interval: string; data: HistoryPoint[] }
export type Niche = {
  nicheId: string
  name: string
  productCount?: number
  qualityScore?: number | null
  competitionScore?: number | null
  markets: Partial<Record<"NL" | "BE", MarketMetrics>>
}
export type NicheList = { pagination: Pagination; data: Niche[] }
export type Usage = {
  organization: { id: number; name: string }
  credential: string
  plan: "bundle" | "free" | "unmetered" | "none"
  bundle: null | {
    includedRequests: number
    usedRequests: number
    remainingRequests: number
    periodEnd: string
  }
  /** The free monthly requests (Premium without a bundle). Null when blocked. */
  freeTier: null | {
    eligible: boolean
    limit: number
    used: number
    remaining: number
    pageSize: number
    resetsAt: string
  }
}
export type StoreOverview = {
  period: { startDate: string; endDate: string; days: number }
  kpis: Record<string, number>
  previous: Record<string, number>
  changePct: Record<string, number | null>
}
export type StoreProduct = {
  ean: string
  title: string
  sales: number
  revenue: number
  totalProfits: number
  /** Percentages with 2 decimals (43.75 = 43.75 %). */
  totalMargin: number | null
  salesRoi: number | null
  conversion: number | null
  acos: number | null
  hasProductCosts: boolean
}
export type StoreProducts = {
  data: StoreProduct[]
  pagination: Pagination & { totalMayBeCapped?: boolean }
  costsVisible: boolean
}
export type StockRow = {
  ean: string
  title: string
  stock: number | null
  stockState: string
  unknownReason: string | null
}
export type StoreInventory = {
  data: StockRow[]
  pagination: Pagination
  counts: Record<string, number>
  countsScope?: string
}
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

type Markets<T> = Partial<Record<"NL" | "BE", T>>

export type VisibilityHistory = {
  period: string
  interval: string
  data: {
    date: string
    markets: Markets<{
      categoryImpressions: number | null
      keywordImpressions: number | null
    }>
  }[]
}
export type CategoryRankings = {
  period: string
  interval: string
  data: {
    categoryId: number
    history: { date: string; positions: Markets<number | null> }[]
  }[]
}
export type KeywordRankings = {
  period: string
  interval: string
  data: {
    keywordId: string
    /** Null when the product has no position on the term in keywords/. */
    keyword: string | null
    history: { date: string; positions: Markets<number | null> }[]
  }[]
}
export type KeywordList = {
  pagination: Pagination
  data: {
    keywordId: string
    keyword: string
    markets: Markets<{ searchVolume: number | null; position: number | null }>
  }[]
}
export type Sellers = {
  period: string
  hasMore: boolean
  markets: Markets<{
    buyBoxSellerCount: number | null
    buyBoxTakeovers: number | null
    averageHoursInBuyBox: number | null
  }>
  listingChanges: { mainImage: number; title: number; description: number }
  data: {
    sellerCode: string
    name: string
    rating: number | null
    markets: Markets<{
      buyBoxShare: number | null
      averagePrice: number | null
      deliveryDays: number | null
    }>
  }[]
}
export type Review = {
  reviewId: string
  productCode: string
  rating: number
  title: string | null
  text: string | null
  date: string
  verifiedPurchase: boolean
  helpfulVotes: number
}
export type ReviewList = { pagination: Pagination; data: Review[] }
export type ReviewSummary = {
  data: {
    averageRating: number | null
    reviewCount: number
    ratings: { rating: number; count: number }[]
    positiveTopics: { topic: string; count: number }[]
    negativeTopics: { topic: string; count: number }[]
  }
}
export type ReviewHistory = {
  data: {
    reviews: {
      date: string
      reviewCount: number
      averageRating: number | null
    }[]
  }
}
export type ProductDistributions = {
  period: string
  data: {
    productCount: number
    total: Record<
      "price" | "sales" | "revenue",
      {
        fromValue: number | null
        toValue: number | null
        productCount: number
      }[]
    >
  }
}
export type NicheDetail = Niche & {
  periods?: { period: string; markets: Markets<MarketMetrics> }[]
}

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
