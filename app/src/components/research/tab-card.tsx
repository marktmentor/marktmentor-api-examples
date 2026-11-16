import { ApiError } from "@/components/api-error"
import { SourceBadge } from "@/components/source-badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import type { ApiResult } from "@/lib/types"

/** The card around one endpoint: title, source badge, controls, error and empty state. */
export function TabCard<T>({
  title,
  description,
  result,
  controls,
  isEmpty,
  emptyText,
  children,
}: {
  title: string
  description: string
  result: ApiResult<T>
  controls?: React.ReactNode
  isEmpty?: (data: T) => boolean
  emptyText?: string
  children: (data: T) => React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <SourceBadge result={result} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        {controls && (
          <div className="flex flex-wrap items-center gap-2">{controls}</div>
        )}
        {!result.ok ? (
          <ApiError error={result} />
        ) : isEmpty?.(result.data) ? (
          <Empty className="flex-none border">
            <EmptyHeader>
              <EmptyTitle>{emptyText}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          children(result.data)
        )}
      </CardContent>
    </Card>
  )
}
