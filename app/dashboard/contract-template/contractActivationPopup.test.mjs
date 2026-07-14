import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflowSource = readFileSync(
  new URL("./ContractWorkflowStepper.jsx", import.meta.url),
  "utf8",
);
const activationFlowSource = readFileSync(
  new URL("./ContractActivationFlow.jsx", import.meta.url),
  "utf8",
);
const pageSource = readFileSync(new URL("./page.jsx", import.meta.url), "utf8");

test("activation popup renders the two-stage onboarding workflow", () => {
  assert.match(workflowSource, /Chuẩn bị hồ sơ/);
  assert.match(workflowSource, /Lưu bản đã ký/);
  assert.match(workflowSource, /Tải tài liệu và nhập bàn giao/);
  assert.match(workflowSource, /Upload các bản PDF đã ký/);
  assert.match(workflowSource, /Đảm bảo đủ điều kiện kích hoạt/);
});

test("handover is an internal popup view instead of a nested dialog", () => {
  assert.match(activationFlowSource, /useState\("workflow"\)/);
  assert.match(activationFlowSource, /setActiveView\("handover"\)/);
  assert.match(activationFlowSource, /Quay lại hồ sơ/);
  assert.doesNotMatch(activationFlowSource, /fixed inset-0/);
});

test("signed document inputs enforce PDF and the 15 MB client limit", () => {
  assert.match(workflowSource, /MAX_PDF_SIZE_BYTES = 15 \* 1024 \* 1024/);
  assert.match(workflowSource, /accept="application\/pdf,\.pdf"/);
  assert.match(workflowSource, /replace: Boolean\(leaseSignedFileId\)/);
});

test("contract list activation action opens the integrated dialog", () => {
  assert.match(pageSource, /\? "Kích hoạt hợp đồng"/);
  assert.match(pageSource, /id="contract-detail-dialog"/);
  assert.match(pageSource, /<ContractActivationFlow/);
});
