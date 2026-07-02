import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadDepositContractsService() {
  const source = readFileSync(new URL("./depositContractsService.js", import.meta.url), "utf8")
    .replace(/import\s*{\s*API_BASE_URL\s*}\s*from\s*"@\/lib\/apiConfig";\s*/m, "")
    .replace(/import\s*{\s*refreshTokenApi\s*}\s*from\s*"@\/services\/identityAccessService";\s*/m, "")
    .replaceAll("export async function ", "async function ")
    .replaceAll("export function ", "function ");

  const factory = new Function(
    "API_BASE_URL",
    "refreshTokenApi",
    `${source}
return {
  downloadDepositContractPdf,
  fetchDepositContractFile,
  fetchDepositContractBlob,
  buildDepositContractDocumentFilename,
};`,
  );

  return factory("https://api.test/api/v1", async () => {});
}

test("buildDepositContractDocumentFilename formats HDC filename from room and expected move-in date", () => {
  const { buildDepositContractDocumentFilename } = loadDepositContractsService();

  assert.equal(
    buildDepositContractDocumentFilename({ roomCode: "201", expectedMoveInDate: "2026-07-16" }),
    "P201_HDC_16_07_2026.pdf",
  );
  assert.equal(
    buildDepositContractDocumentFilename({ roomCode: "P201", startDate: "2026-07-16" }),
    "P201_HDC_16_07_2026.pdf",
  );
});

test("downloadDepositContractPdf prefers backend content-disposition filename", async () => {
  const { downloadDepositContractPdf } = loadDepositContractsService();
  const originalFetch = globalThis.fetch;
  const originalDocument = globalThis.document;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const fetchCalls = [];
  let clickedDownload = "";

  globalThis.fetch = async (...args) => {
    fetchCalls.push(args);
    return {
      status: 200,
      ok: true,
      headers: {
        get(name) {
          return name.toLowerCase() === "content-disposition"
            ? "attachment; filename=\"hop-dong-dat-coc-DC-001.pdf\"; filename*=UTF-8''hop-dong-dat-coc-DC-001.pdf"
            : null;
        },
      },
      blob: async () => new Blob(["pdf"], { type: "application/pdf" }),
    };
  };
  globalThis.document = {
    body: {
      appendChild() {},
    },
    createElement(tagName) {
      assert.equal(tagName, "a");
      return {
        href: "",
        download: "",
        click() {
          clickedDownload = this.download;
        },
        remove() {},
      };
    },
  };
  URL.createObjectURL = () => "blob:test";
  URL.revokeObjectURL = () => {};

  try {
    await downloadDepositContractPdf(42, "hop-dong-dat-coc.pdf");

    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0][0], "https://api.test/api/v1/deposit-agreements/42/draft-pdf");
    assert.equal(clickedDownload, "hop-dong-dat-coc-DC-001.pdf");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  }
});

test("downloadDepositContractPdf uses caller fallback when header is unavailable", async () => {
  const { downloadDepositContractPdf } = loadDepositContractsService();
  const originalFetch = globalThis.fetch;
  const originalDocument = globalThis.document;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  let clickedDownload = "";

  globalThis.fetch = async () => ({
    status: 200,
    ok: true,
    headers: {
      get() {
        return null;
      },
    },
    blob: async () => new Blob(["pdf"], { type: "application/pdf" }),
  });
  globalThis.document = {
    body: {
      appendChild() {},
    },
    createElement(tagName) {
      assert.equal(tagName, "a");
      return {
        href: "",
        download: "",
        click() {
          clickedDownload = this.download;
        },
        remove() {},
      };
    },
  };
  URL.createObjectURL = () => "blob:test";
  URL.revokeObjectURL = () => {};

  try {
    await downloadDepositContractPdf(42, "P201_HDC_16_07_2026.pdf");

    assert.equal(clickedDownload, "P201_HDC_16_07_2026.pdf");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  }
});

test("contract workflow deposit action downloads instead of opening blob preview", () => {
  const source = readFileSync(
    new URL("../app/dashboard/contract-template/ContractWorkflowStepper.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /await downloadDepositContractPdf\(depositAgreementId, buildDepositContractDocumentFilename\(contractDetails\)\);/);
  assert.doesNotMatch(source, /await openDepositContractPdf\(depositAgreementId\);/);
  assert.match(source, /Đã tải PDF hợp đồng đặt cọc\. Vui lòng in và ký\./);
});
