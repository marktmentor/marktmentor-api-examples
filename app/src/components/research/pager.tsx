import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from "@/i18n"
/** The page fields the pager needs; research and store lists both have them. */
type PaginationData = { page: number; pageSize: number; hasNext: boolean }

/** Previous / current / next for a paginated list. */
export function Pager({
  pagination,
  onPage,
  free = false,
}: {
  pagination: PaginationData
  onPage: (page: number) => void
  /** Store lists: a page costs no research request, so no cost tooltip. */
  free?: boolean
}) {
  const { m } = useI18n()
  if (pagination.page <= 1 && !pagination.hasNext) return null
  // At most 10,000 results per query (page x pageSize).
  const canNext =
    pagination.hasNext && pagination.page * pagination.pageSize < 10_000
  const canPrevious = pagination.page > 1
  // A disabled link still fires onClick on Enter, so check here too.
  const go = (page: number, enabled: boolean) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (enabled) onPage(page)
  }
  const next = (
    <PaginationNext
      href="#"
      text={m.common.next}
      aria-label={m.common.nextPage}
      aria-disabled={!canNext}
      tabIndex={canNext ? undefined : -1}
      className={!canNext ? "pointer-events-none opacity-50" : ""}
      onClick={go(pagination.page + 1, canNext)}
    />
  )
  return (
    <Pagination aria-label={m.common.pagination}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text={m.common.previous}
            aria-label={m.common.previousPage}
            aria-disabled={!canPrevious}
            tabIndex={canPrevious ? undefined : -1}
            className={!canPrevious ? "pointer-events-none opacity-50" : ""}
            onClick={go(pagination.page - 1, canPrevious)}
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive onClick={(e) => e.preventDefault()}>
            {pagination.page}
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          {free ? (
            next
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>{next}</TooltipTrigger>
              <TooltipContent>{m.common.nextCost}</TooltipContent>
            </Tooltip>
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
