# MarktMentor API examples

[Nederlands](README.nl.md)

Small, readable examples for the MarktMentor Public API, built on the official
SDKs: [`marktmentor`](https://pypi.org/project/marktmentor/) for Python and
[`@marktmentor/api`](https://www.npmjs.com/package/@marktmentor/api) for
TypeScript. **They work with only an API key.** With an active paid MarktMentor Premium subscription your
organization gets 100 free research requests per month, also with a key. You
need no API bundle to start.

**Where to start.** Want a CSV file or one call that works? Take a script in
`python/`: five minutes. Want to see how a whole product uses the
API (cache, limits, errors, every endpoint)? Run the app in `app/`; without a
key it starts in demo mode with the public test key. See the demo on
https://api-demo.marktmentor.nl.

| Folder    | What                                                                 |
| --------- | -------------------------------------------------------------------- |
| `python/` | Four scripts on the Python SDK. Python 3.10 or later.                |
| `app/`    | A local web app on the TypeScript SDK, in English and Dutch: TanStack Start, shadcn/ui and SQLite. See [app/README.md](app/README.md). |
| `tools/`  | A local mock of the API with sample data, for tests without a key.   |

Guides and reference: <https://api.marktmentor.nl>.

## Before you start

1. The owner or an administrator of your organization accepts the
   [general terms of MarktMentor](https://www.marktmentor.nl/TermsAndConditions.pdf) (English translation; the [Dutch text](https://www.marktmentor.nl/AlgemeneVoorwaarden.pdf) prevails) in the dashboard:
   **Settings → MarktMentor API**.
2. An administrator creates an API key on the same page and copies it. The
   secret is shown only once. The key stops working when its creator is no
   longer an administrator of the organization.
3. Know what your key can read. The whole API needs an active paid MarktMentor
   Premium subscription or higher; a trial does not count.
   - **Store endpoints** (your own bol store): a connected store. They are free
     and need no bundle.
   - **Research endpoints** (products and niches): without a bundle
     the organization gets 100 free research requests per calendar month
     (UTC), with at most 25 results per page. The API reference in the browser
     and all API keys share these requests. An API bundle gives more. Without
     Premium, research calls get HTTP 403 `subscription_required`.

## Run in five minutes

```bash
export MARKTMENTOR_API_KEY='mm_live_...'   # your key; never put it in code

cd python
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt            # the SDK: marktmentor
python check.py
```

`check` costs nothing. It shows your organization, your research plan and the
requests that are left.

| Script            | Example                                             | Research requests           |
| ----------------- | --------------------------------------------------- | --------------------------- |
| `check`           | `python check.py`                                   | 0                           |
| `products_to_csv` | `python products_to_csv.py drinkfles --max-pages 2` | 1 per page                  |
| `ean_history`     | `python ean_history.py 5407005143414`               | 1 per EAN                   |
| `store_export`    | `python store_export.py`                            | 0 (store requests are free) |

Add `--dry-run` to a script to see the plan and the requests it will use,
without using any.

The SDK sends the requests, gives typed answers and retries HTTP 429 and 5xx.
`python/common.py` adds what a script that spends requests also needs: the
reserve, a count of the requests of the run, and the error codes in plain
words.

## What the examples show

- **The key stays on your side.** It is read from `MARKTMENTOR_API_KEY` and the
  SDK sends it as `Authorization: Bearer <key>`. Do not put it in source code, in a browser or
  in a mobile app.
- **Pagination.** `page` and `pageSize` (at most 25 for research). The SDK
  follows the pages; the scripts stop when `pagination.hasNext` is false, at `--max-pages`, and at the limit of
  10,000 results per query. To reach more products, use filters.
- **The allowance.** Each successful research response has
  `X-Research-Requests-Remaining`. The scripts read it in a hook of the HTTP
  client of the SDK, and stop before the allowance reaches
  `MARKTMENTOR_RESERVE` (default 25), and they stop on HTTP 402. They do not
  retry a 402 or a 403. On the 100 free requests, a reserve of 25 leaves 75
  to use: set `MARKTMENTOR_RESERVE=5` to use more of them.
- **The rate limit.** Each call group has its own limit per minute: 60 for
  research, store and account calls, 120 for reference lookups, and 30 with
  the public test key. On HTTP 429 the SDK waits for `Retry-After` and tries
  again. A 5xx is retried a few times too. The SDK does not retry a 409.
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
| `403 api_terms_required`            | The owner or an administrator accepts the general terms in the dashboard.                                    |
| `403 subscription_required`         | The API needs an active paid Premium subscription. A trial does not count.                                   |
| `403 bundle_payment_failed`         | The renewal payment of the API bundle failed. The owner updates the payment method in the dashboard.         |
| `409 store_not_connected`           | Connect your bol store in the dashboard.                                                                     |
| `402 bundle_exhausted`              | The bundle is used up for this billing period.                                                               |
| `402 free_quota_exhausted`          | The 100 free requests of this month are used up. Choose a bundle, or wait for the next month.                |
| `409 ambiguous_ean`                 | More than one product has the EAN after `ean:`. Use a product code from `candidates`.                        |
| `400 invalid_query` on `interval`   | Use `week` or `month`; with `period=2Y` only `month`.                                                        |
| `301` with an empty body            | The path has no trailing slash. The SDK adds it for you.                                                     |

Save the `X-Request-ID` header of a research response when you contact support.
The scripts print it with each error.

## Try without a key

`tools/mock_api.py` imitates the API on your computer with sample data from the
API reference. It is not live data.

```bash
python tools/mock_api.py &                 # http://127.0.0.1:8787
export MARKTMENTOR_API_BASE_URL=http://127.0.0.1:8787
export MARKTMENTOR_API_KEY=mm_live_demo
python python/check.py                     # in the .venv of python/
```

Try `MOCK_REMAINING=3` to see how a script stops at the allowance,
`MOCK_RATE=5` to see the wait on HTTP 429, `MOCK_NO_BUNDLE=1` for the 100 free
requests of a key without a bundle, and `MOCK_NO_PREMIUM=1` for the HTTP 403 of
an organization without Premium. EAN `8712345678901` gets the HTTP 409.

The scripts print their messages in English. This README is also available
in [Dutch](README.nl.md).

## Use of the data

The [general terms of MarktMentor](https://www.marktmentor.nl/TermsAndConditions.pdf) (English translation; the [Dutch text](https://www.marktmentor.nl/AlgemeneVoorwaarden.pdf) prevails) apply to the API and its data.

- Use the data for your own business.
- Do not share your key, and do not give others access to the API or the data,
  for example by hosting these examples with your key on a public server.
  Public hosting is fine only in demo mode with the public test key
  `mm_test_demo` (see [app/README.md](app/README.md)), never with a live key.

Building an integration for other MarktMentor customers (OAuth)? Contact
MarktMentor first. See [Authentication](https://api.marktmentor.nl/guides/authentication).

## License

The code of these examples is under the [MIT license](LICENSE): you may copy,
change and use it, also in your own products. The license covers the code only.
The data that you get from the API stays under the general terms above. The sample
data in `demo-data/` (used by the mock API in `tools/`) is for trying the
examples.
