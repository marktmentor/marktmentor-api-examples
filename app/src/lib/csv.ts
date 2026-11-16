import type { Product } from "./types"

// CSV files are language-independent: raw API values, English column names.

export function downloadCsv(
  filename: string,
  columns: string[],
  rows: Record<string, unknown>[]
) {
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return ""
    // Text that starts with = + - @ gets a ' first, so a spreadsheet does not
    // run a product title as a formula. Numbers stay as they are.
    const t = typeof v === "string" && /^[=+\-@]/.test(v) ? `'${v}` : String(v)
    return /[",\r\n;]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t
  }
  const csv = [
    columns.join(","),
    ...rows.map((r) => columns.map((c) => cell(r[c])).join(",")),
  ].join("\n")
  const url = URL.createObjectURL(
    new Blob([csv + "\n"], { type: "text/csv;charset=utf-8" })
  )
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  })
  a.click()
  URL.revokeObjectURL(url)
}

export const PRODUCT_CSV_COLUMNS = [
  "productCode",
  "ean",
  "title",
  "brand",
  "rating",
  "reviewCount",
  "NL.price",
  "NL.sales",
  "NL.revenue",
  "BE.price",
  "BE.sales",
  "BE.revenue",
  "updatedAt",
]

export function flattenProduct(p: Product): Record<string, unknown> {
  return {
    productCode: p.productCode,
    ean: p.ean,
    title: p.title,
    brand: p.brand,
    rating: p.rating,
    reviewCount: p.reviewCount,
    "NL.price": p.markets.NL?.price,
    "NL.sales": p.markets.NL?.sales,
    "NL.revenue": p.markets.NL?.revenue,
    "BE.price": p.markets.BE?.price,
    "BE.sales": p.markets.BE?.sales,
    "BE.revenue": p.markets.BE?.revenue,
    updatedAt: p.updatedAt,
  }
}

/** NL + BE together, or null when neither market has the value. */
export function bothMarkets(
  p: Pick<Product, "markets">,
  key: "sales" | "revenue"
): number | null {
  const nl = p.markets.NL?.[key]
  const be = p.markets.BE?.[key]
  if (nl == null && be == null) return null
  return (nl ?? 0) + (be ?? 0)
}
