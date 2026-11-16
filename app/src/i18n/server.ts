import { createServerFn } from "@tanstack/react-start"
import { getCookie, getRequestHeader } from "@tanstack/react-start/server"
import { LOCALE_COOKIE, pickLocale } from "./index"

/** The language of this request: the saved choice, else the browser language. */
export const getLocale = createServerFn({ method: "GET" }).handler(async () =>
  pickLocale(getCookie(LOCALE_COOKIE), getRequestHeader("accept-language"))
)
