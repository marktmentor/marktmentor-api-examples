import { XIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n"

/** The active filters as chips, each with a remove button, and "Clear filters". */
export function FilterChips({
  chips,
  onRemove,
  onClear,
}: {
  chips: { key: string; label: string }[]
  onRemove: (key: string) => void
  onClear: () => void
}) {
  const { m } = useI18n()
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <Badge key={c.key} variant="secondary" className="gap-1 pr-1">
          {c.label}
          <button
            type="button"
            onClick={() => onRemove(c.key)}
            className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
            aria-label={`${m.filters.remove}: ${c.label}`}
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={onClear}
      >
        {m.filters.clear}
      </Button>
    </div>
  )
}
