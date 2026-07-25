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

test("signed handover upload is required only for non-renewal activation", () => {
  assert.match(workflowSource, /handoverSignedFileId/);
  assert.match(workflowSource, /handover-signed-file/);
  assert.match(workflowSource, /requiresMoveInHandover/);
  assert.match(pageSource, /isRenewalContract/);
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

test("contract list keeps badges readable without internal table scroll", () => {
  assert.match(pageSource, /<span className="whitespace-nowrap">\{label\}<\/span>/);
  assert.doesNotMatch(pageSource, /dashboard-table--scroll contract-management-table/);
  assert.doesNotMatch(pageSource, /maxHeight:\s*"calc\(100vh - 320px\)"/);
  assert.doesNotMatch(pageSource, /overflowX:\s*"scroll"/);
  assert.doesNotMatch(pageSource, /className="table-fixed/);
});

test("contract list does not render the file column", () => {
  const contractTable =
    pageSource.match(/contract-management-table[\s\S]*?<\/table>/)?.[0] || "";

  assert.doesNotMatch(contractTable, /<th>File<\/th>/);
  assert.doesNotMatch(contractTable, /data-label="File"/);
  assert.doesNotMatch(pageSource, /function FileBadge/);
});

test("contract list hides pagination until rows exceed page size", () => {
  assert.match(pageSource, /filteredTotalElements > size \? \(/);
  assert.match(pageSource, /<DashboardPagination[\s\S]*itemLabel="hợp đồng"/);
});

test("contract list action button keeps activation label visible", () => {
  assert.match(pageSource, /min-w-\[9\.75rem\]/);
  assert.match(pageSource, /\? "Kích hoạt hợp đồng" : "Xem chi tiết"/);
  assert.doesNotMatch(pageSource, /h-9 w-full[\s\S]*Kích hoạt hợp đồng/);
});

test("management table headers align with all contract columns", () => {
  const header =
    pageSource.match(/contract-management-table[\s\S]*?<thead[\s\S]*?<\/thead>/)?.[0] || "";
  const labels = [
    "Mã HĐ",
    "Phòng",
    "Người ký chính",
    "Số người",
    "Thời hạn",
    "Giá thuê",
    "Trạng thái",
    "Thao tác",
  ];

  assert.equal((header.match(/<th\b/g) || []).length, labels.length);
  labels.forEach((label) => assert.match(header, new RegExp(label)));
  assert.doesNotMatch(header, /File/);
});

test("contract extension updates the current contract instead of creating a renewal contract", () => {
  assert.match(pageSource, /Gia hạn hợp đồng/);
  assert.match(pageSource, /Lưu gia hạn/);
  assert.match(
    pageSource,
    /const updated = await updateLeaseContractTerms\(mergedSelected\.leaseContractId/,
  );
  assert.doesNotMatch(pageSource, /renewLeaseContract/);
  assert.doesNotMatch(pageSource, /Mã hợp đồng mới/);
  assert.doesNotMatch(pageSource, /Tạo hợp đồng mới/);
  assert.doesNotMatch(pageSource, /Tái ký \/ Gia hạn/);
});
