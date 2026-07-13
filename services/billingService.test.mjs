import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadBillingService(authenticatedFetch = async () => ({})) {
  const source = readFileSync(new URL("./billingService.js", import.meta.url), "utf8")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/services\/identityAccessService";\s*/m, "")
    .replaceAll("export async function ", "async function ")
    .replaceAll("export function ", "function ");

  const factory = new Function(
    "API_BASE_URL",
    "authenticatedFetch",
    `${source}
return {
  normalizeInvoice,
  fetchBillingInvoices,
  applyRentOverride,
  confirmManualPayment,
};`,
  );

  return factory("https://api.test/api/v1", authenticatedFetch);
}

test("normalizeInvoice maps snake_case billing payloads to numeric fields", () => {
  const { normalizeInvoice } = loadBillingService();

  const invoice = normalizeInvoice({
    id: 7,
    invoice_code: "INV-7",
    invoice_type: "RENT",
    billing_period: "2026-07",
    total_amount: "3200000",
    paid_amount: "500000",
    remaining_amount: "2700000",
    lines: [{ id: 1, line_type: "ROOM_RENT", unit_price: "3200000", amount: "3200000" }],
    payment_history: [{ id: 2, amount: "500000", provider: "CASH", confirmed_by: 9 }],
  });

  assert.equal(invoice.invoiceCode, "INV-7");
  assert.equal(invoice.totalAmount, 3200000);
  assert.equal(invoice.lines[0].lineType, "ROOM_RENT");
  assert.equal(invoice.lines[0].unitPrice, 3200000);
  assert.equal(invoice.paymentHistory[0].amount, 500000);
  assert.equal(invoice.paymentHistory[0].confirmedBy, 9);
});

test("fetchBillingInvoices forwards property and room filters", async () => {
  let requestedUrl = "";
  const { fetchBillingInvoices } = loadBillingService(async (url) => {
    requestedUrl = url;
    return [];
  });

  await fetchBillingInvoices({
    billingPeriod: "2026-07",
    status: "ISSUED",
    invoiceType: "RENT",
    propertyId: "3",
    roomId: "12",
  });

  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/api/v1/admin/invoices");
  assert.equal(url.searchParams.get("billingPeriod"), "2026-07");
  assert.equal(url.searchParams.get("status"), "ISSUED");
  assert.equal(url.searchParams.get("invoiceType"), "RENT");
  assert.equal(url.searchParams.get("propertyId"), "3");
  assert.equal(url.searchParams.get("roomId"), "12");
});

test("billing API helpers send numeric override and manual payment payloads", async () => {
  const calls = [];
  const { applyRentOverride, confirmManualPayment } = loadBillingService(async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    if (url.endsWith("/manual-payments")) {
      return { invoice: { id: 7, remaining_amount: "2700000" } };
    }
    return { invoiceApplied: true };
  });

  await applyRentOverride({
    roomId: "12",
    billingPeriod: "2026-07",
    overrideMonthlyRent: "3200000",
    reason: "one month discount",
  });
  const payment = await confirmManualPayment(7, { amount: "500000", payerName: "Cash", note: "received" });

  assert.equal(calls[0].url, "https://api.test/api/v1/admin/invoices/rent-overrides");
  assert.deepEqual(calls[0].body, {
    roomId: 12,
    billingPeriod: "2026-07",
    overrideMonthlyRent: 3200000,
    reason: "one month discount",
  });
  assert.equal(calls[1].url, "https://api.test/api/v1/admin/invoices/7/manual-payments");
  assert.deepEqual(calls[1].body, { amount: 500000, payerName: "Cash", note: "received" });
  assert.equal(payment.invoice.remainingAmount, 2700000);
});

test("billing page renders API invoices without legacy mock room codes", () => {
  const source = readFileSync(
    new URL("../app/dashboard/billing/page.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /invoices\.map\(\(invoice\) =>/);
  assert.match(source, /displayRoomCode\(invoice\.roomCode\)/);
  assert.doesNotMatch(source, /mockInvoices|A101|A203|B105|B302|C204|C310/);
});
