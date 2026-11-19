import "@tanstack/react-start/server-only"

// The followed products of the owner of this request (server/owner.ts).
import { getDb } from "./db"
import { owner } from "./owner"

/** The codes of the products this owner follows, newest first. */
export function trackedCodes(): string[] {
  return (
    getDb()
      .prepare(
        "select product_code from tracked_products where owner = ? order by added_at desc"
      )
      .all(owner()) as { product_code: string }[]
  ).map((r) => r.product_code)
}
