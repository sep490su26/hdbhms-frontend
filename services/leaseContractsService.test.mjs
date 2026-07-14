import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadLeaseContractsService() {
  const source = readFileSync(new URL("./leaseContractsService.js", import.meta.url), "utf8")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/services\/identityAccessService";\s*/m, "")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/lib\/pageResponse";\s*/m, "")
    .replaceAll("export async function ", "async function ")
    .replaceAll("export function ", "function ");

  const factory = new Function(
    "API_BASE_URL",
    "ApiError",
    "authenticatedFetch",
    "getAuthToken",
    "refreshTokenApi",
    "normalizePageResponse",
    "readPageItems",
    `${source}
return {
  uploadSignedLeaseContractFile,
  fetchLeaseContractSignedFileBlob,
  downloadLeaseContractSignedFile,
  downloadLeaseContractDraftPdf,
  normalizeLeaseContractItem,
  buildLeaseContractDocumentFilename,
};`,
  );

  class ApiError extends Error {
    constructor(message, options = {}) {
      super(message);
      Object.assign(this, options);
    }
  }

  return factory(
    "https://api.test/api/v1",
    ApiError,
    async () => ({}),
    () => "token",
    async () => {},
    (data) => data,
    (data) => Array.isArray(data?.items) ? data.items : [],
  );
}

test("buildLeaseContractDocumentFilename formats HDT filename from room and start date", () => {
  const { buildLeaseContractDocumentFilename } = loadLeaseContractsService();

  assert.equal(
    buildLeaseContractDocumentFilename({ roomCode: "205", startDate: "2026-06-29" }),
    "HDT_P205_29.06.2026.pdf",
  );
  assert.equal(
    buildLeaseContractDocumentFilename({ roomCode: "P205", startDate: "2026-07-16" }),
    "HDT_P205_16.07.2026.pdf",
  );
  assert.equal(buildLeaseContractDocumentFilename({}), "HDT_Phong-X_Chua-Ro-Ngay.pdf");
});

