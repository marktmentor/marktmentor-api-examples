// The request(s) of the open tab only: a closed tab costs nothing.
import {
  getNicheDistributions,
  getNicheProducts,
  getNicheReviewHistory,
  getNicheReviewSummary,
  getNicheReviews,
} from "@/api/niches"
import { reviewQuery } from "@/lib/search-params"
import type { NicheSearch } from "./search"

export async function loadNicheTab(id: string, s: NicheSearch) {
  switch (s.tab ?? "products") {
    case "products":
      return {
        kind: "products" as const,
        result: await getNicheProducts({ data: { id, filters: s } }),
      }
    case "periods":
      // From the niche itself (comparePeriods): no extra request.
      return { kind: "periods" as const }
    case "distributions":
      return {
        kind: "distributions" as const,
        result: await getNicheDistributions({
          data: { id, period: s.dist ?? "30d" },
        }),
      }
    case "reviews":
      return {
        kind: "reviews" as const,
        summary: await getNicheReviewSummary({ data: { id } }),
        list: await getNicheReviews({
          data: { id, ...reviewQuery({ ...s, sort: s.rsort }) },
        }),
      }
    case "reviewHistory":
      return {
        kind: "reviewHistory" as const,
        result: await getNicheReviewHistory({
          data: { id, period: s.hp ?? "3M", interval: s.interval ?? "month" },
        }),
      }
  }
}

export type NicheTabData = Awaited<ReturnType<typeof loadNicheTab>>
