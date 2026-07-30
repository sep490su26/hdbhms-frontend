import assert from "node:assert/strict";
import test from "node:test";

import {
  dedupeTenantProfileEmergencyContacts,
  dedupeTenantProfileVehicles,
  dedupeTenantProfiles,
} from "../lib/tenantProfileDedupe.mjs";

test("dedupeTenantProfiles keeps one row per tenant profile per contract context", () => {
  const rows = dedupeTenantProfiles([
    { id: 101, contractId: 1, roomCode: "A1" },
    { id: 101, contractId: 1, roomCode: "A1" },
    { id: 101, contractId: 2, roomCode: "A1" },
    { id: 102, contractId: 3, roomCode: "A1" },
  ]);

  assert.deepEqual(
    rows.map((row) => row.contractId),
    [1, 2, 3],
  );
});

test("dedupe profile detail lists by stable identity", () => {
  assert.equal(
    dedupeTenantProfileVehicles([
      { licensePlate: "59A1-12345" },
      { license_plate: "59a1-12345" },
      { licensePlate: "59A1-67890" },
    ]).length,
    2,
  );
  assert.equal(
    dedupeTenantProfileEmergencyContacts([
      { fullName: "Nguyễn Văn A", phone: "0901 234 567" },
      { full_name: "Nguyễn Văn A", phone: "0901234567" },
    ]).length,
    1,
  );
});
