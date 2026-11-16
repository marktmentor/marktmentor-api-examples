// Smoke test: start the app in demo mode and against the local mock API, open
// every page, and check that the API key never reaches the browser.
//   npm test
import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import path from "node:path"
import { after, before, describe, test } from "node:test"
import { fileURLToPath } from "node:url"

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MOCK = path.resolve(APP, "../tools/mock_api.py")
const CANARY = "mm_live_SMOKETESTCANARY0000"
const work = mkdtempSync(path.join(tmpdir(), "mm-app-test-"))
const children = []

const freePort = () =>
  new Promise((resolve) => {
    const s = createServer().listen(0, "127.0.0.1", () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
  })

async function start(cmd, args, env, ready) {
  const child = spawn(cmd, args, {
    cwd: APP,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  })
  children.push(child)
  let log = ""
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout starting ${cmd}:\n${log}`)),
      60_000
    )
    const onData = (d) => {
      log += d
      if (ready.test(log)) {
        clearTimeout(timer)
        resolve()
      }
    }
    child.stdout.on("data", onData)
    child.stderr.on("data", onData)
    child.on("exit", (code) =>
      reject(new Error(`${cmd} exited ${code}:\n${log}`))
    )
  })
  return child
}

async function startApp(env) {
  const port = await freePort()
  await start(
    process.execPath,
    [
      path.join(APP, "node_modules/vite/bin/vite.js"),
      "dev",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    {
      MARKTMENTOR_DB_PATH: path.join(work, `${port}.db`),
      MARKTMENTOR_API_KEY: "",
      ...env,
    },
    /Local:/
  )
  return `http://127.0.0.1:${port}`
}

async function page(base, p, lang) {
  const res = await fetch(base + p, {
    headers: lang ? { Cookie: `lang=${lang}` } : {},
  })
  const html = await res.text()
  assert.equal(res.status, 200, `${p} gave ${res.status}`)
  assert.ok(!html.includes(CANARY), `${p} contains the API key`)
  // React separates text parts with <!-- -->: remove them before matching.
  return html.replaceAll("<!-- -->", "")
}

after(() => {
  for (const c of children) c.kill()
  rmSync(work, { recursive: true, force: true })
})

test("the router does not preload pages (each preload would spend research requests)", () => {
  const router = readFileSync(path.join(APP, "src/router.tsx"), "utf8")
  assert.match(router, /defaultPreload: false/)
})

describe("demo mode", () => {
  let base
  before(async () => {
    base = await startApp({ MARKTMENTOR_DEMO: "1" })
  })
  test("every screen and every tab renders the sample data (English)", async () => {
    const pages = {
      "/": /Suggestions to follow/,
      "/products": /Best-selling products/,
      "/niches": /Niches with the highest search volume/,
      "/usage": /Voorbeeldwinkel BV/,
      "/products?q=drinkfles": /Kambukka Elton/,
      "/products?q=drinkfles&market=NL&period=90d&minSales=10&brand=Kambukka":
        /Brand: Kambukka/,
      "/products/9300000138905032": /Sales history/,
      "/products/9300000138905032?tab=visibility": /Visibility history/,
      "/products/9300000138905032?tab=rankings": /Category rankings/,
      "/products/9300000138905032?tab=keywords": /duurzaam/,
      "/products/9300000138905032?tab=sellers": /bol\.com/,
      "/products/9300000138905032?tab=reviews": /Review summary/,
      "/products/9300000138905032?tab=variants": /Variants/,
      "/products/9300000138905032?tab=snapshots": /Your snapshots/,
      "/niches?q=drinkfles": /dopper drinkfles/,
      "/niches/6797": /Products in this niche/,
      "/niches/6797?tab=periods": /Compare periods/,
      "/niches/6797?tab=distributions": /Product distribution/,
      "/niches/6797?tab=reviews": /Review summary/,
      "/niches/6797?tab=reviewHistory": /New reviews/,
      "/store": /Voorbeeld drinkfles 750 ml/,
      "/store?tab=stock": /stale_stock/,
    }
    for (const [path, expected] of Object.entries(pages)) {
      assert.match(await page(base, path), /Demo mode/, path)
      assert.match(await page(base, path), expected, path)
    }
  })
  test("the language follows the cookie (Dutch)", async () => {
    const html = await page(base, "/", "nl")
    assert.match(html, /<html lang="nl"/)
    assert.match(html, /Demo-modus/)
    assert.match(await page(base, "/store", "nl"), /Mijn winkel/)
  })
  test("keyword rankings: a table row per keyword", async () => {
    const html = await page(
      base,
      "/products/9300000138905032?tab=keywordRankings"
    )
    assert.match(html, /Keyword rankings/)
    assert.match(html, /drinkfles volwassenen/)
  })
  test("list and detail show the same sales for a product", async () => {
    // Kambukka Elton: NL 148 + BE 45 = 193 in the sample data.
    assert.match(await page(base, "/products?q=drinkfles"), />193</)
    assert.match(await page(base, "/products/9300000138905032"), />193</)
  })
})

const hasPython = spawnSync("python3", ["--version"]).status === 0

describe(
  "live mode against the local mock API",
  { skip: !hasPython && "python3 not found" },
  () => {
    let base
    let mockLog = ""
    before(async () => {
      const mockPort = await freePort()
      const mock = await start(
        "python3",
        ["-u", MOCK],
        { MOCK_PORT: String(mockPort), MOCK_REMAINING: "40" },
        /Mock MarktMentor API/
      )
      mock.stdout.on("data", (d) => (mockLog += d))
      base = await startApp({
        MARKTMENTOR_API_KEY: CANARY,
        MARKTMENTOR_API_BASE_URL: `http://127.0.0.1:${mockPort}`,
        MARKTMENTOR_RESERVE: "25",
      })
    })
    test("store ratios in percent, the review family switch, the store category filter", async () => {
      // totalMargin 37.5 in the sample row: shown as is, not as 3,750%.
      const store = await page(base, "/store?tab=products")
      assert.match(store, /37\.5%/)
      assert.doesNotMatch(store, /3,750/)
      const reviews = await page(
        base,
        "/products/9300000138905032?tab=reviews&reviewsOwn=true"
      )
      // The note under the summary (a Select shows its value only in the browser).
      assert.match(reviews, /Only the reviews written for this EAN/)
      assert.match(mockLog, /reviews\/\?[^ ]*includeVariants=false/)
      assert.match(mockLog, /reviews\/summary\/\?includeVariants=false/)
      await page(base, "/store?tab=products&categoryId=40142")
      assert.match(mockLog, /store\/products\/\?[^ ]*categoryId=40142/)
    })
    test("pages render live data, the key stays on the server", async () => {
      assert.doesNotMatch(await page(base, "/"), /Demo mode/)
      assert.match(await page(base, "/usage"), /Voorbeeldwinkel BV/)
      assert.match(await page(base, "/products?q=drinkfles"), />Live</)
      assert.match(
        await page(base, "/products?q=drinkfles"),
        />Cache</,
        "a repeated search comes from the cache"
      )
      assert.match(await page(base, "/store"), />Live</)
    })
    test("the app stops at the reserve", async () => {
      // Spend research requests until the reserve (25) is reached.
      let html = ""
      for (let i = 0; i < 20 && !/Stopped at the reserve/.test(html); i++)
        html = await page(base, `/products?q=reserve${i}`)
      assert.match(html, /Stopped at the reserve/)
    })
  }
)

describe(
  "the per-minute limit against the local mock API",
  { skip: !hasPython && "python3 not found" },
  () => {
    let base
    before(async () => {
      const mockPort = await freePort()
      // 4 requests per minute: the fifth call gets HTTP 429 with Retry-After.
      await start(
        "python3",
        ["-u", MOCK],
        { MOCK_PORT: String(mockPort), MOCK_RATE: "4" },
        /Mock MarktMentor API/
      )
      base = await startApp({
        MARKTMENTOR_API_KEY: CANARY,
        MARKTMENTOR_API_BASE_URL: `http://127.0.0.1:${mockPort}`,
      })
    })
    test("a 429 shows the wait, the log and the meter", async () => {
      // Search until the mock answers 429 (it allows 4 calls per minute).
      let limited = ""
      for (const q of ["a", "b", "c", "d", "e", "f"]) {
        limited = await page(base, `/products?q=${q}`)
        if (/Please wait/.test(limited)) break
      }
      assert.match(limited, /Please wait/)
      assert.match(limited, /Try again in \d+ seconds/)
      const usage = await page(base, "/usage")
      assert.match(usage, /Limits per minute/)
      assert.match(usage, /Recent requests/)
      assert.match(usage, />429</)
      assert.match(usage, /\d+ s</, "Retry-After in the log")
    })
  }
)

describe(
  "default lists without research access",
  { skip: !hasPython && "python3 not found" },
  () => {
    let base
    let mockLog = ""
    before(async () => {
      const mockPort = await freePort()
      const mock = await start(
        "python3",
        ["-u", MOCK],
        { MOCK_PORT: String(mockPort), MOCK_NO_PREMIUM: "1" },
        /Mock MarktMentor API/
      )
      mock.stdout.on("data", (d) => (mockLog += d))
      mock.stderr.on("data", (d) => (mockLog += d))
      base = await startApp({
        MARKTMENTOR_API_KEY: CANARY,
        MARKTMENTOR_API_BASE_URL: `http://127.0.0.1:${mockPort}`,
      })
    })
    test("the first visit explains the 403, later visits do not ask again", async () => {
      const first = await page(base, "/products")
      assert.match(first, /subscription_required/)
      assert.match(first, /paid MarktMentor Premium subscription/)
      const calls = () =>
        (mockLog.match(/GET \/api\/public\/v1\/research\/products\/\?/g) ?? [])
          .length
      const before = calls()
      assert.match(await page(base, "/products"), /No research access/)
      assert.match(await page(base, "/"), /No research access/)
      assert.equal(calls(), before, "no new research request after the 403")
    })
  }
)

describe(
  "the free requests of a key without a bundle (Premium)",
  { skip: !hasPython && "python3 not found" },
  () => {
    let base
    let mockUrl
    let mockLog = ""
    before(async () => {
      const mockPort = await freePort()
      mockUrl = `http://127.0.0.1:${mockPort}/api/public/v1/`
      const mock = await start(
        "python3",
        ["-u", MOCK],
        { MOCK_PORT: String(mockPort), MOCK_NO_BUNDLE: "1" },
        /Mock MarktMentor API/
      )
      mock.stdout.on("data", (d) => (mockLog += d))
      mock.stderr.on("data", (d) => (mockLog += d))
      base = await startApp({
        MARKTMENTOR_API_KEY: CANARY,
        MARKTMENTOR_API_BASE_URL: `http://127.0.0.1:${mockPort}`,
        MARKTMENTOR_RESERVE: "5",
      })
    })
    test("usage/ says free: the meter counts the 100 free requests", async () => {
      const usage = await page(base, "/usage")
      assert.match(usage, /Free requests \(100 per month\)/)
      assert.match(usage, /100 left/)
      assert.match(usage, /shared by all API keys and the portal/)
      // Research works with only the key.
      assert.match(await page(base, "/products?q=drinkfles"), />Live</)
    })
    test("history: week is not sent with two years", async () => {
      await page(
        base,
        "/products/9300000138905032?tab=sales&period=2Y&interval=week"
      )
      assert.match(
        mockLog,
        /sales-history\/\?[^ ]*period=2Y[^ ]*interval=month/
      )
      assert.doesNotMatch(mockLog, /period=2Y[^ ]*interval=week/)
    })
    test("ean: in a product path: one product, 404 or 409 with candidates", async () => {
      const get = (path) =>
        fetch(mockUrl + path, {
          headers: { Authorization: `Bearer ${CANARY}` },
        })
      const ok = await get("research/products/ean:5407005143414/sales-history/")
      assert.equal(ok.status, 200)
      const left = ok.headers.get("X-Research-Requests-Remaining")
      const twice = await get(
        "research/products/ean:8712345678901/sales-history/"
      )
      assert.equal(twice.status, 409)
      const body = await twice.json()
      assert.equal(body.code, "ambiguous_ean")
      assert.equal(body.candidates.length, 2)
      const none = await get("research/products/ean:1234567890123/")
      assert.equal(none.status, 404)
      assert.equal((await none.json()).code, "product_not_found")
      const day = await get(
        "research/products/9300000138905032/sales-history/?interval=day"
      )
      assert.equal(day.status, 400)
      const after = await get("research/products/ean:5407005143414/")
      assert.equal(
        Number(after.headers.get("X-Research-Requests-Remaining")),
        Number(left) - 1,
        "the 409, 404 and 400 did not count"
      )
    })
  }
)

describe(
  "a failed bundle payment and a store outage against the local mock API",
  { skip: !hasPython && "python3 not found" },
  () => {
    let base
    before(async () => {
      const mockPort = await freePort()
      await start(
        "python3",
        ["-u", MOCK],
        {
          MOCK_PORT: String(mockPort),
          MOCK_PAYMENT_FAILED: "1",
          MOCK_STORE_DOWN: "1",
        },
        /Mock MarktMentor API/
      )
      base = await startApp({
        MARKTMENTOR_API_KEY: CANARY,
        MARKTMENTOR_API_BASE_URL: `http://127.0.0.1:${mockPort}`,
      })
    })
    test("each code gets its own text", async () => {
      assert.match(
        await page(base, "/products?q=drinkfles"),
        /bundle_payment_failed[\s\S]*payment for your API bundle failed/
      )
      // The default list: the first visit shows the 403 itself, the next one
      // skips the list with the payment reason, not "no access".
      assert.match(await page(base, "/products"), /bundle_payment_failed/)
      assert.match(await page(base, "/products"), /Bundle payment failed/)
      assert.match(
        await page(base, "/store"),
        /store_unavailable[\s\S]*store data is temporarily unavailable/
      )
    })
  }
)
