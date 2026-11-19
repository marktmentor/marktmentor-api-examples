// Server-only settings. This import makes the build fail if a browser
// bundle ever imports this file, so the API key cannot reach the browser.
import "@tanstack/react-start/server-only"

import { existsSync } from "node:fs"
import path from "node:path"

const envFile = path.resolve(process.cwd(), ".env")
if (existsSync(envFile)) process.loadEnvFile(envFile)

export type Mode = "live" | "demo"

/**
 * The public test key of the API: fixed example answers, no organization, no
 * costs (see docs: test-key). Demo mode sends only this key.
 */
export const TEST_KEY = "mm_test_demo"

/** MARKTMENTOR_RESERVE as a whole number, 25 when it is not set or not valid. */
function reserveFromEnv() {
  const n = Number(process.env.MARKTMENTOR_RESERVE ?? 25)
  return Number.isInteger(n) && n >= 0 ? n : 25
}

/** The key for display: its prefix and last 4 characters, never the secret part. */
export function keyHint() {
  const { apiKey, mode } = config()
  // The test key is public, so demo mode shows it in full.
  if (mode === "demo") return apiKey
  return apiKey ? `${apiKey.slice(0, 8)}…${apiKey.slice(-4)}` : null
}

export function config() {
  // Read on each call, not at module scope: see the TanStack Start docs.
  // MARKTMENTOR_DEMO=1 wins: the app then does not read MARKTMENTOR_API_KEY
  // at all, so a live key in the environment can never be sent in demo mode.
  const forceDemo = process.env.MARKTMENTOR_DEMO === "1"
  const ownKey = forceDemo
    ? ""
    : (process.env.MARKTMENTOR_API_KEY?.trim() ?? "")
  const mode: Mode = ownKey ? "live" : "demo"
  return {
    // Demo mode: always the public test key, never another credential.
    apiKey: mode === "demo" ? TEST_KEY : ownKey,
    mode,
    baseUrl: (
      process.env.MARKTMENTOR_API_BASE_URL || "https://api.marktmentor.nl"
    ).replace(/\/+$/, ""),
    reserve: reserveFromEnv(),
    dbPath: path.resolve(
      process.cwd(),
      process.env.MARKTMENTOR_DB_PATH || "data/marktmentor.db"
    ),
  }
}
