import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readPageItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function normalizePageResponse(payload, { page = 1, size = 10, items = readPageItems(payload) } = {}) {
  return {
    items,
    totalElements: Number(payload?.totalElements ?? items.length),
    totalPages: Number(payload?.totalPages ?? 1),
    page,
    size,
  };
}

async function fetchAllPageItems(fetchPage, { size = 100 } = {}) {
  const response = await fetchPage({ page: 0, size });
  return readPageItems(response);
}

function loadExpenseReportService({
  authenticatedFetch = async () => ({}),
  fetchAllPageItemsOverride = fetchAllPageItems,
} = {}) {
  const source = readFileSync(new URL("./expenseReportService.js", import.meta.url), "utf8")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/lib\/pageResponse";\s*/m, "")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/services\/identityAccessService";\s*/m, "")
    .replaceAll("export async function ", "async function ")
    .replaceAll("export function ", "function ");

  const factory = new Function(
    "API_BASE_URL",
    "authenticatedFetch",
    "fetchAllPageItems",
    "normalizePageResponse",
    "readPageItems",
    `${source}
return {
  normalizeExpenseRequest,
  fetchExpenseRequests,
  fetchPaidExpenseRequests,
  fetchAllExpenseRequests,
};`,
  );

  return factory(
    "https://api.test/api/v1",
    authenticatedFetch,
    fetchAllPageItemsOverride,
    normalizePageResponse,
    readPageItems,
  );
}

test("normalizeExpenseRequest maps API expense rows", () => {
  const { normalizeExpenseRequest } = loadExpenseReportService();

  const row = normalizeExpenseRequest({
    id: 10,
    expense_code: "EXP-10",
    expense_type: "REPAIR",
    status: "PAID",
    amount: "1500000",
    expense_date: "2026-07-03",
    payment: { payment_date: "2026-07-05" },
  });

  assert.equal(row.id, 10);
  assert.equal(row.expenseCode, "EXP-10");
  assert.equal(row.expenseType, "REPAIR");
  assert.equal(row.amount, 1500000);
  assert.equal(row.expenseDate, "2026-07-03");
  assert.equal(row.paymentDate, "2026-07-05");
});

test("fetchExpenseRequests calls expense endpoint with filters", async () => {
  let requestedUrl = "";
  let requestedOptions = null;
  const { fetchExpenseRequests } = loadExpenseReportService({
    authenticatedFetch: async (url, options) => {
      requestedUrl = url;
      requestedOptions = options;
      return {
        content: [{ id: 1, amount: "2000000" }],
        totalElements: 1,
        totalPages: 1,
      };
    },
  });

  const result = await fetchExpenseRequests({
    status: "PAID",
    fromDate: "2026-07-01",
    toDate: "2026-07-31",
    page: 2,
    size: 50,
  });

  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/api/v1/expense-requests");
  assert.equal(url.searchParams.get("status"), "PAID");
  assert.equal(url.searchParams.get("fromDate"), "2026-07-01");
  assert.equal(url.searchParams.get("toDate"), "2026-07-31");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("size"), "50");
  assert.deepEqual(requestedOptions, { method: "GET" });
  assert.equal(result.items[0].amount, 2000000);
});

test("fetchPaidExpenseRequests always uses PAID status", async () => {
  let requestedUrl = "";
  const { fetchPaidExpenseRequests } = loadExpenseReportService({
    authenticatedFetch: async (url) => {
      requestedUrl = url;
      return { items: [] };
    },
  });

  await fetchPaidExpenseRequests({
    status: "REJECTED",
    fromDate: "2026-07-01",
    toDate: "2026-07-31",
    size: 25,
  });

  const url = new URL(requestedUrl);
  assert.equal(url.searchParams.get("status"), "PAID");
  assert.equal(url.searchParams.get("size"), "25");
});

test("fetchAllExpenseRequests keeps caller status filters", async () => {
  let requestedUrl = "";
  const { fetchAllExpenseRequests } = loadExpenseReportService({
    authenticatedFetch: async (url) => {
      requestedUrl = url;
      return { items: [] };
    },
  });

  await fetchAllExpenseRequests({
    status: "READY_FOR_PAYMENT",
    fromDate: "2026-07-01",
    toDate: "2026-07-31",
    size: 30,
  });

  const url = new URL(requestedUrl);
  assert.equal(url.searchParams.get("status"), "READY_FOR_PAYMENT");
  assert.equal(url.searchParams.get("size"), "30");
});
