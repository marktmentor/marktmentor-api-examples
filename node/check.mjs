// Step 1: check the key, the organization and the allowance. Costs nothing.
//   node check.mjs
import { MarktMentor, run } from "./marktmentor.mjs";

await run(async () => {
  const api = new MarktMentor();
  console.log(`API: ${api.baseUrl}`);
  for (const organization of await api.get("organizations/")) {
    console.log(`Organization: ${organization.name} (id ${organization.id})`);
  }
  const usage = await api.loadUsage();
  console.log(`Research plan: ${usage.plan}`);
  if (usage.plan === "bundle") {
    const b = usage.bundle;
    console.log(`  ${b.remainingRequests} of ${b.includedRequests} requests left until ${b.periodEnd}`);
  } else if (usage.plan === "unmetered") {
    console.log("  Research access without a metered bundle (a grant).");
  } else if (usage.plan === "free") {
    const f = usage.freeTier ?? {};
    console.log(`  Free requests: ${f.remaining} of ${f.limit} left this month (until ${f.resetsAt}), at most ${f.pageSize} results per page. Shared with the portal.`);
  } else {
    console.log("  No research access. Research needs an active paid MarktMentor Premium subscription (100 free requests per month) or an API bundle. The store endpoints work with the Pro plan.");
  }
  console.log(`Rate limit: ${api.usage.rateRemaining}/${api.usage.rateLimit} requests left this minute`);
  console.log("\nOK: the key works. These two calls did not use research requests.");
});
