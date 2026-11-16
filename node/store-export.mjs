// Export your own store: performance, products and stock, to CSV files.
//   node store-export.mjs
//   node store-export.mjs --start 2026-10-01 --end 2026-10-31
// Store requests are free and do not need an API bundle. They need the Pro
// plan and a connected bol store. Limit: 60 store requests per minute.
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { MarktMentor, run, toCsv } from "./marktmentor.mjs";

const PRODUCT_COLUMNS = [
  "ean", "title", "sales", "orders", "returns", "revenue", "netRevenue", "totalCosts",
  "totalProfits", "totalMargin", "clicks", "conversion", "adCost", "acos", "tacos", "hasProductCosts",
];
const STOCK_COLUMNS = ["ean", "title", "stock", "stockState", "source", "stockLastUpdated", "unknownReason"];

const { values: args } = parseArgs({
  options: {
    days: { type: "string", default: "30" },
    start: { type: "string" },
    end: { type: "string" },
    "max-pages": { type: "string", default: "10" },
    "dry-run": { type: "boolean", default: false },
  },
});

await run(async () => {
  const api = new MarktMentor();
  const maxPages = Number(args["max-pages"]);
  const period = args.start && args.end ? { startDate: args.start, endDate: args.end } : { days: args.days };
  if (args["dry-run"]) {
    console.log("Dry run. Plan (0 research requests, store requests are free):");
    console.log(`  GET ${api.url("store/overview/", { days: args.days })}`);
    console.log(`  GET ${api.url("store/products/", { ...period, pageSize: 100 })} (up to ${maxPages} pages)`);
    console.log(`  GET ${api.url("store/inventory/", { pageSize: 100 })} (up to ${maxPages} pages)`);
    return;
  }
  const overview = await api.get("store/overview/", { days: args.days });
  console.log(`Store ${overview.period.startDate} .. ${overview.period.endDate}:`);
  console.log(overview.kpis);

  const products = [];
  let costsHidden = false;
  for await (const body of api.pages("store/products/", { ...period, pageSize: 100 }, maxPages)) {
    products.push(...body.data);
    if (body.pagination.totalMayBeCapped) console.log("Note: the selection can be incomplete (totalMayBeCapped).");
    costsHidden = body.costsVisible === false;
  }
  if (costsHidden) console.log("Note: product and shipping costs are hidden for this store.");
  writeFileSync("store-products.csv", toCsv(PRODUCT_COLUMNS, products));
  console.log(`store-products.csv: ${products.length} products with orders`);

  const stock = [];
  for await (const body of api.pages("store/inventory/", { pageSize: 100 }, maxPages)) stock.push(...body.data);
  writeFileSync("store-inventory.csv", toCsv(STOCK_COLUMNS, stock));
  console.log(`store-inventory.csv: ${stock.length} active products`);
  console.log("\nThese calls did not use research requests.");
});
