import assert from "node:assert/strict"
import { test } from "node:test"

import {
  NOINDEX,
  robotsMiddleware,
  robotsPolicy,
  withRobotsMeta,
} from "../scripts/robots.mjs"

test("off or unset means noindex, on means no robots rule", () => {
  assert.equal(robotsPolicy(undefined), NOINDEX)
  assert.equal(robotsPolicy(""), NOINDEX)
  assert.equal(robotsPolicy("off"), NOINDEX)
  assert.equal(robotsPolicy("on"), null)
  assert.throws(() => robotsPolicy("true"), /must be "on" or "off"/)
})

test("the meta tag goes first into <head>", () => {
  assert.equal(
    withRobotsMeta(
      '<html><head lang="en"><title>x</title></head></html>',
      NOINDEX
    ),
    '<html><head lang="en"><meta name="robots" content="noindex, nofollow"><title>x</title></head></html>'
  )
  assert.equal(
    withRobotsMeta("<header>no head</header>", NOINDEX),
    "<header>no head</header>"
  )
})

const run = (policy, response, method = "GET") =>
  robotsMiddleware(policy)(
    new Request("http://demo/", { method }),
    async () => response
  )

test("an HTML page gets the header and the tag", async () => {
  const response = await run(
    NOINDEX,
    new Response("<html><head></head><body>x</body></html>", {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": "40",
      },
    })
  )
  assert.equal(response.headers.get("X-Robots-Tag"), NOINDEX)
  assert.equal(response.headers.get("Content-Length"), null)
  assert.match(
    await response.text(),
    /<head><meta name="robots" content="noindex, nofollow"><\/head>/
  )
})

test("other responses keep their body and status and get the header", async () => {
  const response = await run(
    NOINDEX,
    new Response("ok\n", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    })
  )
  assert.equal(response.status, 404)
  assert.equal(response.headers.get("X-Robots-Tag"), NOINDEX)
  assert.equal(await response.text(), "ok\n")
})

test("a HEAD answer and a compressed page keep their body", async () => {
  const head = await run(
    NOINDEX,
    new Response(null, { headers: { "Content-Type": "text/html" } }),
    "HEAD"
  )
  assert.equal(head.headers.get("X-Robots-Tag"), NOINDEX)
  assert.equal(head.body, null)
  const zipped = await run(
    NOINDEX,
    new Response("<head>", {
      headers: { "Content-Type": "text/html", "Content-Encoding": "gzip" },
    })
  )
  assert.equal(await zipped.text(), "<head>")
})

test("with indexing on, the response is unchanged", async () => {
  const original = new Response("<html><head></head></html>", {
    headers: { "Content-Type": "text/html" },
  })
  assert.equal(await run(null, original), original)
})
