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
import type { Pagination as PaginationData } from "@/lib/types"

/** Previous / current / next for a paginated research list. */
export function Pager({
  pagination,
  onPage,
}: {
  pagination: PaginationData
  onPage: (page: number) => void
}) {
  const { m } = useI18n()
  if (pagination.page <= 1 && !pagination.hasNext) return null
  // At most 10,000 results per query (page x pageSize).
  const canNext =
    pagination.hasNext && pagination.page * pagination.pageSize < 10_000
  const go = (page: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    onPage(page)
  }
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            text={m.common.previous}
            aria-disabled={pagination.page <= 1}
            className={
              pagination.page <= 1 ? "pointer-events-none opacity-50" : ""
            }
            onClick={go(pagination.page - 1)}
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive onClick={(e) => e.preventDefault()}>
            {pagination.page}
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <Tooltip>
            <TooltipTrigger asChild>
              <PaginationNext
                href="#"
                text={m.common.next}
                aria-disabled={!canNext}
                className={!canNext ? "pointer-events-none opacity-50" : ""}
                onClick={go(pagination.page + 1)}
              />
            </TooltipTrigger>
            <TooltipContent>{m.common.nextCost}</TooltipContent>
          </Tooltip>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
