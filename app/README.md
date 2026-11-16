# MarktMentor API example app

[Nederlands](README.nl.md)

A small local web app on the MarktMentor Public API, in English and Dutch.
Search products and follow them, see the sales history as a chart, explore a
niche and its products, and read your own store. API data is kept in a local
SQLite file.

Built from the official shadcn/ui template for
[TanStack Start](https://tanstack.com/start) (`shadcn init -t start`, style
radix-nova, base colour neutral) with [shadcn/ui](https://ui.shadcn.com)
components only, and [better-sqlite3](https://github.com/WiseLibs/better-sqlite3).
All versions are pinned in `package.json` and `package-lock.json`.

## Start in five minutes

You need Node.js 22.12 or later.

```bash
cd app
npm install
npm start               # http://127.0.0.1:4321
```

Without a key, the app starts in **demo mode** with sample data from the API
reference. For your own data:

```bash
cp ../.env.example .env # then put your key in .env
npm start
```

| Variable                   | Meaning                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `MARKTMENTOR_API_KEY`      | Your API key (`mm_live_…`). Without it: demo mode.             |
| `MARKTMENTOR_API_BASE_URL` | Default `https://api.marktmentor.nl`.                          |
| `MARKTMENTOR_RESERVE`      | Default 25. Research requests stop at this many left.          |
| `MARKTMENTOR_DB_PATH`      | Default `data/marktmentor.db`.                                 |
| `MARKTMENTOR_DEMO`         | `1` forces demo mode, also with a key.                         |
| `MARKTMENTOR_ALLOWED_HOSTS` | Extra host names for the dev server, e.g. behind a reverse proxy. |

A second instance with its own database, for example against a test server:

```bash
MARKTMENTOR_API_BASE_URL=https://test.example MARKTMENTOR_API_KEY=mm_live_… \
MARKTMENTOR_DB_PATH=data/second.db npx vite dev --host 127.0.0.1 --port 4322 --strictPort
```

Variables set in the shell win over `.env`.

The app works with only a key. With a paid Premium subscription and no bundle,
the organization has 100 free research requests per month (at most 10 results
per page); the usage page shows how many are left. Lower `MARKTMENTOR_RESERVE`
(for example to 5) to use more of them. Without Premium, the research pages
show HTTP 403 `subscription_required` with an explanation. **My store** works
without a bundle (Pro plan and a connected store).

## Screens

- **Overview**: the products you follow (figures, one chart, rows with a trend line) and your store at a glance.
- **Products** and **Niches**: every search parameter in a filter bar, kept in the URL.
- **Product** and **niche pages**: one tab per endpoint. A tab fetches only when you open it.
- **My store**: the three store endpoints with all their parameters.
- **API usage**: connection, plan, limits per minute, the log of calls and the local data.

[COVERAGE.md](COVERAGE.md) lists every endpoint and parameter and where it is in the app.

## How it works

```
page ──(server function)──> src/api/*.ts ──> src/server/client.ts ──> api.marktmentor.nl
                                         └─> src/server/cache.ts, request-log.ts (SQLite)
```

| Folder | What | Runs in |
| --- | --- | --- |
| `src/routes/` | One file per page. A detail page keeps its URL schema, tab loader and tab panel next to it in `-product/` or `-niche/`. | browser and server |
| `src/api/` | Server functions (`createServerFn`), one file per subject: products, niches, store, reference, account, followed products, overview, usage meter. The only bridge between pages and API. | server (the browser gets the results) |
| `src/server/` | The API client, the cache, the limits, the request log, the demo data and the database. Reads the key. | server only |
| `src/lib/` | Pure code that pages and server share: filters, units, the change rule, the data day, types. No API calls. | both |
| `src/components/` | Screens and parts, by subject. `ui/` is shadcn/ui as generated. | browser |
| `tests/` | Node test runner: rules, translations, demo mode and live mode against `../tools/mock_api.py`. | |

- **The key stays on the server.** Only `src/server/` reads the key. Those
  files import `@tanstack/react-start/server-only`, so a build fails if browser
  code imports them. Pages call server functions (`createServerFn`) and get
  only the results. The server listens on 127.0.0.1 only.
- **Cache per day.** Research data is a daily snapshot (`updatedAt`). It
  refreshes once a day between 01:00 and 06:30 Dutch time, so the app keeps
  each research answer in SQLite until 07:00 the next morning (Amsterdam). A
  repeated question costs nothing. Store data is not cached. The free
  reference lookups are kept for the same day.
- **What a page fetches on its own.** A page may fetch its own default
  content once when it opens, if that costs one research request and stays in
  the cache for the day: the best-selling products on Products, the niches
  with the highest search volume on Niches, and suggestions on an empty
  overview. A product or niche page fetches what you opened: the product or
  niche (1 request) and the open tab (1; Reviews 2: the totals and the list).
  Everything else that goes per product (other tabs, trend lines) waits for a
  click that says what it costs. Without research access, or at the reserve,
  the page shows why instead of fetching.
- **No preloading.** The router does not preload pages on hover. Each page
  can call the API, and every research request uses allowance and counts
  toward the limit of 30 per minute.
- **Usage.** The meter in the sidebar shows `X-Research-Requests-Remaining`
  from the last response. A badge on each result tells you whether the data
  came live (one request), from the cache (free) or from the sample data.
  After each action (a filter, market, period or tab), the meter shows what
  it cost: `+1`, the answers from the cache, and the free calls. Click it for
  the last calls. It reads the local request log only and never calls the API.
  The log belongs to the app server, so calls from other tabs show up too.
- **Errors.** 401, 402, 403, 404, 409 and 429 get a message with what to do.
  At the reserve, the app stops before the bundle or the free requests are used up.
- **Follow products.** A followed product gets one snapshot per day in the
  local database. **Refresh** on the overview refreshes them all, at most one
  request per product per day.
- **Values unchanged.** The database and the CSV files hold the values as the
  API sends them. Pages round them only for display.

## Languages and theme

- All texts are in `src/i18n/en.json` and `src/i18n/nl.json`. Components read
  them through `useI18n()`. Numbers, money and dates use `Intl` (`en-GB`,
  `nl-NL`). CSV files do not depend on the language.
- The first visit uses the browser language. The language menu in the header
  saves the choice in a cookie on this computer.
- Light, dark and system theme follow the
  [shadcn/ui guide for TanStack Start](https://ui.shadcn.com/docs/dark-mode/tanstack-start).

To add a language: copy `en.json`, translate it and add it to `LOCALES` in
`src/i18n/index.tsx`. `npm test` checks that every language has the same keys
and placeholders.

## Your data

The [API terms](https://api.marktmentor.nl/guides/terms) apply to the data,
also in the local database. Use it for your own business only. Do not host
this app where others can reach it, and do not share the database. Use
**Clear local data** on the API usage page, or delete `data/`, when you no
longer need the data or when your API access ends.

## Checks

```bash
npm test          # translations, demo mode, and live mode against ../tools/mock_api.py
npm run typecheck
npm run lint
```

## Notes

- `npm start` runs the Vite dev server. That is enough for a local tool. A
  production server needs a deployment adapter (Nitro 3, still in beta); this
  example is not meant to be hosted.
- The router writes a number-like search text in quotes in the URL
  (`?ean=%225407…%22`). That is its standard format.
