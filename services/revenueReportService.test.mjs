import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadRevenueReportService(authenticatedFetch = async () => ({})) {
  const source = readFileSync(new URL("./revenueReportService.js", import.meta.url), "utf8")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/services\/identityAccessService";\s*/m, "")
    .replaceAll("export async function ", "async function ")
    .replaceAll("export function ", "function ");

  const factory = new Function(
    "API_BASE_URL",
    "authenticatedFetch",
    `${source}
return {
  normalizeRevenueReport,
  fetchRevenueReport,
};`,
  );

  return factory("https://api.test/api/v1", authenticatedFetch);
}

test("normalizeRevenueReport maps revenue payloads to VND numbers", () => {
  const { normalizeRevenueReport } = loadRevenueReportService();

  const report = normalizeRevenueReport({
    period_type: "month",
    end_period: "2026-07",
    total_revenue: "4200000",
    previous_total_revenue: "3500000",
    revenue_growth_percent: "20",
    periods: [
      {
        period: "2026-07",
        label: "T7",
        room: "3000000",
        utilities: "700000",
        service: "300000",
        extra: "200000",
        total: "4200000",
        previous: "3500000",
      },
    ],
    sources: [{ key: "room", amount: "3000000", percent: "71" }],
  });

  assert.equal(report.totalRevenue, 4200000);
  assert.equal(report.previousTotalRevenue, 3500000);
  assert.equal(report.periods[0].total, 4200000);
  assert.equal(report.periods[0].room, 3000000);
  assert.equal(report.sources[0].amount, 3000000);
  assert.equal(report.sources[0].percent, 71);
});

test("fetchRevenueReport calls dashboard revenue endpoint with filters", async () => {
  let requestedUrl = "";
  let requestedOptions = null;
  const { fetchRevenueReport } = loadRevenueReportService(async (url, options) => {
    requestedUrl = url;
    requestedOptions = options;
    return { periods: [], sources: [] };
  });

  await fetchRevenueReport({ periodType: "quarter", endPeriod: "2026-07" });

  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/api/v1/dashboard/revenue-report");
  assert.equal(url.searchParams.get("periodType"), "quarter");
  assert.equal(url.searchParams.get("endPeriod"), "2026-07");
  assert.deepEqual(requestedOptions, { method: "GET" });
});
