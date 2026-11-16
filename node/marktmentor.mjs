// A small client for the MarktMentor Public API. Node 20+, no dependencies.
//
// Environment variables:
//   MARKTMENTOR_API_KEY       required, starts with mm_live_
//   MARKTMENTOR_API_BASE_URL  optional, default https://api.marktmentor.nl
//   MARKTMENTOR_RESERVE       optional, default 25: stop when the research
//                             allowance has this many requests left

const DEFAULT_BASE_URL = "https://api.marktmentor.nl";
const API_PREFIX = "/api/public/v1/";
const MAX_RESULTS_PER_QUERY = 10_000;

export const EXPLANATIONS = {
  not_authenticated: "No key was sent. Set MARKTMENTOR_API_KEY.",
  authentication_failed:
    "The key is wrong, revoked, or its creator is no longer an administrator. Create a new key in Settings -> MarktMentor API.",
  api_terms_required:
    "An administrator must accept the API terms in the dashboard: Settings -> MarktMentor API.",
  product_research_api_required:
    "Research needs an API bundle or research access from MarktMentor. The store endpoints work without a bundle (Pro plan).",
  subscription_required:
    "Research needs an active paid MarktMentor Premium subscription or higher (a trial does not count). The store endpoints need Pro.",
  subscription_plan_required: "The store endpoints need the Pro plan or higher.",
  insufficient_scope: "The credential does not have the necessary scope.",
  store_not_connected: "Connect your bol store in the dashboard first.",
  bundle_exhausted: "All requests of the API bundle are used for this period.",
  overage_limit_reached: "The maximum for extra requests is reached.",
  free_quota_exhausted:
    "The 100 free research requests for this month are used. Choose an API bundle, or wait for the next calendar month.",
  ambiguous_ean:
    "More than one product has this EAN. Use one of the product codes in 'candidates'. A 409 does not count as a request.",
  product_not_found: "No bol product has this EAN or product code.",
  invalid_query: "A parameter is not valid. See 'errors' for the details.",
  rate_limit_exceeded: "Too many requests per minute.",
  not_found_html:
    "The path does not exist, the key is not valid, or the public API is not enabled for your organization yet (early access answers 404 to an unknown key). Check MARKTMENTOR_API_BASE_URL and ask MarktMentor to enable the API.",
};

/** MARKTMENTOR_RESERVE as a number of requests, 25 when it is not set or not valid. */
function reserveFromEnv() {
  const raw = process.env.MARKTMENTOR_RESERVE;
  if (raw === undefined || raw === "") return 25;
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 0) return n;
  console.error(`Warning: MARKTMENTOR_RESERVE=${raw} is not a whole number. Using 25.`);
  return 25;
}

export class ApiError extends Error {
  constructor(status, code, detail, body) {
    const hint = EXPLANATIONS[code];
    let message = `HTTP ${status} ${code}: ${detail}`;
    if (hint) message += `\n  -> ${hint}`;
    if (body?.errors) message += `\n  errors: ${JSON.stringify(body.errors)}`;
    super(message);
    Object.assign(this, { status, code, detail, body });
  }
}

export class AllowanceStop extends Error {}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const intHeader = (headers, name) => {
  const value = headers.get(name);
  return value === null || Number.isNaN(Number(value)) ? null : Number(value);
};

