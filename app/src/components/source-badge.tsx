import { DatabaseIcon, FlaskConicalIcon, RadioIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from "@/i18n"

type Result = {
  ok: boolean
  fromCache?: boolean
  fetchedAt?: string
  mode?: string
}

/** Where the figures came from: the API now, the local cache, or the sample data. */
export function SourceBadge({
  result,
  free,
}: {
  result: Result
  free?: boolean
}) {
  const { m, fill, dateTime } = useI18n()
  if (!result.ok) return null
  const [icon, label, tip] =
    result.mode === "demo"
      ? [<FlaskConicalIcon key="i" />, m.source.demo, m.demo.body]
      : result.fromCache
        ? [
            <DatabaseIcon key="i" />,
            m.source.cache,
            fill(m.source.cacheTip, { time: dateTime(result.fetchedAt) }),
          ]
        : [
            <RadioIcon key="i" />,
            m.source.live,
            free ? m.source.liveFreeTip : m.source.liveTip,
          ]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline">
          {icon}
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{tip}</TooltipContent>
    </Tooltip>
  )
}
