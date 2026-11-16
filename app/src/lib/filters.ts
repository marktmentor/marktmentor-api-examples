// Filters of the product and niche lists, kept in the URL. One definition
// reads the URL, builds the API query and lists the active filters as chips.

export const MARKETS = ["ALL", "NL", "BE"] as const
export type Market = (typeof MARKETS)[number]
export const LIST_PERIODS = ["30d", "90d", "365d"] as const
export type ListPeriod = (typeof LIST_PERIODS)[number]
export const PAGE_SIZES = ["10", "25"] as const

export const PRODUCT_SORTS = [
  "-sales",
  "sales",
  "-revenue",
  "revenue",
  "-price",
  "price",
] as const
export type ProductSort = (typeof PRODUCT_SORTS)[number]
export const NICHE_SORTS = [
  "-volume",
  "volume",
  "-revenue",
  "revenue",
  "-products",
  "products",
] as const
export type NicheSort = (typeof NICHE_SORTS)[number]

/** Range filters of the product lists: [min parameter, max parameter]. */
export const RANGES = {
  sales: ["minSales", "maxSales"],
  revenue: ["minRevenue", "maxRevenue"],
  price: ["minPrice", "maxPrice"],
  rating: ["minRating", "maxRating"],
} as const
export type RangeKey = keyof typeof RANGES
type RangeParam = (typeof RANGES)[RangeKey][number]

export type ProductFilters = {
  q?: string
  ean?: string
  market?: Market
  period?: ListPeriod
  sort?: ProductSort
  brand?: string
  categoryId?: number
  page?: number
  size?: number
} & Partial<Record<RangeParam, number>>

export type NicheFilters = {
  q?: string
  market?: Market
  period?: ListPeriod
  sort?: NicheSort
  categoryId?: number
  page?: number
  size?: number
}

const text = (v: unknown) =>
  v !== undefined && v !== null && v !== "" ? String(v) : undefined
const positive = (v: unknown) => {
  const n = Number(v)
  return v !== undefined && v !== "" && Number.isFinite(n) && n >= 0
    ? n
    : undefined
}
const oneOf = <T extends string>(list: readonly T[], v: unknown) =>
  list.includes(v as T) ? (v as T) : undefined
const page = (v: unknown) => (Number(v) > 1 ? Number(v) : undefined)
const size = (v: unknown) => (Number(v) === 10 ? 10 : undefined)

/** Revenue and price filters and sorting work for market=ALL only (API docs). */
export const allMarketsOnly = (key: string) => /revenue|price/i.test(key)

export function parseProductFilters(
  s: Record<string, unknown>
): ProductFilters {
  const f: ProductFilters = {
    q: text(s.q),
    ean: text(s.ean),
    market: oneOf(MARKETS, s.market),
    period: oneOf(LIST_PERIODS, s.period),
    sort: oneOf(PRODUCT_SORTS, s.sort),
    brand: text(s.brand),
    categoryId: positive(s.categoryId),
    page: page(s.page),
    size: size(s.size),
  }
  for (const [min, max] of Object.values(RANGES)) {
    f[min] = positive(s[min])
    f[max] = positive(s[max])
  }
  return f
}

export function parseNicheFilters(s: Record<string, unknown>): NicheFilters {
  return {
    q: text(s.q),
    market: oneOf(MARKETS, s.market),
    period: oneOf(LIST_PERIODS, s.period),
    sort: oneOf(NICHE_SORTS, s.sort),
    categoryId: positive(s.categoryId),
    page: page(s.page),
    size: size(s.size),
  }
}

/** The query for research/products/ and research/niches/{id}/products/. */
export function productQuery(f: ProductFilters) {
  const market = f.market ?? "ALL"
  const q: Record<string, unknown> = {
    search: f.q,
    ean: f.ean,
    market,
    period: f.period ?? "30d",
    sort: f.sort,
    brand: f.brand,
    categoryId: f.categoryId,
    page: f.page ?? 1,
    pageSize: f.size ?? 25,
  }
  for (const [min, max] of Object.values(RANGES)) {
    q[min] = f[min]
    q[max] = f[max]
  }
  if (market !== "ALL") {
    // Not supported per market: leave them out instead of getting HTTP 400.
    for (const k of Object.keys(q))
      if (allMarketsOnly(k) && k !== "pageSize") delete q[k]
    if (q.sort && allMarketsOnly(String(q.sort))) delete q.sort
  }
  return q
}

export function nicheQuery(f: NicheFilters) {
  return {
    search: f.q,
    market: f.market ?? "ALL",
    period: f.period ?? "30d",
    sort: f.sort,
    categoryId: f.categoryId,
    page: f.page ?? 1,
    pageSize: f.size ?? 25,
  }
}

/** Filters behind "More filters", for the chips and the counter. */
export const MORE_PRODUCT_FILTERS = [
  "brand",
  "categoryId",
  ...Object.values(RANGES).flat(),
] as const satisfies readonly (keyof ProductFilters)[]

export function activeMore(f: ProductFilters) {
  return MORE_PRODUCT_FILTERS.filter((k) => f[k] !== undefined)
}

/** True when the URL has no search, filter, sort or page: show the default list. */
export function isDefaultView(f: Record<string, unknown>) {
  return Object.values(f).every((v) => v === undefined)
}
