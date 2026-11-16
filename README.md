# MarktMentor API examples

[Nederlands](README.nl.md)

Small, readable examples for the MarktMentor Public API. **They work with only
an API key.** With an active paid MarktMentor Premium subscription your
organization gets 100 free research requests per month, also with a key. You
need no API bundle to start.

**Where to start.** Want to see one call work? Take a script in `python/` or
`node/`: no install, five minutes. Want to see how a whole product uses the
API (cache, limits, errors, every endpoint)? Run the app in `app/`; without a
key it starts in demo mode.

| Folder    | What                                                                 |
| --------- | -------------------------------------------------------------------- |
| `python/` | Four scripts. Python 3.9 or later, standard library only.            |
| `node/`   | The same four scripts. Node 20 or later, no dependencies.            |
| `app/`    | A local web app in English and Dutch: TanStack Start, shadcn/ui and SQLite. See [app/README.md](app/README.md). |
| `tools/`  | A local mock of the API with sample data, for tests without a key.   |

Guides and reference: <https://api.marktmentor.nl>.

## Before you start

1. An administrator of your organization accepts the API terms in the
   dashboard: **Settings → MarktMentor API**.
2. An administrator creates an API key on the same page and copies it. The
   secret is shown only once. The key stops working when its creator is no
   longer an administrator of the organization.
3. Know what your key can read:
   - **Store endpoints** (your own bol store): the Pro plan and a connected store.
     They are free and need no bundle.
   - **Research endpoints** (products and niches): an active paid MarktMentor
     Premium subscription or higher. A trial does not count. Without a bundle
     the organization gets 100 free research requests per calendar month
     (UTC), with at most 10 results per page. The API reference in the browser
     and all API keys share these requests. An API bundle gives more. Without
     Premium, research calls get HTTP 403 `subscription_required`.

## Run in five minutes

```bash
export MARKTMENTOR_API_KEY='mm_live_...'   # your key; never put it in code

cd python                                  # or: cd node
python check.py                            # node check.mjs
```

`check` costs nothing. It shows your organization, your research plan and the
requests that are left.

| Script                          | Example                                     | Research requests          |
| ------------------------------- | ------------------------------------------- | -------------------------- |
| `check`                         | `python check.py`                           | 0                          |
| `products_to_csv` / `products-to-csv` | `python products_to_csv.py drinkfles --max-pages 2` | 1 per page         |
| `ean_history` / `ean-history`   | `python ean_history.py 5407005143414`       | 1 per EAN                  |
| `store_export` / `store-export` | `python store_export.py`                    | 0 (store requests are free) |

Add `--dry-run` to a script to see the plan and the requests it will use,
without using any. The Node scripts have the same options
(`node products-to-csv.mjs drinkfles --max-pages 2`).

## What the examples show

- **The key stays on your side.** It is read from `MARKTMENTOR_API_KEY` and sent
  as `Authorization: Bearer <key>`. Do not put it in source code, in a browser or
  in a mobile app.
- **Pagination.** `page` and `pageSize` (at most 25 for research). The scripts
  stop when `pagination.hasNext` is false, at `--max-pages`, and at the limit of
  10,000 results per query. To reach more products, use filters.
- **The allowance.** Each successful research response has
  `X-Research-Requests-Remaining`. The scripts stop before the allowance reaches
  `MARKTMENTOR_RESERVE` (default 25), and they stop on HTTP 402. They do not
  retry a 402 or a 403. On the 100 free requests, a reserve of 25 leaves 75
  to use: set `MARKTMENTOR_RESERVE=5` to use more of them.
- **The rate limit.** On HTTP 429 the scripts wait for `Retry-After` and try
  again. A 503 is retried a few times.
- **EAN to history.** Product paths accept `ean:` and the 13-digit EAN in place
  of the bol `productCode` (`research/products/ean:5407005143414/sales-history/`):
  one request per EAN. When more than one product has the EAN, the API answers
  HTTP 409 `ambiguous_ean` with the `candidates` and does not choose. The script
  prints them; run it again with `--code <productCode>`. A 409 is not counted.
- **History intervals.** `interval` is `week` or `month` (the default). With
  `period=2Y`, only `month`.
- **Clear errors.** Every error code is printed with what to do.
- **Values unchanged.** The CSV files contain the values as the API sends them.
  Round them only when you display them.

## Common problems

| You see                             | Cause and action                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| HTML `404 Not Found`                | Wrong base URL, or the API is not enabled for your organization yet (early access). Contact MarktMentor.     |
| `401 authentication_failed`         | Wrong or revoked key, or its creator is no longer an administrator. Create a new key.                        |
| `403 api_terms_required`            | An administrator accepts the API terms in the dashboard.                                                     |
| `403 subscription_required`         | Research needs an active paid Premium subscription. A trial does not count. Store scripts need Pro.          |
| `403 subscription_plan_required`    | Store endpoints need the Pro plan.                                                                           |
| `409 store_not_connected`           | Connect your bol store in the dashboard.                                                                     |
| `402 bundle_exhausted`              | The bundle is used up for this billing period.                                                               |
| `402 free_quota_exhausted`          | The 100 free requests of this month are used up. Choose a bundle, or wait for the next month.                |
| `409 ambiguous_ean`                 | More than one product has the EAN after `ean:`. Use a product code from `candidates`.                        |
| `400 invalid_query` on `interval`   | Use `week` or `month`; with `period=2Y` only `month`.                                                        |
| `301` with an empty body            | The path has no trailing slash. The client adds it for you.                                                  |

Save the `X-Request-ID` header of a research response when you contact support.

## Try without a key

`tools/mock_api.py` imitates the API on your computer with sample data from the
API reference. It is not live data.

```bash
python tools/mock_api.py &                 # http://127.0.0.1:8787
export MARKTMENTOR_API_BASE_URL=http://127.0.0.1:8787
export MARKTMENTOR_API_KEY=mm_live_demo
python python/check.py
```

Try `MOCK_REMAINING=3` to see how a script stops at the allowance,
`MOCK_RATE=5` to see the wait on HTTP 429, `MOCK_NO_BUNDLE=1` for the 100 free
requests of a key without a bundle, and `MOCK_NO_PREMIUM=1` for the HTTP 403 of
an organization without Premium. EAN `8712345678901` gets the HTTP 409.

The scripts print their messages in English. This README is also available
in [Dutch](README.nl.md).

## Use of the data

The [API terms](https://api.marktmentor.nl/guides/terms) apply. In short:

- Use the data for your own business. You may store it in your own systems as
  long as you need it for that use.
- Do not share your key, and do not give others access to the API or the data,
  for example by hosting these examples on a public server.
- Do not sell or publish the data, and do not build a competing product with it.
- Do not use more keys or organizations to avoid a limit.

Building an integration for other MarktMentor customers (OAuth)? Contact
MarktMentor first. See [Authentication](https://api.marktmentor.nl/guides/authentication).

## License

The code of these examples is under the [MIT license](LICENSE): you may copy,
change and use it, also in your own products. The license covers the code only.
The data that you get from the API stays under the API terms above. The sample
data in `demo-data/` is for trying the examples.
