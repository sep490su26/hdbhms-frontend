import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadDebtService(authenticatedFetch = async () => []) {
  const source = readFileSync(new URL("./debtService.js", import.meta.url), "utf8")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/services\/identityAccessService";\s*/m, "")
    .replaceAll("export async function ", "async function ")
    .replaceAll("export function ", "function ");

  const factory = new Function(
    "API_BASE_URL",
    "authenticatedFetch",
    `${source}
return {
  normalizeDebtSummary,
  fetchDebtSummary,
};`,
  );

  return factory("https://api.test/api/v1", authenticatedFetch);
}

test("normalizeDebtSummary maps snake_case values to numbers and booleans", () => {
  const { normalizeDebtSummary } = loadDebtService();

  const debt = normalizeDebtSummary({
    property_id: 1,
    room_id: 12,
    room_name: "P101",
    rent_debt_amount: "3000000",
    utility_debt_amount: "400000",
    total_debt: "3400000",
    months_overdue: "3",
    debt_type: "MIXED",
    is_warning: true,
  });

  assert.equal(debt.roomName, "P101");
  assert.equal(debt.rentDebtAmount, 3000000);
  assert.equal(debt.utilityDebtAmount, 400000);
  assert.equal(debt.totalDebt, 3400000);
  assert.equal(debt.monthsOverdue, 3);
  assert.equal(debt.debtType, "MIXED");
  assert.equal(debt.isWarning, true);
});

test("fetchDebtSummary forwards property filter", async () => {
  let requestedUrl = "";
  const { fetchDebtSummary } = loadDebtService(async (url) => {
    requestedUrl = url;
    return [];
  });

  await fetchDebtSummary({ propertyId: "2" });

  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/api/v1/admin/debts/summary");
  assert.equal(url.searchParams.get("propertyId"), "2");
});
