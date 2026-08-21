import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function loadAdvisorService(authenticatedFetch = async () => ({})) {
  const source = readFileSync(new URL("./advisorService.js", import.meta.url), "utf8")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/services\/identityAccessService";\s*/m, "")
    .replaceAll("export function ", "function ")
    .replaceAll("export async function ", "async function ");

  const factory = new Function(
    "API_BASE_URL",
    "ApiError",
    "authenticatedFetch",
    "getAuthToken",
    "refreshTokenApi",
    `${source}
return {
  askAdvisor,
  currentAdvisorPeriod,
  fetchAdvisorSessionHistory,
  fetchAdvisorReport,
};`,
  );

  return factory("https://api.test", Error, authenticatedFetch, () => "", async () => "");
}

test("currentAdvisorPeriod returns YYYY-MM", () => {
  const { currentAdvisorPeriod } = loadAdvisorService();
  assert.match(currentAdvisorPeriod(), /^\d{4}-(0[1-9]|1[0-2])$/);
});

test("fetchAdvisorSessionHistory calls encoded session route", async () => {
  let calledUrl = "";
  const { fetchAdvisorSessionHistory } = loadAdvisorService(async (url) => {
    calledUrl = url;
    return {};
  });

  await fetchAdvisorSessionHistory("17:abc/123");

  assert.equal(calledUrl, "https://api.test/advisor/copilot/session/17%3Aabc%2F123");
});

test("askAdvisor sends camelCase sessionId", async () => {
  let body = "";
  const { askAdvisor } = loadAdvisorService(async (url, options) => {
    assert.equal(url, "https://api.test/advisor/copilot/ask?period=2026-07");
    body = options.body;
    return {};
  });

  await askAdvisor({ question: "doanh thu?", sessionId: "17:abc", period: "2026-07" });

  assert.deepEqual(JSON.parse(body), { question: "doanh thu?", sessionId: "17:abc" });
});

test("fetchAdvisorReport uses the monthly report endpoint and forwards period", async () => {
  let calledUrl = "";
  let calledMethod = "";
  const { fetchAdvisorReport } = loadAdvisorService(async (url, options) => {
    calledUrl = url;
    calledMethod = options.method;
    return {};
  });

  await fetchAdvisorReport("2026-07");

  assert.equal(calledUrl, "https://api.test/advisor/copilot/report?period=2026-07");
  assert.equal(calledMethod, "POST");
});
