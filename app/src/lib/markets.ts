// The API gives most figures per market (NL and BE). These helpers read one
// market, or both together for market ALL.
import type { Market } from "./filters"

type PerMarket<T> = { NL?: T; BE?: T }

/** NL + BE together, or null when neither market has the value. */
export function sumMarkets(
  nl: number | null | undefined,
  be: number | null | undefined
): number | null {
  return nl == null && be == null ? null : (nl ?? 0) + (be ?? 0)
}

/** The value of one market, or of NL + BE for market ALL. */
export function marketValue<TKey extends string>(
  markets: PerMarket<Partial<Record<TKey, number | null>>> | undefined,
  key: TKey,
  market: Market = "ALL"
): number | null {
  if (!markets) return null
  if (market !== "ALL") return markets[market]?.[key] ?? null
  return sumMarkets(markets.NL?.[key], markets.BE?.[key])
}
