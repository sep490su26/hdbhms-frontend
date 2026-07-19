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
const handoverDocumentCardSource = readFileSync(
  new URL("./HandoverDocumentCard.jsx", import.meta.url),
  "utf8",
);
const handoverDocumentStateSource = readFileSync(
  new URL("./contractHandoverDocumentState.js", import.meta.url),
  "utf8",
);

test("activation popup renders the two-stage onboarding workflow", () => {
  assert.match(workflowSource, /Chuẩn bị hồ sơ/);
  assert.match(workflowSource, /Lưu bản đã ký/);
  assert.match(workflowSource, /Tải bản in và nhập thông tin bàn giao/);
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

test("signed handover upload is required for activation", () => {
  assert.match(workflowSource, /handoverSignedFileId/);
  assert.match(workflowSource, /handover-signed-file/);
  assert.match(pageSource, /getSignedHandoverDocumentId/);
  assert.doesNotMatch(workflowSource, /optional\s*fileName="Bi/);
});

test("contract list activation action opens the integrated dialog", () => {
  assert.match(pageSource, /\? "Kích hoạt hợp đồng"/);
  assert.match(pageSource, /id="contract-detail-dialog"/);
  assert.match(pageSource, /<ContractActivationFlow/);
});

test("activated contract details do not render the activation stepper", () => {
  const activationStatuses = pageSource.match(
    /const ACTIVATION_FLOW_WORKFLOWS = new Set\(\[([\s\S]*?)\]\);/,
  )?.[1];

  assert.ok(activationStatuses);
  assert.doesNotMatch(activationStatuses, /"ACTIVE"/);
  assert.doesNotMatch(pageSource, /import ContractWorkflowStepper/);
  assert.doesNotMatch(pageSource, /stepperVisible/);
});

test("activated contract details expose the optional handover document actions", () => {
  assert.match(pageSource, /<HandoverDocumentCard/);
  assert.match(handoverDocumentStateSource, /Chờ bổ sung bản ký/);
  assert.match(handoverDocumentCardSource, /Tải bản in/);
  assert.match(
    handoverDocumentCardSource,
    /documentState\.key !== "COMPLETE"/,
  );
  assert.match(handoverDocumentCardSource, /Upload bản đã ký/);
  assert.match(handoverDocumentCardSource, /"COMPLETE" \? "Thay"/);
  assert.match(handoverDocumentCardSource, /sm:grid-cols-3/);
  assert.match(handoverDocumentCardSource, /h-11.*text-sm/);
});

test("active contracts show one context-aware dossier badge", () => {
  assert.match(pageSource, /Chưa có biên bản ký/);
  assert.match(pageSource, /Đủ hồ sơ/);
  assert.match(pageSource, /activeDossierComplete/);
  assert.doesNotMatch(pageSource, /flex flex-col items-start gap-1\.5/);
});

test("management table headers align with all contract columns", () => {
  const header = pageSource.match(/<thead[\s\S]*?<\/thead>/)?.[0] || "";
  const labels = [
    "Mã HĐ",
    "Phòng",
    "Người ký chính",
    "Số người",
    "Thời hạn",
    "Giá thuê",
    "File",
    "Trạng thái",
    "Thao tác",
  ];

  assert.equal((header.match(/<th\b/g) || []).length, labels.length);
  labels.forEach((label) => assert.match(header, new RegExp(label)));
});
