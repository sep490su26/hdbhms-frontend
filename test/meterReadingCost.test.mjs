import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateUtilityCharge,
  formatVnd,
  normalizeUtilityTariff,
} from "../lib/meterReadingCost.mjs";

test("calculates electricity with no free allowance", () => {
  assert.deepEqual(calculateUtilityCharge(12, { unitPrice: 3500, freeAllowance: 0 }), {
    usage: 12,
    unitPrice: 3500,
    freeAllowance: 0,
    billableUsage: 12,
    amount: 42000,
    isInvalid: false,
  });
});

test("calculates water after free allowance using ceiling quantity", () => {
  assert.deepEqual(calculateUtilityCharge(6.2, { unitPrice: 20000, freeAllowance: 6 }), {
    usage: 6.2,
    unitPrice: 20000,
    freeAllowance: 6,
    billableUsage: 1,
    amount: 20000,
    isInvalid: false,
  });
});

test("normalizes tariff and formats VND", () => {
  assert.deepEqual(normalizeUtilityTariff({ unit_price: "20000", free_allowance: "6" }, null), {
    unitPrice: 20000,
    freeAllowance: 6,
  });
  assert.equal(formatVnd(42000), "42.000 VNĐ");
});
