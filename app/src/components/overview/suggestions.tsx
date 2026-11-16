import { ApiError } from "@/components/api-error"
import { SkippedDefault } from "@/components/filters/default-list"
import { ProductTable } from "@/components/research/product-table"
import { SourceBadge } from "@/components/source-badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useFollow } from "@/hooks/use-follow"
import { useI18n } from "@/i18n"
import type { Overview } from "@/lib/types"

/** An empty watchlist: five best sellers to follow, from the default list of Products. */
export function Suggestions({
  suggestions,
}: {
  suggestions: NonNullable<Overview["suggestions"]>
}) {
  const { m } = useI18n()
  const follow = useFollow()
  if (suggestions.kind === "skipped")
    return <SkippedDefault reason={suggestions.reason} />
  const { result } = suggestions
  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.defaults.suggestions}</CardTitle>
        <CardDescription>{m.defaults.suggestionsBody}</CardDescription>
        <CardAction>
          <SourceBadge result={result} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {!result.ok ? (
          <ApiError error={result} />
        ) : (
          <ProductTable
            products={result.data.data.slice(0, 5)}
            tracked={new Set()}
            onToggle={(p) => follow(p, false)}
          />
        )}
      </CardContent>
    </Card>
  )
}
