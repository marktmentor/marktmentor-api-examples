// The hosted demo (scripts/serve.mjs) starts only with the public test key.
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { demoEnvProblem } from "../scripts/demo-guard.mjs"

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SERVE = path.join(APP, "scripts/serve.mjs")
const LIVE = "mm_live_SMOKETESTCANARY0000"

test("a clean environment, or the test key, may start", () => {
  assert.equal(demoEnvProblem({ PATH: "/usr/bin" }), null)
  assert.equal(demoEnvProblem({ MARKTMENTOR_DEMO: "1" }), null)
  assert.equal(demoEnvProblem({ MARKTMENTOR_API_KEY: "mm_test_demo" }), null)
})

test("a live key in any variable stops the start, without its value", () => {
  for (const env of [
    { MARKTMENTOR_API_KEY: LIVE },
    { MARKTMENTOR_DEMO: "1", MARKTMENTOR_API_KEY: LIVE },
    { SOME_OTHER_SECRET: LIVE },
    { SOME_OTHER_SECRET: `Bearer ${LIVE}` },
  ]) {
    const problem = demoEnvProblem(env)
    assert.ok(problem, JSON.stringify(Object.keys(env)))
    assert.ok(!problem.includes(LIVE), "the message must not hold the key")
  }
})

test("another key or demo mode switched off stops the start", () => {
  assert.ok(demoEnvProblem({ MARKTMENTOR_API_KEY: "something-else" }))
  assert.ok(demoEnvProblem({ MARKTMENTOR_DEMO: "0" }))
  assert.ok(demoEnvProblem({ MARKTMENTOR_DEMO: "" }))
})

test("serve.mjs exits before it serves anything when a live key is present", () => {
  const work = mkdtempSync(path.join(tmpdir(), "mm-guard-"))
  try {
    const run = (env, cwd = work) =>
      spawnSync(process.execPath, [SERVE], {
        cwd,
        env: { PATH: process.env.PATH, PORT: "0", ...env },
        encoding: "utf8",
        timeout: 20_000,
      })
    const fromEnv = run({ MARKTMENTOR_API_KEY: LIVE })
    assert.equal(fromEnv.status, 1)
    assert.match(fromEnv.stderr, /not started/)
    assert.ok(!fromEnv.stderr.includes(LIVE))
    const other = run({ OTHER_TOKEN: LIVE })
    assert.equal(other.status, 1)
    assert.match(other.stderr, /OTHER_TOKEN/)
    // A .env file in the working directory counts too.
    writeFileSync(path.join(work, ".env"), `MARKTMENTOR_API_KEY=${LIVE}\n`)
    const fromFile = run({})
    assert.equal(fromFile.status, 1)
    assert.match(fromFile.stderr, /not started/)
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
})
