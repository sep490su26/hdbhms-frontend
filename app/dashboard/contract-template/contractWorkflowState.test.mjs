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

test("activation does not require the optional signed handover document", () => {
  const readiness = getContractActivationReadiness({
    hasDeposit: true,
    depositSignedFileId: 11,
    leaseSignedFileId: 12,
    hasHandoverData: true,
    handoverSignedFileId: null,
  });

  assert.equal(readiness.ready, true);
  assert.equal(readiness.completedCount, 3);
  assert.equal(readiness.totalCount, 3);
});

test("direct lease activation does not require a deposit document", () => {
  const readiness = getContractActivationReadiness({
    hasDeposit: false,
    leaseSignedFileId: 12,
    hasHandoverData: true,
  });

  assert.equal(readiness.ready, true);
  assert.deepEqual(
    readiness.requirements.map((item) => item.key),
    ["lease", "handover-data"],
  );
});
