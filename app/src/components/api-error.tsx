import { AlertCircleIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useI18n } from "@/i18n"
import type { ApiFailure } from "@/lib/types"

/** One error answer of the API, with what to do, in the chosen language. */
export function ApiError({ error }: { error: ApiFailure }) {
  const { m, fill } = useI18n()
  const titles = m.errors.titles as Record<string, string>
  const codes = m.errors.codes as Record<string, string>
  const title =
    error.code === "reserve_reached"
      ? titles.reserve
      : (titles[String(error.status)] ?? titles.other)
  const detail =
    error.code === "reserve_reached"
      ? fill(m.errors.reserveDetail, {
          left: error.left ?? 0,
          reserve: error.reserve ?? 0,
        })
      : error.detail
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>
        {title}
        <span className="block font-mono text-xs font-normal break-all text-muted-foreground sm:ml-2 sm:inline">
          {error.status ? `HTTP ${error.status} · ` : ""}
          {error.code}
        </span>
      </AlertTitle>
      <AlertDescription>
        {codes[error.code] && <p>{codes[error.code]}</p>}
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
        {error.errors && (
          <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
            {JSON.stringify(error.errors, null, 1)}
          </pre>
        )}
        {error.retryAfter && (
          <p className="text-xs">
            {fill(m.errors.retryAfter, { n: error.retryAfter })}
          </p>
        )}
        {error.requestId && (
          <p className="font-mono text-xs text-muted-foreground">
            {fill(m.errors.requestId, { id: error.requestId })}
          </p>
        )}
      </AlertDescription>
    </Alert>
  )
}