test("lease contract download fallbacks do not use legacy hop-dong-thue filenames", () => {
  const serviceSource = readFileSync(new URL("./leaseContractsService.js", import.meta.url), "utf8");
  const pageSource = readFileSync(
    new URL("../app/dashboard/contract-template/page.jsx", import.meta.url),
    "utf8",
  );
  const wizardSource = readFileSync(
    new URL("../app/dashboard/contract-template/ContractPrintWizard.jsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(serviceSource, /hop-dong-thue(?:-da-ky)?\.pdf/);
  assert.doesNotMatch(pageSource, /hop-dong-thue\.pdf/);
  assert.doesNotMatch(wizardSource, /hop-dong-thue/);
  assert.match(pageSource, /selectedLeaseContractFilename/);
  assert.match(
    pageSource,
    /downloadLeaseContractSignedFile\(\s*mergedSelected\.leaseContractId,\s*selectedLeaseContractFilename,\s*\)/,
  );
  assert.match(wizardSource, /buildLeaseContractDocumentFilename/);
});

test("downloadLeaseContractDraftPdf prefers backend content-disposition filename", async () => {
  const { downloadLeaseContractDraftPdf } = loadLeaseContractsService();
  const originalFetch = globalThis.fetch;
  const originalDocument = globalThis.document;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  let clickedDownload = "";

  globalThis.fetch = async () => ({
    status: 200,
    ok: true,
    headers: {
      get(name) {
        return name.toLowerCase() === "content-disposition"
          ? "attachment; filename*=UTF-8''HDT_P205_29.06.2026.pdf"
          : null;
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
    await downloadLeaseContractDraftPdf(9);

    assert.equal(clickedDownload, "HDT_P205_29.06.2026.pdf");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  }
});

test("downloadLeaseContractDraftPdf uses caller fallback when header is unavailable", async () => {
  const { downloadLeaseContractDraftPdf } = loadLeaseContractsService();
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
    await downloadLeaseContractDraftPdf(9, "HDT_P201_16.07.2026.pdf");

    assert.equal(clickedDownload, "HDT_P201_16.07.2026.pdf");
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  }
});

test("contract workflow lease action passes generated HDT filename fallback", () => {
  const source = readFileSync(
    new URL("../app/dashboard/contract-template/ContractWorkflowStepper.jsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /await downloadLeaseContractDraftPdf\(\s*contractId,\s*buildLeaseContractDocumentFilename\(contractDetails\),?\s*\);/,
  );
  assert.doesNotMatch(source, /await downloadLeaseContractDraftPdf\(contractId\);/);
});

test("contract workflow lease signed state uses signedFileId and replace=true for re-upload", () => {
  const source = readFileSync(
    new URL("../app/dashboard/contract-template/ContractWorkflowStepper.jsx", import.meta.url),
    "utf8",
  );
  const activationFlowSource = readFileSync(
    new URL("../app/dashboard/contract-template/ContractActivationFlow.jsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /const leaseSignedFileId =\s*contractDetails\?\.signedFileId/,
  );
  assert.match(source, /const leaseUploadInFlightRef = useRef\(false\);/);
  assert.match(source, /complete=\{Boolean\(leaseSignedFileId\)\}/);
  assert.match(
    source,
    /uploadSignedLeaseContractFile\(contractDetails, file, \{\s*replace: Boolean\(leaseSignedFileId\),?\s*\}\)/,
  );
  assert.match(source, /if \(leaseUploadInFlightRef\.current\)/);
  assert.doesNotMatch(source, /currentFileId/);
  assert.match(activationFlowSource, /const leaseSignedFileId = contract\?\.signedFileId/);
  assert.doesNotMatch(activationFlowSource, /currentFileId/);
});

test("uploadSignedLeaseContractFile rejects missing leaseContractId without calling API", async () => {
  const { uploadSignedLeaseContractFile } = loadLeaseContractsService();
  const fetchCalls = [];
  globalThis.fetch = async (...args) => {
    fetchCalls.push(args);
    return { status: 200, ok: true, json: async () => ({ code: 0, data: {} }) };
  };

  await assert.rejects(
    () => uploadSignedLeaseContractFile({ depositAgreementId: 123 }, new Blob(["pdf"], { type: "application/pdf" })),
    /Hợp đồng thuê chưa được tạo/,
  );
  assert.equal(fetchCalls.length, 0);
});

test("uploadSignedLeaseContractFile never falls back to deposit/HDC endpoint", async () => {
  const { uploadSignedLeaseContractFile } = loadLeaseContractsService();
  const fetchCalls = [];
  globalThis.fetch = async (...args) => {
    fetchCalls.push(args);
    return {
      status: 200,
      ok: true,
      json: async () => ({ code: 0, data: { leaseContractId: 9, signedFileId: 22 } }),
    };
  };

  const result = await uploadSignedLeaseContractFile(
    { leaseContractId: 9, depositAgreementId: 123 },
    new Blob(["pdf"], { type: "application/pdf" }),
  );

  assert.equal(result.leaseContractId, 9);
  assert.equal(result.signedFileId, 22);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0][0], "https://api.test/api/v1/lease-contracts/9/signed-file");
  assert.ok(!fetchCalls[0][0].includes("/management/deposits/"));
});

test("uploadSignedLeaseContractFile sends replace=true when signed HDT already exists", async () => {
  const { uploadSignedLeaseContractFile } = loadLeaseContractsService();
  const fetchCalls = [];
  globalThis.fetch = async (...args) => {
    fetchCalls.push(args);
    return {
      status: 200,
      ok: true,
      json: async () => ({ code: 0, data: { leaseContractId: 9, signedFileId: 23 } }),
    };
  };

  const result = await uploadSignedLeaseContractFile(
    { leaseContractId: 9, signedFileId: 22 },
    new Blob(["pdf"], { type: "application/pdf" }),
  );

  assert.equal(result.signedFileId, 23);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0][0], "https://api.test/api/v1/lease-contracts/9/signed-file?replace=true");
});

test("fetchLeaseContractSignedFileBlob calls signed HDT download endpoint", async () => {
  const { fetchLeaseContractSignedFileBlob } = loadLeaseContractsService();
  const fetchCalls = [];
  const expectedBlob = new Blob(["pdf"], { type: "application/pdf" });
  globalThis.fetch = async (...args) => {
    fetchCalls.push(args);
    return {
      status: 200,
      ok: true,
      blob: async () => expectedBlob,
    };
  };

  const blob = await fetchLeaseContractSignedFileBlob(9);

  assert.equal(blob, expectedBlob);
  assert.equal(fetchCalls[0][0], "https://api.test/api/v1/lease-contracts/9/signed-file");
});
