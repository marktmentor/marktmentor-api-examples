// The sales history of one or more EANs, written to a CSV file.
//   node ean-history.mjs 5407005143414
//   node ean-history.mjs 5407005143414 8712345678906 --period 1Y --interval week
// The product paths accept `ean:` and the 13-digit EAN in place of the product
// code, so each EAN costs one research request. When more than one bol product
// has the EAN, the API answers HTTP 409 with the candidate product codes and
// does not choose. That 409 does not count. The script prints the candidates:
// run it again with the product code you want (--code).
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { ApiError, MarktMentor, run, toCsv } from "./marktmentor.mjs";

const { values: args, positionals: eans } = parseArgs({
  allowPositionals: true,
  options: {
    code: { type: "string", multiple: true, default: [] },
    period: { type: "string", default: "1Y" },
    interval: { type: "string", default: "month" },
    out: { type: "string", default: "sales-history.csv" },
    "dry-run": { type: "boolean", default: false },
  },
});
const COLUMNS = ["ean", "productCode", "date", "market", "sales", "revenue", "price"];

await run(async () => {
  const items = [...eans.map((v) => ["ean", v]), ...args.code.map((v) => ["code", v])];
  if (!items.length) throw new Error("Give one or more EANs, or --code.");
  if (!["week", "month"].includes(args.interval)) throw new Error("Use --interval week or month.");
  if (args.period === "2Y" && args.interval !== "month") {
    throw new Error("Use --interval month with --period 2Y (the API refuses week there).");
  }
  const api = new MarktMentor();
  const usage = await api.loadUsage();
  if (args["dry-run"]) {
    console.log(`Dry run: ${items.length} item(s) x 1 = ${items.length} research requests.`);
    console.log(`Research plan: ${usage.plan}; ${api.summary()}`);
    return;
  }
  const rows = [];
  try {
    for (const [kind, value] of items) {
      const path = kind === "ean" ? `ean:${value}` : value;
      let history;
      try {
        history = await api.get(`research/products/${path}/sales-history/`, {
          market: "ALL", period: args.period, interval: args.interval,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 409 && error.code === "ambiguous_ean") {
          console.log(`${value}: more than one product has this EAN (not counted). Choose one:`);
          for (const c of error.body?.candidates ?? []) console.log(`  --code ${c.productCode}  ${c.title}`);
          continue;
        }
        if (error instanceof ApiError && error.status === 404 && ["product_not_found", "not_found"].includes(error.code)) {
          console.log(`${value}: no product or no history found (not counted)`);
          continue;
        }
        throw error;
      }
      for (const point of history.data) {
        for (const [market, metrics] of Object.entries(point.markets ?? {})) {
          rows.push({
            ean: kind === "ean" ? value : "",
            productCode: kind === "code" ? value : "",
            date: point.date, market, ...metrics,
          });
        }
      }
      console.log(`${value}: ${history.data.length} points`);
    }
  } finally {
    writeFileSync(args.out, toCsv(COLUMNS, rows));
    console.log(`\nWrote ${args.out}`);
    console.log(api.summary());
  }
});
