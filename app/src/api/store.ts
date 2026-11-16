// Server functions for the store endpoints. Store requests are free, need no
// bundle (Pro plan and a connected store) and are not cached: they change
// during the day.
import { createServerFn } from "@tanstack/react-start"
import { apiGet } from "@/server/client"
import type { StockState, StoreSort } from "@/lib/store-params"
import type { StoreInventory, StoreOverview, StoreProducts } from "@/lib/types"

export type StorePeriod = {
  days?: number
  startDate?: string
  endDate?: string
}
/** Use days, or startDate and endDate, never both (API rule). */
const period = (p: StorePeriod) =>
  p.startDate && p.endDate
    ? { startDate: p.startDate, endDate: p.endDate }
    : { days: p.days ?? 30 }

/** GET store/overview/ (days and country; no date range on this endpoint). */
export const getStoreOverview = createServerFn({ method: "GET" })
  .validator((input: { days?: number; country?: "NL" | "BE" }) => input)
  .handler(({ data }) =>
    apiGet<StoreOverview>("store/overview/", {
      days: data.days ?? 30,
      country: data.country,
    })
  )

export type StoreProductsQuery = StorePeriod & {
  country?: "NL" | "BE"
  /** The category number, as in research (reference/categories/). */
  categoryId?: number
  eans?: string
  sort?: StoreSort
  page?: number
  pageSize?: number
}

/** GET store/products/ with every parameter. */
export const getStoreProducts = createServerFn({ method: "GET" })
  .validator((input: StoreProductsQuery) => input)
  .handler(({ data }) =>
    apiGet<StoreProducts>("store/products/", {
      ...period(data),
      country: data.country,
      categoryId: data.categoryId,
      eans: data.eans,
      sort: data.sort ?? "-revenue",
      page: data.page ?? 1,
      pageSize: data.pageSize ?? 25,
    })
  )

/** GET store/inventory/ with every parameter. */
export const getStoreInventory = createServerFn({ method: "GET" })
  .validator(
    (input: {
      ean?: string
      stockState?: StockState
      page?: number
      pageSize?: number
    }) => input
  )
  .handler(({ data }) =>
    apiGet<StoreInventory>("store/inventory/", {
      ean: data.ean,
      stockState: data.stockState,
      page: data.page ?? 1,
      pageSize: data.pageSize ?? 25,
    })
  )
