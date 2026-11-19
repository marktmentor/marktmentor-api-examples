// Production server of the app: serves the build of `npm run build` (dist/)
// in demo mode, with the public test key only. This is the start command of
// the hosted demo (Dockerfile, https://api-demo.marktmentor.nl).
//
//   npm run build && npm run serve      # http://0.0.0.0:8080
//
// Settings: PORT (default 8080), HOST (default 0.0.0.0),
// MARKTMENTOR_DB_PATH (default data/marktmentor.db; a writable path) and
// MARKTMENTOR_SEARCH_INDEXING ("off", the default: noindex; see robots.mjs).
// For your own data with a live key, use `npm run dev` on your own computer:
// this server refuses to start when it finds a live key.
import { accessSync, constants, existsSync, mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { demoEnvProblem } from "./demo-guard.mjs"
import { robotsMiddleware, robotsPolicy } from "./robots.mjs"

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

// The app reads .env from the working directory (src/server/config.ts): load
// it here first, so the check below sees those values too.
const envFile = path.resolve(process.cwd(), ".env")
if (existsSync(envFile)) process.loadEnvFile(envFile)

const problem = demoEnvProblem(process.env)
if (problem) {
  console.error(`api-demo: not started: ${problem}`)
  process.exit(1)
}
let robots
try {
  robots = robotsMiddleware(
    robotsPolicy(process.env.MARKTMENTOR_SEARCH_INDEXING)
  )
} catch (error) {
  console.error(`api-demo: not started: ${error.message}`)
  process.exit(1)
}

// Demo mode always: the app then sends only the public test key.
process.env.MARKTMENTOR_DEMO = "1"
delete process.env.MARKTMENTOR_API_KEY

// The SQLite cache must be writable (an emptyDir volume in Kubernetes).
const dbPath = path.resolve(
  process.cwd(),
  process.env.MARKTMENTOR_DB_PATH || "data/marktmentor.db"
)
try {
  mkdirSync(path.dirname(dbPath), { recursive: true })
  accessSync(path.dirname(dbPath), constants.W_OK)
} catch (error) {
  console.error(
    `api-demo: not started: ${path.dirname(dbPath)} is not writable (${error.code}): give it a writable volume`
  )
  process.exit(1)
}

const { serve } = await import("srvx")
const { staticMiddleware } = await import("srvx/static")
const { default: app } = await import(
  pathToFileURL(path.join(APP, "dist/server/server.js")).href
)

const health = (request, next) =>
  new URL(request.url).pathname === "/healthz"
    ? new Response("ok\n", {
        headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
      })
    : next()

const clientDir = path.join(APP, "dist/client")
// File names in assets/ hold a hash of the content: browsers may keep them.
const assets = staticMiddleware({
  dir: clientDir,
  maxAge: 31536000,
  immutable: true,
})
const files = staticMiddleware({ dir: clientDir })
const statics = (request, next) =>
  new URL(request.url).pathname.startsWith("/assets/")
    ? assets(request, next)
    : files(request, next)

serve({
  port: Number(process.env.PORT || 8080),
  hostname: process.env.HOST || "0.0.0.0",
  // robots first: it wraps every response, also /healthz and the files.
  middleware: [robots, health, statics],
  fetch: app.fetch,
})
