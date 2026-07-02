import assert from "node:assert/strict";
import test from "node:test";

import { isLeaseSignedUploadDisabled } from "./contractWorkflowState.js";

test("lease signed upload is disabled until lease contract exists", () => {
  assert.equal(isLeaseSignedUploadDisabled({
    contractId: null,
    depositSignedFileId: 900,
    hasDeposit: true,
    loadingStep: null,
  }), true);
});

test("lease signed upload is enabled for an existing lease after deposit is signed", () => {
  assert.equal(isLeaseSignedUploadDisabled({
    leaseContractId: 9,
    depositSignedFileId: 900,
    hasDeposit: true,
    loadingStep: null,
  }), false);
});

test("lease signed upload does not require deposit for direct lease contracts", () => {
  assert.equal(isLeaseSignedUploadDisabled({
    leaseContractId: 9,
    depositSignedFileId: null,
    hasDeposit: false,
    loadingStep: null,
  }), false);
});