export class MarktMentor {
  constructor({ apiKey, baseUrl, reserve, maxRetries = 3 } = {}) {
    this.apiKey = apiKey ?? process.env.MARKTMENTOR_API_KEY ?? "";
    if (!this.apiKey) {
      console.error(
        "Set MARKTMENTOR_API_KEY first, for example:\n  export MARKTMENTOR_API_KEY='mm_live_...'\nCreate a key in the dashboard: Settings -> MarktMentor API.",
      );
      process.exit(1);
    }
    if (!this.apiKey.startsWith("mm_live_")) {
      console.error("Warning: an API key starts with mm_live_. Check the value.");
    }
    this.baseUrl = (baseUrl ?? process.env.MARKTMENTOR_API_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.reserve = reserve ?? reserveFromEnv();
    this.maxRetries = maxRetries;
    this.usage = { researchRequestsMade: 0, requestIds: [] };
  }

  url(path, params = {}) {
    let clean = path.replace(/^\/+/, "");
    if (!clean.endsWith("/")) clean += "/"; // without the slash the API answers with a 301
    const url = new URL(`${this.baseUrl}${API_PREFIX}${clean}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  async get(path, params = {}) {
    const research = path.replace(/^\/+/, "").startsWith("research/");
    if (research) this.#checkReserve();
    const url = this.url(path, params);
    for (let attempt = 1; ; attempt++) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
          "User-Agent": "marktmentor-api-examples/1.0 (node)",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(60_000),
      });
      this.#readHeaders(response.headers);
      if (response.ok) {
        if (research) this.usage.researchRequestsMade += 1;
        return response.json();
      }
      if (response.status === 429 && attempt <= this.maxRetries) {
        const wait = intHeader(response.headers, "Retry-After") ?? 60;
        console.error(`HTTP 429: waiting ${wait} s (Retry-After).`);
        await sleep(wait * 1000);
        continue;
      }
      if (response.status === 503 && attempt <= this.maxRetries) {
        console.error(`HTTP 503: retry in ${5 * attempt} s.`);
        await sleep(5000 * attempt);
        continue;
      }
      throw await this.#error(response);
    }
  }

  async #error(response) {
    const text = await response.text();
    if (!(response.headers.get("Content-Type") ?? "").includes("json")) {
      if (response.status === 404) {
        return new ApiError(404, "not_found_html", "The server answered with an HTML page.");
      }
      return new ApiError(response.status, "unexpected_response", text.slice(0, 200));
    }
    let body = {};
    try {
      body = JSON.parse(text);
    } catch {}
    return new ApiError(response.status, body.code ?? "request_failed", body.detail ?? "", body);
  }

  #readHeaders(headers) {
    const u = this.usage;
    for (const [key, name] of [
      ["rateLimit", "RateLimit-Limit"],
      ["rateRemaining", "RateLimit-Remaining"],
      ["rateResetSeconds", "RateLimit-Reset"],
      ["researchLimit", "X-Research-Requests-Limit"],
      ["researchRemaining", "X-Research-Requests-Remaining"],
    ]) {
      const value = intHeader(headers, name);
      if (value !== null) u[key] = value;
    }
    if (headers.get("X-Research-Requests-Reset")) u.researchReset = headers.get("X-Research-Requests-Reset");
    if (headers.get("X-Request-ID")) u.requestIds.push(headers.get("X-Request-ID"));
  }

  #checkReserve() {
    const remaining = this.usage.researchRemaining;
    if (remaining !== undefined && remaining <= this.reserve) {
      throw new AllowanceStop(
        `Stopped: ${remaining} research requests left, the reserve is ${this.reserve}. Set MARKTMENTOR_RESERVE to change it.`,
      );
    }
  }

  /** GET /usage/ (free). Also primes the remaining research allowance. */
  async loadUsage() {
    const usage = await this.get("usage/");
    if (usage.plan === "bundle" && usage.bundle) {
      this.usage.researchLimit = usage.bundle.includedRequests;
      this.usage.researchRemaining = usage.bundle.remainingRequests;
      this.usage.researchReset = usage.bundle.periodEnd;
    } else if (usage.plan === "free" && usage.freeTier) {
      // The free requests count too: stop at the reserve here as well.
      this.usage.researchLimit = usage.freeTier.limit;
      this.usage.researchRemaining = usage.freeTier.remaining;
      this.usage.researchReset = usage.freeTier.resetsAt;
    }
    return usage;
  }

  /** Yield one response per page; stops at hasNext=false, maxPages or 10,000 results. */
  async *pages(path, params, maxPages = Infinity) {
    const pageSize = Number(params.pageSize ?? 25);
    const lastPage = Math.floor(MAX_RESULTS_PER_QUERY / pageSize);
    for (let page = Number(params.page ?? 1); ; page++) {
      const body = await this.get(path, { ...params, page, pageSize });
      yield body;
      if (!body.pagination?.hasNext) return;
      if (page >= maxPages) {
        console.error(`Stopped after ${maxPages} page(s) (--max-pages).`);
        return;
      }
      if (page + 1 > lastPage) {
        console.error("Stopped at the depth limit of 10,000 results. Use filters to reach other products.");
        return;
      }
    }
  }

  summary() {
    const u = this.usage;
    const parts = [`research requests made by this run: ${u.researchRequestsMade}`];
    if (u.researchRemaining !== undefined) {
      parts.push(`allowance left: ${u.researchRemaining}/${u.researchLimit} (resets ${u.researchReset})`);
    }
    if (u.rateRemaining !== undefined) parts.push(`rate limit left: ${u.rateRemaining}/${u.rateLimit}`);
    return parts.join(", ");
  }
}

/**
 * CSV with quotes where needed. Values are written unchanged, except text that
 * starts with = + - @: it gets a ' first, so a spreadsheet does not run it as
 * a formula (a product title is text from a marketplace).
 */
export function toCsv(columns, rows) {
  const cell = (value) => {
    if (value === null || value === undefined) return "";
    let text = String(value);
    if (typeof value === "string" && /^[=+\-@]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [columns.join(","), ...rows.map((row) => columns.map((c) => cell(row[c])).join(","))].join("\n") + "\n";
}

/** Run a script and print API errors without a stack trace. */
export async function run(main) {
  try {
    await main();
  } catch (error) {
    if (error instanceof ApiError || error instanceof AllowanceStop) {
      console.error(`\n${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}
