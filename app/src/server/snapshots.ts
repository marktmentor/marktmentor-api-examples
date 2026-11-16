import "@tanstack/react-start/server-only"

// Daily snapshots of followed products, taken from answers the app already
// has: they never cost an extra request.
import type { Product } from "@/lib/types"
import { todaysSnapshotBodies } from "./cache"
import { config } from "./config"
import { getDb } from "./db"

export function saveSnapshot(product: Product) {
  const mode = config().mode
  const db = getDb()
  const tracked = db
    .prepare(
      "select 1 from tracked_products where mode = ? and product_code = ?"
    )
    .get(mode, product.productCode)
  if (!tracked) return
  const day = (product.updatedAt ?? new Date().toISOString()).slice(0, 10)
  const insert = db.prepare(
    `insert into product_snapshots (mode, product_code, day, market, price, sales, revenue, rating, review_count)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)
     on conflict(mode, product_code, day, market) do update set
       price = excluded.price, sales = excluded.sales, revenue = excluded.revenue,
       rating = excluded.rating, review_count = excluded.review_count`
  )
  for (const [market, m] of Object.entries(product.markets)) {
    // Values are stored unchanged; the pages round them only for display.
    insert.run(
      mode,
      product.productCode,
      day,
      market,
      m.price ?? null,
      m.sales ?? null,
      m.revenue ?? null,
      product.rating ?? null,
      product.reviewCount ?? null
    )
  }
}

/** The product from today's cached research answers, if one contains it. */
export function productFromCache(productCode: string): Product | null {
  // Today = the data day of the cache (lib/data-day.ts).
  for (const raw of todaysSnapshotBodies()) {
    const body = JSON.parse(raw) as { data?: Product | Product[] }
    const list = Array.isArray(body.data)
      ? body.data
      : body.data
        ? [body.data]
        : []
    const found = list.find(
      (p) =>
        (p as Partial<Product>).productCode === productCode && "markets" in p
    )
    if (found) return found
  }
  return null
}
