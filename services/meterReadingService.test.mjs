import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("meter readings error state does not use the removed dashboard header", () => {
  const source = readFileSync(
    new URL("../app/dashboard/meter-readings/page.jsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /DashboardPageHeader/);
  assert.match(source, /if \(errorMessage\)[\s\S]*Nhập điện nước hàng tháng/);
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
