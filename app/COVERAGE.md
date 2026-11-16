# API coverage

Every endpoint and query parameter of the [API reference](https://api.marktmentor.nl) (25
endpoints), and where you use it in the app. "Fixed" means the app sends one
value on purpose, with the reason.

## Product Research: products

| Endpoint | Parameter | Where in the app |
| --- | --- | --- |
| `research/products/` | `search`, `ean` | Products: search field, EAN field |
| | `market` | Products: NL + BE / NL / BE |
| | `period` | Products: 30 days / 90 days / 1 year |
| | `sort` | Products: sort select (6 values). Revenue and price sorts only with NL + BE (API rule) |
| | `brand`, `categoryId` | Products: More filters (brand and category pickers, see Reference) |
| | `minSales`, `maxSales` | Products: More filters |
| | `minRevenue`, `maxRevenue`, `minPrice`, `maxPrice` | Products: More filters, only with NL + BE (API rule) |
| | `minRating`, `maxRating` | Products: More filters |
| | `page` | Products: pagination (10,000 result limit shown) |
| | `pageSize` | Products: 10 or 25 per page (25 is the maximum) |
| | `variantsOf` | Product page: tab Variants |
| `research/products/{code}/` | `market`, `period` | Product page: header toggles; the extra fields in "Product details" |
| | `ean:<EAN>` in place of `{code}` | Not used: the app reaches a product from a list, so it always has the product code. The `ean_history` scripts use it |
| `…/sales-history/` | `market`, `period`, `interval` | Product page: tab Sales |
| `…/visibility-history/` | `market`, `period`, `interval` | Product page: tab Visibility |
| `…/category-rankings/` | `market`, `period`, `interval` | Product page: tab Category rankings |
| `…/keyword-rankings/` | `market`, `period`, `interval` | Product page: tab Keyword rankings (the 10 keywords with the most search volume, the API default). |
| | `keywordIds` | Not used: the tab shows the API default |
| | `interval` | Per week or per month (the API default). With 2 years only per month: the app does not offer week then |
| `…/keywords/` | `market`, `period`, `page` | Product page: tab Keywords |
| | `pageSize` | Fixed 25: the maximum, each page is one request |
| `…/sellers/` | `market`, `period` | Product page: tab Sellers (buy box, listing changes) |
| `…/reviews/` | `period`, `score`, `verified`, `sort`, `search`, `page` | Product page: tab Reviews |
| | `market` | Fixed ALL: the only accepted value |
| | `pageSize` | Fixed 10: a readable list of review texts |
| `…/reviews/summary/` | (none) | Product page: tab Reviews |
| `…/reviews/`, `…/reviews/summary/` | `includeVariants` | Tab Reviews, switch "whole product family / only this product" (sends `false` for this product only; the API default is the family) |

## Product Research: niches

| Endpoint | Parameter | Where in the app |
| --- | --- | --- |
| `research/niches/` | `search`, `categoryId` | Niches: search field, category ID (category picker) |
| | `market`, `period`, `sort` | Niches: toggles and selects |
| | `page`, `pageSize` | Niches: pagination, 10 or 25 per page |
| `research/niches/{id}/` | `market`, `period` | Niche page: header toggles, figure cards |
| | `comparePeriods` | Always true: the change badges and tab Periods (no extra request) |
| `…/products/` | every product filter above | Niche page: tab Products (same filter bar) |
| `…/product-distributions/` | `period` | Niche page: tab Distribution (three charts) |
| `…/reviews/` | as product reviews | Niche page: tab Reviews |
| `…/reviews/summary/` | (none) | Niche page: tab Reviews |
| `…/review-history/` | `period`, `interval` | Niche page: tab Review history |
| | `market` | Fixed ALL: the only accepted value |

## Your organization

| Endpoint | Parameter | Where in the app |
| --- | --- | --- |
| `organizations/` | (none) | API usage: Connection |
| `usage/` | (none) | API usage: Research plan; sidebar meter |
| `store/overview/` | `country`, `days` | My store: country toggle and days; Overview: My store at a glance (30 days) |
| `store/products/` | `country`, `days`, `startDate`, `endDate` | My store: country, days, date range (Calendar) |
| | `sort`, `eans`, `page`, `pageSize` | My store: tab Products |
| | `categoryId` | My store: tab Products, category picker (the same number as in research) |
| `store/inventory/` | `ean`, `stockState`, `page`, `pageSize` | My store: tab Stock (25, 50 or 100 per page) |

## Reference (free)

| Endpoint | Parameter | Where in the app |
| --- | --- | --- |
| `reference/categories/` | `level`, `parentId`, `search`, `pageSize` | Category picker: level 1 when empty, `parentId` to browse down (›), `search` from 2 letters |
| | `page` | Fixed 1: `pageSize` 200 holds every child of one category; a search shows the first 50 |
| `reference/categories/{categoryId}/` | (none) | Category picker: the name of a category from the URL |
| `reference/brands/` | `search`, `limit` | Brand picker: from 2 letters, `limit` 25; the filter gets the exact name |

## Units

Store ratios (`salesProfitMargin`, `salesRoi`, `totalMargin`, `totalRoi`,
`conversion`, `acos`, `tacos`) are percentages with 2 decimals: 43.75 is
43.75 %. The app shows them as they come.

## Response headers

| Header | Where |
| --- | --- |
| `X-Research-Requests-*` | Sidebar meter, API usage, stop at `MARKTMENTOR_RESERVE` |
| `RateLimit-*`, `Retry-After` | API usage: limits per minute with countdown, log of calls |
| `X-Request-ID` | Error messages, log of calls |
