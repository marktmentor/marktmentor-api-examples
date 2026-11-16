// Fails when a text key exists in one language but not in the other.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/i18n"
)
const load = (name) =>
  JSON.parse(readFileSync(path.join(dir, `${name}.json`), "utf8"))

function keys(value, prefix = "") {
  return Object.entries(value).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  )
}
function leaf(obj, key) {
  return key.split(".").reduce((o, k) => o[k], obj)
}

const en = load("en")
const nl = load("nl")

test("both languages have the same keys", () => {
  const a = new Set(keys(en))
  const b = new Set(keys(nl))
  assert.deepEqual(
    [...a].filter((k) => !b.has(k)),
    [],
    "missing in nl.json"
  )
  assert.deepEqual(
    [...b].filter((k) => !a.has(k)),
    [],
    "missing in en.json"
  )
})

test("every text is filled in and has the same placeholders", () => {
  for (const key of keys(en)) {
    const e = leaf(en, key)
    const n = leaf(nl, key)
    assert.ok(typeof e === "string" && e.trim(), `en.${key} is empty`)
    assert.ok(typeof n === "string" && n.trim(), `nl.${key} is empty`)
    const vars = (t) => [...t.matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort()
    assert.deepEqual(vars(n), vars(e), `placeholders differ in ${key}`)
  }
})
