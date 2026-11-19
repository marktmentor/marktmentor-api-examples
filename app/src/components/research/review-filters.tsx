import { SearchIcon } from "lucide-react"
import { useState } from "react"
import { OptionSelect } from "@/components/research/period-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/i18n"
import { PERIODS, type ReviewQuery } from "@/lib/research-params"

const SCORES = ["all", "5", "4", "3", "2", "1"] as const
const VERIFIED = ["all", "verified"] as const
const SORTS = ["-date", "date", "-score", "score"] as const
const FAMILY = ["family", "own"] as const

/** The filters of the review list. Each change starts again at page 1. */
export function ReviewFilters({
  query,
  onQuery,
  familySwitch,
}: {
  query: ReviewQuery
  onQuery: (next: ReviewQuery) => void
  familySwitch?: boolean
}) {
  const { m, fill } = useI18n()
  const [search, setSearch] = useState(query.search ?? "")
  const scoreLabels = Object.fromEntries(
    SCORES.map((s) => [
      s,
      s === "all" ? m.reviews.allScores : fill(m.reviews.stars, { n: s }),
    ])
  ) as Record<(typeof SCORES)[number], string>
  return (
    <div className="flex flex-wrap items-center gap-2">
      {familySwitch && (
        <OptionSelect
          value={query.ownOnly ? "own" : "family"}
          options={FAMILY}
          labels={{
            family: m.reviews.scopeFamily,
            own: m.reviews.scopeOwn,
          }}
          onChange={(v) =>
            onQuery({
              ...query,
              ownOnly: v === "own" ? true : undefined,
              page: 1,
            })
          }
          className="w-48"
        />
      )}
      <OptionSelect
        value={query.period ?? "1Y"}
        options={PERIODS}
        labels={m.product.periods}
        onChange={(period) => onQuery({ ...query, period, page: 1 })}
        className="w-32"
      />
      <OptionSelect
        value={
          query.score ? (String(query.score) as (typeof SCORES)[number]) : "all"
        }
        options={SCORES}
        labels={scoreLabels}
        onChange={(v) =>
          onQuery({
            ...query,
            score: v === "all" ? undefined : Number(v),
            page: 1,
          })
        }
      />
      <OptionSelect
        value={query.verified ? "verified" : "all"}
        options={VERIFIED}
        labels={{
          all: m.reviews.allReviews,
          verified: m.reviews.verifiedOnly,
        }}
        onChange={(v) =>
          onQuery({
            ...query,
            verified: v === "verified" ? true : undefined,
            page: 1,
          })
        }
        className="w-48"
      />
      <OptionSelect
        value={query.sort ?? "-date"}
        options={SORTS}
        labels={m.reviews.sorts}
        onChange={(v) => onQuery({ ...query, sort: v, page: 1 })}
      />
      <form
        className="flex min-w-0 basis-full gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          onQuery({ ...query, search: search || undefined, page: 1 })
        }}
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={m.reviews.searchPlaceholder}
          placeholder={m.reviews.searchPlaceholder}
          className="h-8 min-w-0"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          aria-label={m.common.search}
        >
          <SearchIcon />
        </Button>
      </form>
    </div>
  )
}
