// The values of the store parameters, shared by the pages and the server.

export const STORE_SORTS = [
  "-revenue",
  "revenue",
  "-sales",
  "sales",
  "-profits",
  "profits",
  "-costs",
  "costs",
] as const
export type StoreSort = (typeof STORE_SORTS)[number]
export const STORE_PAGE_SIZES = ["5", "10", "25", "50", "100"] as const
export const STOCK_STATES = ["out_of_stock", "low", "ok"] as const
export type StockState = (typeof STOCK_STATES)[number]
