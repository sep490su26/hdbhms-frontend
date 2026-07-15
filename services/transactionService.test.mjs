import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadTransactionService({ authenticatedFetch = async () => ({}), fetchToken = "token" } = {}) {
  const source = readFileSync(new URL("./transactionService.js", import.meta.url), "utf8")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/services\/identityAccessService";\s*/m, "")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/lib\/pageResponse";\s*/m, "")
    .replaceAll("export async function ", "async function ")
    .replaceAll("export function ", "function ");

  const factory = new Function(
    "API_BASE_URL",
    "authenticatedFetch",
    "getAuthToken",
    "refreshTokenApi",
    "normalizePageResponse",
    "readPageItems",
    `${source}
return {
  buildExportFallbackFilename,
  normalizeTransaction,
  fetchTransactionHistory,
  fetchTransactionHistoryExportFile,
};`,
  );

  return factory(
    "https://api.test/api/v1",
    authenticatedFetch,
    () => fetchToken,
    async () => {},
    (payload, { page, size, items }) => ({
      items,
      page: payload.currentPage ?? page,
      size: payload.pageSize ?? size,
      totalElements: payload.totalElements ?? items.length,
      totalPages: payload.totalPages ?? 1,
    }),
    (payload) => (Array.isArray(payload?.data) ? payload.data : []),
  );
}

test("buildExportFallbackFilename uses the selected invoice period", () => {
  const { buildExportFallbackFilename } = loadTransactionService();

  assert.equal(
    buildExportFallbackFilename("excel", { periodType: "MONTH", billingPeriod: "2026-07" }),
    "Hóa đơn tháng 07-2026.xlsx",
  );
  assert.equal(
    buildExportFallbackFilename("excel", { periodType: "YEAR", year: "2026" }),
    "Hóa đơn năm 2026.xlsx",
  );
  assert.equal(
    buildExportFallbackFilename("excel", {
      periodType: "DATE_RANGE",
      issueFromDate: "2026-07-01",
      issueToDate: "2026-07-14",
    }),
    "Hóa đơn từ 01-07-2026 đến 14-07-2026.xlsx",
  );
  assert.equal(
    buildExportFallbackFilename("excel", { periodType: "ALL" }),
    "Danh sách tất cả hóa đơn.xlsx",
  );
  assert.equal(buildExportFallbackFilename("pdf"), "lich-su-thanh-toan.pdf");
});

test("fetchTransactionHistory sends filters and normalizes rows", async () => {
  const calls = [];
  const { fetchTransactionHistory } = loadTransactionService({
    authenticatedFetch: async (url) => {
      calls.push(url);
      return {
        currentPage: 2,
        pageSize: 20,
        totalElements: 1,
        totalPages: 3,
        data: [{
          transaction_code: "PAYOS-7",
          transaction_time: "2026-07-06T10:30:00",
          room_code: "P201",
          tenant_name: "Nguyen Van A",
          amount: "500000",
          payment_type: "RENT",
          status: "MATCHED",
        }],
      };
    },
  });

  const result = await fetchTransactionHistory({
    page: 2,
    size: 20,
    roomId: "12",
    tenantName: "A",
    fromDate: "2026-07-01",
    toDate: "2026-07-31",
  });

  assert.match(calls[0], /^https:\/\/api\.test\/api\/v1\/admin\/transactions\?/);
  assert.match(calls[0], /roomId=12/);
  assert.match(calls[0], /tenantName=A/);
  assert.match(calls[0], /fromDate=2026-07-01/);
  assert.match(calls[0], /toDate=2026-07-31/);
  assert.match(calls[0], /page=1/);
  assert.match(calls[0], /size=20/);
  assert.equal(result.items[0].transactionCode, "PAYOS-7");
  assert.equal(result.items[0].amount, 500000);
  assert.equal(result.items[0].roomCode, "P201");
});

test("fetchTransactionHistoryExportFile downloads requested format with auth header", async () => {
  const { fetchTransactionHistoryExportFile } = loadTransactionService();
  const originalFetch = globalThis.fetch;
  const expectedBlob = new Blob(["pdf"], { type: "application/pdf" });
  const calls = [];

  globalThis.fetch = async (...args) => {
    calls.push(args);
    return {
      status: 200,
      ok: true,
      headers: {
        get(name) {
          return name.toLowerCase() === "content-disposition"
            ? "attachment; filename*=UTF-8''lich-su-thanh-toan-2026-07-06.pdf"
            : null;
        },
      },
      blob: async () => expectedBlob,
    };
  };

  try {
    const file = await fetchTransactionHistoryExportFile({
      roomId: "12",
      periodType: "DATE_RANGE",
      issueFromDate: "2026-07-01",
      issueToDate: "2026-07-14",
    }, "pdf");

    assert.match(calls[0][0], /\/admin\/transactions\/export\?/);
    assert.match(calls[0][0], /roomId=12/);
    assert.match(calls[0][0], /periodType=DATE_RANGE/);
    assert.match(calls[0][0], /issueFromDate=2026-07-01/);
    assert.match(calls[0][0], /issueToDate=2026-07-14/);
    assert.match(calls[0][0], /format=pdf/);
    assert.equal(calls[0][1].headers.Authorization, "Bearer token");
    assert.equal(file.blob, expectedBlob);
    assert.equal(file.filename, "lich-su-thanh-toan-2026-07-06.pdf");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
