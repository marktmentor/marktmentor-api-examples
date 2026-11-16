// Two languages, one JSON file each. Components read texts only from here.
import { createContext, useContext, useMemo } from "react"
import en from "./en.json"
import nl from "./nl.json"

export type Messages = typeof en
export type Locale = "en" | "nl"

export const LOCALES: Record<
  Locale,
  { label: string; intl: string; messages: Messages }
> = {
  en: { label: "English", intl: "en-GB", messages: en },
  nl: { label: "Nederlands", intl: "nl-NL", messages: nl },
}
export const LOCALE_COOKIE = "lang"

/** The first supported language in an Accept-Language header. */
export function pickLocale(
  cookie: string | undefined,
  acceptLanguage: string | undefined
): Locale {
  if (cookie === "en" || cookie === "nl") return cookie
  for (const part of (acceptLanguage ?? "").split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase()
    if (code === "nl" || code === "en") return code
  }
  return "en"
}

/** "{n} products" + { n: 3 } -> "3 products" */
export function fill(text: string, vars: Record<string, string | number> = {}) {
  return text.replace(/\{(\w+)\}/g, (_, k: string) =>
    String(vars[k] ?? `{${k}}`)
  )
}

function makeI18n(locale: Locale) {
  const { intl, messages } = LOCALES[locale]
  const nf = new Intl.NumberFormat(intl, { maximumFractionDigits: 0 })
  const df = new Intl.NumberFormat(intl, { maximumFractionDigits: 1 })
  const eur0 = new Intl.NumberFormat(intl, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  })
  const eur2 = new Intl.NumberFormat(intl, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  })
  const none = messages.common.none
  const ok = (v: number | null | undefined): v is number =>
    typeof v === "number" && Number.isFinite(v)
  // Rounding happens only here, for display. Stored and exported values stay unchanged.
  return {
    locale,
    m: messages,
    fill,
    num: (v: number | null | undefined) => (ok(v) ? nf.format(v) : none),
    dec: (v: number | null | undefined) => (ok(v) ? df.format(v) : none),
    eur: (v: number | null | undefined) => (ok(v) ? eur0.format(v) : none),
    price: (v: number | null | undefined) => (ok(v) ? eur2.format(v) : none),
    pct: (v: number | null | undefined) =>
      ok(v) ? `${v > 0 ? "+" : ""}${df.format(v)}%` : none,
    date: (v: string | null | undefined) =>
      v
        ? new Date(v).toLocaleDateString(intl, {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          })
        : none,
    month: (v: string | null | undefined) =>
      v
        ? new Date(v).toLocaleDateString(intl, {
            month: "short",
            year: "2-digit",
            timeZone: "UTC",
          })
        : none,
    dateTime: (v: string | null | undefined) =>
      v
        ? new Date(v).toLocaleString(intl, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : none,
  }
}

export type I18n = ReturnType<typeof makeI18n>
const I18nContext = createContext<I18n>(makeI18n("en"))

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  const value = useMemo(() => makeI18n(locale), [locale])
  return <I18nContext value={value}>{children}</I18nContext>
}

export const useI18n = () => useContext(I18nContext)
