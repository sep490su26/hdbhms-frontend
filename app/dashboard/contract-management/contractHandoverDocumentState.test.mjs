import assert from "node:assert/strict";
import test from "node:test";

import { getHandoverDocumentState } from "./contractHandoverDocumentState.js";

test("handover document waits for handover data", () => {
  assert.deepEqual(getHandoverDocumentState(null), {
    key: "NO_DATA",
    hasHandoverData: false,
    signedDocumentId: null,
    label: "Chưa có dữ liệu bàn giao",
  });
});

test("confirmed handover without a signed file stays optional and pending", () => {
  const state = getHandoverDocumentState({
    electricity: { currentValue: 12 },
    signedDocumentId: null,
  });

  assert.equal(state.key, "PENDING_SIGNED_FILE");
  assert.equal(state.label, "Chờ bổ sung bản ký");
});

test("signed handover file completes the document card", () => {
  const state = getHandoverDocumentState({
    electricity: { currentValue: 12 },
    signed_document_id: 91,
  });

  assert.equal(state.key, "COMPLETE");
  assert.equal(state.signedDocumentId, 91);
});
