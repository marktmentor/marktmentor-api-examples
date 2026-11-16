import { Link } from "@tanstack/react-router"
import { ArrowLeftIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

/** "← Products" above a detail page. */
export function BackLink({
  to,
  label,
}: {
  to: "/products" | "/niches"
  label: string
}) {
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-2 self-start">
      <Link to={to}>
        <ArrowLeftIcon />
        {label}
      </Link>
    </Button>
  )
}
