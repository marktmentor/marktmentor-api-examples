import { InfoIcon } from "lucide-react"
import { OptionSelect } from "@/components/research/period-select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from "@/i18n"
import { PAGE_SIZES } from "@/lib/filters"

/** "12,345 results" with the 10,000 limit, and the page size (pageSize). */
export function ResultMeta({
  total,
  size,
  onSize,
  sizeDisabled = false,
}: {
  total: number | null
  size: number
  onSize: (n: number) => void
  /** Demo mode with one example: the page size changes nothing. */
  sizeDisabled?: boolean
}) {
  const { m, fill, num } = useI18n()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-semibold tabular-nums">
        {fill(m.filters.results, { n: num(total) })}
      </span>
      {total !== null && total > 10_000 && (
        <Tooltip>
          <TooltipTrigger
            className="text-muted-foreground"
            aria-label={m.filters.limitNote}
          >
            <InfoIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {m.filters.limitNote}
          </TooltipContent>
        </Tooltip>
      )}
      <OptionSelect
        value={String(size) as (typeof PAGE_SIZES)[number]}
        options={PAGE_SIZES}
        labels={{
          "10": fill(m.filters.pageSize, { n: 10 }),
          "25": fill(m.filters.pageSize, { n: 25 }),
        }}
        onChange={(v) => onSize(Number(v))}
        className="w-36"
        disabled={sizeDisabled}
      />
    </div>
  )
}
