import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n"
import { EXAMPLE_NICHE_ID, EXAMPLE_PRODUCT_CODE } from "@/lib/examples"

/** Links to the example product and niche: the ids that the test key knows. */
export function DemoExamples() {
  const { m } = useI18n()
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>{m.demo.tryLabel}</span>
      <Button asChild size="sm" variant="outline">
        <Link
          to="/products/$productCode"
          params={{ productCode: EXAMPLE_PRODUCT_CODE }}
        >
          {m.demo.exampleProduct}
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link to="/niches/$nicheId" params={{ nicheId: EXAMPLE_NICHE_ID }}>
          {m.demo.exampleNiche}
        </Link>
      </Button>
    </span>
  )
}
