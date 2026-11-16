import { useRouter } from "@tanstack/react-router"
import { CheckIcon, LanguagesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LOCALES, LOCALE_COOKIE, type Locale, useI18n } from "@/i18n"

/** The language menu. The choice is kept in a cookie on this computer. */
export function LanguageToggle() {
  const { locale, m } = useI18n()
  const router = useRouter()
  const choose = (next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    document.documentElement.lang = next
    void router.invalidate()
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <LanguagesIcon />
          <span className="uppercase">{locale}</span>
          <span className="sr-only">{m.meta.language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{m.meta.language}</DropdownMenuLabel>
        {(Object.keys(LOCALES) as Locale[]).map((code) => (
          <DropdownMenuItem key={code} onClick={() => choose(code)}>
            {LOCALES[code].label}
            {code === locale && <CheckIcon className="ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
