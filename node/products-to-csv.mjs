// Search products and write them to a CSV file, page by page.
//   node products-to-csv.mjs drinkfles --max-pages 2
//   node products-to-csv.mjs drinkfles --max-pages 4 --dry-run
//   node products-to-csv.mjs --category-id 40142 --min-sales 100 --out bottles.csv
// Each page is one research request. The script stops when there are no more
// pages, at --max-pages, at the reserve (MARKTMENTOR_RESERVE) or on HTTP 402.
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { MarktMentor, run, toCsv } from "./marktmentor.mjs";

const COLUMNS = [
  "productCode", "ean", "title", "brand", "rating", "reviewCount",
  "NL.price", "NL.sales", "NL.revenue", "BE.price", "BE.sales", "BE.revenue", "updatedAt",
];

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "category-id": { type: "string" },
    brand: { type: "string" },
    "min-sales": { type: "string" },
    period: { type: "string", default: "30d" },
    sort: { type: "string" },
    "page-size": { type: "string", default: "25" },
    "max-pages": { type: "string", default: "2" },
    out: { type: "string", default: "products.csv" },
    "dry-run": { type: "boolean", default: false },
  },
});

const row = (product) => {
  const flat = Object.fromEntries(COLUMNS.filter((c) => !c.includes(".")).map((c) => [c, product[c]]));
  for (const market of ["NL", "BE"]) {
    const metrics = product.markets?.[market] ?? {};
    // Values are written unchanged; round only when you display them.
    for (const metric of ["price", "sales", "revenue"]) flat[`${market}.${metric}`] = metrics[metric];
  }
  return flat;
};

await run(async () => {
  const api = new MarktMentor();
  const usage = await api.loadUsage(); // free; tells us how much is left
  const maxPages = Number(args["max-pages"]);
  const params = {
    search: positionals[0],
    categoryId: args["category-id"],
    brand: args.brand,
    minSales: args["min-sales"],
    market: "ALL",
    period: args.period,
    sort: args.sort,
    pageSize: Number(args["page-size"]),
  };
  if (args["dry-run"]) {
    console.log(`Dry run. Plan: GET ${api.url("research/products/", params)}`);
    console.log(`At most ${maxPages} research request(s), one per page.`);
    console.log(`Research plan: ${usage.plan}; ${api.summary()}`);
    return;
  }
  const rows = [];
  try {
    for await (const body of api.pages("research/products/", params, maxPages)) {
      rows.push(...body.data.map(row));
      console.log(`page ${body.pagination.page}: ${rows.length} of ${body.pagination.total} products`);
    }
  } finally {
    writeFileSync(args.out, toCsv(COLUMNS, rows)); // keep what we have, also after a stop
    console.log(`\nWrote ${rows.length} products to ${args.out}`);
    console.log(api.summary());
  }
});
