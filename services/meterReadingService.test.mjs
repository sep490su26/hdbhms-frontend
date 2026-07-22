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

test("confirmed meter reading batches lock entry actions", () => {
  const source = readFileSync(
    new URL("../app/dashboard/meter-readings/batch/page.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /LOCKED_BATCH_STATUSES = new Set\(\["CONFIRMED"\]\)/);
  assert.match(source, /const isBatchLocked = LOCKED_BATCH_STATUSES\.has\(batchStatus\)/);
  assert.match(source, /const canConfirmBatch = !isBatchLocked/);
  assert.match(source, /disabled=\{isBatchLocked\}/);
  assert.match(source, /disabled=\{saving \|\| isBatchLocked\}/);
});
