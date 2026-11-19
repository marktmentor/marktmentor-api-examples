// Asks search engines not to index the app. scripts/serve.mjs adds the
// header X-Robots-Tag to every response and the tag <meta name="robots"> to
// every HTML page.
//
// The switch is MARKTMENTOR_SEARCH_INDEXING in the Dockerfile: "off" (the
// default) or "on". `npm run dev` on your own computer is not affected.

export const NOINDEX = "noindex, nofollow"

/** The robots value for the switch, or null when indexing is allowed. */
export function robotsPolicy(value) {
  if (value === undefined || value === "" || value === "off") return NOINDEX
  if (value === "on") return null
  throw new Error(
    `MARKTMENTOR_SEARCH_INDEXING must be "on" or "off", not "${value}"`
  )
}

/** The HTML with the robots meta tag as the first element of <head>. */
export function withRobotsMeta(html, policy) {
  const tag = `<meta name="robots" content="${policy}">`
  return html.replace(/<head(\s[^>]*)?>/i, (head) => head + tag)
}

/** srvx middleware: the robots header on every response, the tag in HTML. */
export function robotsMiddleware(policy) {
  return async (request, next) => {
    const response = await next()
    if (!policy) return response
    const headers = new Headers(response.headers)
    headers.set("X-Robots-Tag", policy)
    const isHtml = (headers.get("Content-Type") ?? "").includes("text/html")
    let body = response.body
    if (isHtml && body && !headers.has("Content-Encoding")) {
      body = withRobotsMeta(await response.text(), policy)
      headers.delete("Content-Length")
    }
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}
