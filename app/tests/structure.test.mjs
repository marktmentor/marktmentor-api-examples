// The layout of src/ (see the README): keep each kind of code in its folder.
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src")
const files = (dir) =>
  readdirSync(path.join(src, dir), { recursive: true, withFileTypes: true })
    .filter((f) => f.isFile() && /\.tsx?$/.test(f.name))
    .map((f) => path.relative(src, path.join(f.parentPath, f.name)))
const read = (f) => readFileSync(path.join(src, f), "utf8")

test("lib/ is pure: no server functions, no server code", () => {
  for (const f of files("lib")) {
    assert.doesNotMatch(
      read(f),
      /createServerFn/,
      `${f} has a server function: move it to src/api/`
    )
    assert.doesNotMatch(
      read(f),
      /@\/server\/|server-only/,
      `${f} imports server code`
    )
  }
})

test("pages and components reach the API only through src/api/", () => {
  for (const f of [
    ...files("components"),
    ...files("routes"),
    ...files("hooks"),
  ])
    assert.doesNotMatch(
      read(f),
      /from "@\/server\//,
      `${f} imports src/server/ directly`
    )
})

test("every file in server/ is server-only", () => {
  for (const f of files("server"))
    assert.match(
      read(f),
      /@tanstack\/react-start\/server-only/,
      `${f} misses the server-only import`
    )
})
