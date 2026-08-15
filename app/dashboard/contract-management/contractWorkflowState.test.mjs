import assert from "node:assert/strict";
import test from "node:test";

import {
  getContractActivationReadiness,
  isLeaseSignedUploadDisabled,
} from "./contractWorkflowState.js";

test("lease signed upload is disabled until lease contract exists", () => {
  assert.equal(
    isLeaseSignedUploadDisabled({ contractId: null, loadingStep: null }),
    true,
  );
});

test("lease signed upload does not depend on the signed deposit file", () => {
  assert.equal(
    isLeaseSignedUploadDisabled({
      leaseContractId: 9,
      depositSignedFileId: null,
      hasDeposit: true,
      loadingStep: null,
    }),
    false,
  );
});

test("lease signed upload is disabled while another document action is running", () => {
  assert.equal(
    isLeaseSignedUploadDisabled({ leaseContractId: 9, loadingStep: "deposit" }),
    true,
  );
});

test("activation requires the signed handover document", () => {
  const readiness = getContractActivationReadiness({
    hasDeposit: true,
    depositSignedFileId: 11,
    leaseSignedFileId: 12,
    hasHandoverData: true,
    handoverSignedFileId: null,
  });

  assert.equal(readiness.ready, false);
  assert.equal(readiness.completedCount, 2);
  assert.equal(readiness.totalCount, 3);
});

test("direct lease activation does not require a deposit document", () => {
  const readiness = getContractActivationReadiness({
    hasDeposit: false,
    leaseSignedFileId: 12,
    hasHandoverData: true,
    handoverSignedFileId: 13,
  });

  assert.equal(readiness.ready, true);
  assert.deepEqual(
    readiness.requirements.map((item) => item.key),
    ["lease", "handover-data", "handover-signed-file"],
  );
});

test("renewal activation does not require handover documents", () => {
  const readiness = getContractActivationReadiness({
    hasDeposit: false,
    leaseSignedFileId: 12,
    requiresMoveInHandover: false,
    hasHandoverData: false,
    handoverSignedFileId: null,
  });

  assert.equal(readiness.ready, true);
  assert.equal(readiness.completedCount, 1);
  assert.equal(readiness.totalCount, 1);
  assert.deepEqual(
    readiness.requirements.map((item) => item.key),
    ["lease"],
  );
});

test("activation reading checklist uses UTF-8 Vietnamese text", () => {
  const readiness = getContractActivationReadiness({
    leaseSignedFileId: 12,
    requiresMoveInHandover: true,
    activationReadingReady: false,
  });

  assert.equal(
    readiness.requirements.find((item) => item.key === "activation-reading")?.label,
    "Chỉ số điện đầu kỳ",
  );
});

test("transfer replacement activation can require electricity without move-in handover", () => {
  const readiness = getContractActivationReadiness({
    leaseSignedFileId: 12,
    requiresMoveInHandover: false,
    requiresActivationReading: true,
    activationReadingReady: true,
  });

  assert.equal(readiness.ready, true);
  assert.deepEqual(
    readiness.requirements.map((item) => item.key),
    ["lease", "activation-reading"],
  );
});
