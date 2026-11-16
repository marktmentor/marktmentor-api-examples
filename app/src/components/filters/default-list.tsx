import { BanIcon, CreditCardIcon, PiggyBankIcon } from "lucide-react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useI18n } from "@/i18n"
import type { SkipReason } from "@/lib/types"

const ICONS = {
  noAccess: BanIcon,
  paymentFailed: CreditCardIcon,
  reserve: PiggyBankIcon,
}

/** Why a page did not fetch its default list (no access, a failed payment, or the reserve). */
export function SkippedDefault({ reason }: { reason: SkipReason }) {
  const { m } = useI18n()
  const Icon = ICONS[reason]
  return (
    <Empty className="flex-none border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{m.defaults[`${reason}Title`]}</EmptyTitle>
        <EmptyDescription>{m.defaults[`${reason}Body`]}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

/** The heading of a default list: what it is and how to narrow it. */
export function DefaultHeading({
  title,
  hint,
}: {
  title: string
  hint: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold">{title}</span>
      <span className="text-sm font-normal text-muted-foreground">{hint}</span>
    </div>
  )
}
