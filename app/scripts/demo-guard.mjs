// The start check of the hosted demo (scripts/serve.mjs). The hosted demo is
// public, so it may only use the public test key. It refuses to start when
// the environment holds anything that could be a live credential.

export const TEST_KEY = "mm_test_demo"
const LIVE_PREFIX = "mm_live_"

/** The reason not to start, or null when the environment is safe. */
export function demoEnvProblem(env) {
  const demo = env.MARKTMENTOR_DEMO
  if (demo !== undefined && demo !== "1")
    return "the hosted demo runs only in demo mode: set MARKTMENTOR_DEMO=1 or leave it out"
  const key = (env.MARKTMENTOR_API_KEY ?? "").trim()
  if (key && key !== TEST_KEY)
    return "MARKTMENTOR_API_KEY is set: remove it, the hosted demo uses only the public test key"
  // Any variable, any name: a live key must not be in this process at all.
  // The message names the variable, never its value.
  const found = Object.entries(env).find(
    ([, value]) => typeof value === "string" && value.includes(LIVE_PREFIX)
  )
  if (found)
    return `the environment variable ${found[0]} holds a live API key (${LIVE_PREFIX}…): remove it`
  return null
}
