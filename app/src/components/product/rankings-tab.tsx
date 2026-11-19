import { RankHistoryTab } from "@/components/research/rank-history-tab"
import { useI18n } from "@/i18n"
import type { HistoryPeriod, Interval } from "@/lib/research-params"
import type { ApiResult, CategoryRankings, KeywordRankings } from "@/lib/types"

type HistoryProps = {
  period: HistoryPeriod
  interval: Interval
  onChange: (next: { period: HistoryPeriod; interval: Interval }) => void
}

/** GET research/products/{code}/category-rankings/: one row per category. */
export function RankingsTab({
  result,
  categoryNames,
  ...history
}: {
  result: ApiResult<CategoryRankings>
  categoryNames: Record<number, string | null>
} & HistoryProps) {
  const { m, fill } = useI18n()
  return (
    <RankHistoryTab
      title={m.rankings.title}
      description={m.rankings.description}
      emptyText={m.rankings.empty}
      itemLabel={m.rankTable.category}
      result={result}
      rows={(d) =>
        d.data.map((c) => ({
          id: String(c.categoryId),
          label:
            categoryNames[c.categoryId] ??
            fill(m.rankings.category, { id: c.categoryId }),
          points: c.history,
        }))
      }
      {...history}
    />
  )
}

/** GET research/products/{code}/keyword-rankings/: one row per keyword. */
export function KeywordRankingsTab({
  result,
  ...history
}: { result: ApiResult<KeywordRankings> } & HistoryProps) {
  const { m, fill } = useI18n()
  return (
    <RankHistoryTab
      title={m.keywordRankings.title}
      description={m.keywordRankings.description}
      emptyText={m.keywordRankings.empty}
      itemLabel={m.rankTable.keyword}
      result={result}
      rows={(d) =>
        d.data.map((k) => ({
          id: k.keywordId,
          label:
            k.keyword ?? fill(m.keywordRankings.unnamed, { id: k.keywordId }),
          points: k.history,
        }))
      }
      {...history}
    />
  )
}
