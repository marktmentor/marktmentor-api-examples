// The overview: what you follow. Reads the local database and the cache only,
// except the store summary (free). Trend lines cost one research request per
// product, and only when you ask for them (a button, or when you follow).
import { createServerFn } from "@tanstack/react-start"
import { cachedAnswer } from "@/server/cache"
import { apiGet } from "@/server/client"
import { config } from "@/server/config"
import { getDb } from "@/server/db"
import { defaultList } from "@/server/defaults"
import { owner } from "@/server/owner"
import { product } from "@/server/research-query"
import { trackedCodes } from "@/server/tracked"
import { productQuery } from "@/lib/filters"
import { fields, productCodes } from "@/lib/input"
import { marketValue, sumMarkets } from "@/lib/markets"
import type {
  History,
  Overview,
  OverviewProduct,
  ProductList,
  StoreOverview,
  TrendPoint,
} from "@/lib/types"

/** The trend request: one year per month. Keep it equal to the call below, or the cache misses. */
const TREND = { market: "ALL", period: "1Y", interval: "month" } as const
const trendPath = (code: string) => product(code, "sales-history/")

const month = (iso: string) => iso.slice(0, 7)

/**
 * The trend line from the last stored answer. Only months that were over when
 * the answer was fetched: a month that was still running would look like a
 * drop, also when the answer is read again a month later.
 */
function trendOf(code: string): TrendPoint[] | null {
  const cached = cachedAnswer<History>(trendPath(code), TREND)
  if (!cached) return null
  const fetchedMonth = month(cached.fetchedAt)
  return cached.data.data
    .filter((p) => month(p.date) < fetchedMonth)
    .map((p) => ({
      date: p.date,
      sales: marketValue(p.markets, "sales"),
      revenue: marketValue(p.markets, "revenue"),
    }))
}

/** A trend is current when it was fetched this month: it has the last full month. */
function trendIsCurrent(code: string) {
  const cached = cachedAnswer<History>(trendPath(code), TREND)
  return (
    cached !== null &&
    month(cached.fetchedAt) === month(new Date().toISOString())
  )
}

/** The last two full months: for the change badge and to rank risers and fallers. */
function lastTwo(trend: TrendPoint[] | null) {
  if (!trend || trend.length < 2)
    return { lastSales: null, prevSales: null, change: null }
  const [prev, last] = trend.slice(-2)
  const lastSales = last.sales ?? 0
  const prevSales = prev.sales ?? 0
  // Relative change for ranking only; the badge applies lib/change.ts.
  return {
    lastSales,
    prevSales,
    change: ((lastSales - prevSales) / Math.max(prevSales, 1)) * 100,
  }
}

/** A photo for a product followed before photos were kept, from the cache. */
function imageFromCache(code: string): string | null {
  const rows = getDb()
    .prepare(
      "select body from api_cache where mode = ? and path like 'research/%' order by fetched_at desc limit 200"
    )
    .all(config().mode) as { body: string }[]
  for (const row of rows) {
    const body = JSON.parse(row.body) as { data?: unknown }
    const list = Array.isArray(body.data) ? body.data : [body.data]
    const found = list.find(
      (p) => (p as { productCode?: string } | null)?.productCode === code
    ) as { imageUrl?: string | null } | undefined
    if (found?.imageUrl) {
      getDb()
        .prepare(
          "update tracked_products set image_url = ? where owner = ? and product_code = ?"
        )
        .run(found.imageUrl, owner(), code)
      return found.imageUrl
    }
  }
  return null
}

export const getOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<Overview> => {
    const who = owner()
    const db = getDb()
    const rows = db
      .prepare(
        "select product_code, ean, title, image_url from tracked_products where owner = ? order by added_at desc"
      )
      .all(who) as {
      product_code: string
      ean: string | null
      title: string | null
      image_url: string | null
    }[]
    const lastDay = db.prepare(
      "select day, market, price, sales, revenue from product_snapshots where owner = ? and product_code = ? and day = (select max(day) from product_snapshots where owner = ? and product_code = ?)"
    )
    const products: OverviewProduct[] = rows.map((r) => {
      const snap = lastDay.all(who, r.product_code, who, r.product_code) as {
        day: string
        market: string
        price: number | null
        sales: number | null
        revenue: number | null
      }[]
      const nl = snap.find((s) => s.market === "NL")
      const be = snap.find((s) => s.market === "BE")
      const trend = trendOf(r.product_code)
      // A product followed before photos were kept: take the photo from the cache.
      const imageUrl = r.image_url ?? imageFromCache(r.product_code)
      return {
        productCode: r.product_code,
        ean: r.ean,
        title: r.title,
        imageUrl,
        sales: sumMarkets(nl?.sales, be?.sales),
        revenue: sumMarkets(nl?.revenue, be?.revenue),
        price: nl?.price ?? be?.price ?? null,
        day: snap[0]?.day ?? null,
        trend,
        trendCurrent: trendIsCurrent(r.product_code),
        ...lastTwo(trend),
      }
    })
    // Store requests are free and need no bundle.
    const store = await apiGet<StoreOverview>(
      "store/overview/",
      { days: 30 },
      (mm) => mm.store.overview({ days: 30 })
    )
    // An empty watchlist: suggest best sellers from the same default list as
    // on Products (one request a day, or the cache).
    const suggestions =
      products.length === 0
        ? await defaultList<ProductList>(
            "research/products/",
            productQuery({}),
            (mm) => mm.products.list(productQuery({}))
          )
        : null
    return { products, store, suggestions }
  }
)

/**
 * Load the trend line of the given followed products, or of all followed
 * products without a current one. Each costs one research request (or the
 * cache), so only products you follow qualify: other codes are ignored.
 */
export const loadTrends = createServerFn({ method: "POST" })
  .validator((input: { codes?: string[] }) => ({
    codes: productCodes(fields(input).codes, 50),
  }))
  .handler(async ({ data }) => {
    const followed = trackedCodes()
    const codes = data.codes
      ? data.codes.filter((code) => followed.includes(code))
      : followed.filter((code) => !trendIsCurrent(code))
    let fetched = 0
    let cached = 0
    for (const code of codes) {
      const result = await apiGet<History>(trendPath(code), TREND, (mm) =>
        mm.products.salesHistory(code, TREND)
      )
      if (!result.ok) return { fetched, cached, error: result }
      if (result.fromCache) cached += 1
      else fetched += 1
    }
    return { fetched, cached, error: null }
  })
