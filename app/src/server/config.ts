// Server-only settings. This import makes the build fail if a browser
// bundle ever imports this file, so the API key cannot reach the browser.
import "@tanstack/react-start/server-only"

import { existsSync } from "node:fs"
import path from "node:path"

const envFile = path.resolve(process.cwd(), ".env")
if (existsSync(envFile)) process.loadEnvFile(envFile)

export type Mode = "live" | "demo"
/** MARKTMENTOR_RESERVE as a whole number, 25 when it is not set or not valid. */
function reserveFromEnv() {
  const n = Number(process.env.MARKTMENTOR_RESERVE ?? 25)
  return Number.isInteger(n) && n >= 0 ? n : 25
}

/** The key for display: its prefix and last 4 characters, never the secret part. */
export function keyHint() {
  const key = config().apiKey
  return key ? `${key.slice(0, 8)}…${key.slice(-4)}` : null
}

export function config() {
  // Read on each call, not at module scope: see the TanStack Start docs.
  const apiKey = process.env.MARKTMENTOR_API_KEY?.trim() ?? ""
  const forceDemo = process.env.MARKTMENTOR_DEMO === "1"
  return {
    apiKey,
    mode: forceDemo || !apiKey ? ("demo" as const) : ("live" as const),
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
