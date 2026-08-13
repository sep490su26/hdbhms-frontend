import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("meter readings page follows the shared dashboard styling", () => {
  const source = readFileSync(
    new URL("../app/dashboard/meter-readings/page.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /DashboardPageHeader/);
  assert.match(source, /DashboardStatCard/);
  assert.match(source, /if \(errorMessage\)[\s\S]*title="[^"]+"/);
});

test("new meter reading periods use the MM-yyyy format", () => {
  const source = readFileSync(
    new URL("../app/dashboard/meter-readings/page.jsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /toLocaleDateString/);
  assert.match(
    source,
    /getMonth\(\) \+ 1[\s\S]*padStart\(2, "0"\)[\s\S]*getFullYear\(\)/,
  );
  assert.match(source, /dashboard\?\.currentPeriod\?\.readingPeriod/);
});

test("meter reading period history has a dedicated dashboard route", () => {
  const pageSource = readFileSync(
    new URL("../app/dashboard/meter-readings/page.jsx", import.meta.url),
    "utf8",
  );
  const historySource = readFileSync(
    new URL("../app/dashboard/meter-readings/history/page.jsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /\/dashboard\/meter-readings\/history/);
  assert.match(pageSource, /Lịch sử kỳ ghi số/);
  assert.match(historySource, /title="Lịch sử các kỳ ghi chỉ số"/);
  assert.match(historySource, /fetchBatchHistory/);
  assert.match(historySource, /DashboardPagination/);
});

test("issued meter reading invoices lock entry actions", () => {
  const source = readFileSync(
    new URL("../app/dashboard/meter-readings/batch/page.jsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /LOCKED_BATCH_STATUSES = new Set\(\["CONFIRMED"\]\)/);
  assert.match(source, /const isBatchLocked = readingsLocked/);
  assert.match(source, /readingsLocked/);
  assert.match(source, /const canCreateBilling = !isBatchLocked/);
  assert.match(source, /Tạo\/Cập nhật hóa đơn/);
  assert.doesNotMatch(source, /confirmMeterReadingBatch/);
  assert.match(source, /disabled=\{isBatchLocked\}/);
  assert.match(source, /disabled=\{saving \|\| isBatchLocked\}/);
});

test("negative meter usage cannot be confirmed as reviewed", () => {
  const source = readFileSync(
    new URL("../app/dashboard/meter-readings/batch/page.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /requiresMeterReadingCorrection/);
  assert.match(source, /NEGATIVE_USAGE/);
  assert.match(source, /Chỉ số mới thấp hơn chỉ số cũ/);
  assert.match(source, /Sửa chỉ số/);
});
