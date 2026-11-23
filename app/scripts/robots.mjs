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
    const isHtml = (response.headers.get("Content-Type") ?? "").includes(
      "text/html"
    )
    if (isHtml && response.body && !response.headers.has("Content-Encoding")) {
      const headers = new Headers(response.headers)
      headers.set("X-Robots-Tag", policy)
      headers.delete("Content-Length")
      return new Response(withRobotsMeta(await response.text(), policy), {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    }
    // Do not touch response.body here. For a static file it is a Node file
    // stream, and reading `.body` turns it into a web stream (undici). When a
    // client closes the connection at the end of that stream, undici throws
    // ERR_INVALID_STATE in a microtask and the process stops (api-demo crash,
    // 2026-11-21). Set the header on the response itself.
    try {
      response.headers.set("X-Robots-Tag", policy)
      return response
    } catch {
      // Immutable headers (a fetch() response): copy them, keep the body.
      const headers = new Headers(response.headers)
      headers.set("X-Robots-Tag", policy)
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    }
  }
}
