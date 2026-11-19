// Demo mode sends only the public test key: config() never returns another
// credential in demo mode, also when MARKTMENTOR_API_KEY holds a live key.
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"
import { TEST_KEY, config, keyHint } from "../src/server/config.ts"

const LIVE = "mm_live_SMOKETESTCANARY0000"
const saved = {
  key: process.env.MARKTMENTOR_API_KEY,
  demo: process.env.MARKTMENTOR_DEMO,
}
const set = (name, value) =>
  value === undefined ? delete process.env[name] : (process.env[name] = value)
afterEach(() => {
  set("MARKTMENTOR_API_KEY", saved.key)
  set("MARKTMENTOR_DEMO", saved.demo)
})

test("MARKTMENTOR_DEMO=1 ignores a live key", () => {
  set("MARKTMENTOR_DEMO", "1")
  set("MARKTMENTOR_API_KEY", LIVE)
  assert.equal(TEST_KEY, "mm_test_demo")
  assert.equal(config().mode, "demo")
  assert.equal(config().apiKey, TEST_KEY)
  assert.equal(keyHint(), TEST_KEY)
  assert.ok(!JSON.stringify(config()).includes(LIVE))
})

test("no key: demo mode with the test key", () => {
  set("MARKTMENTOR_DEMO", undefined)
  set("MARKTMENTOR_API_KEY", "")
  assert.equal(config().mode, "demo")
  assert.equal(config().apiKey, TEST_KEY)
})

test("a key without MARKTMENTOR_DEMO: live mode with that key", () => {
  set("MARKTMENTOR_DEMO", undefined)
  set("MARKTMENTOR_API_KEY", LIVE)
  assert.equal(config().mode, "live")
  assert.equal(config().apiKey, LIVE)
  assert.notEqual(keyHint(), LIVE)
})
