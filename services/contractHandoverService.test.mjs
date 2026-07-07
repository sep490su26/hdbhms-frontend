import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadContractHandoverService() {
  const source = readFileSync(new URL("./contractHandoverService.js", import.meta.url), "utf8")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/services\/identityAccessService";\s*/m, "")
    .replaceAll("export async function ", "async function ")
    .replaceAll("export function ", "function ")
    .replaceAll("export const ", "const ");

  const factory = new Function(
    "API_BASE_URL",
    "ApiError",
    "authenticatedFetch",
    "getAuthToken",
    "refreshTokenApi",
    `${source}
return {
  buildHandoverDocumentFilename,
  downloadHandoverDraftPdf,
  downloadHandoverSignedPdf,
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
    () => "",
    async () => {},
  );
}

function installDownloadDom() {
  const originalDocument = globalThis.document;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  let clickedDownload = "";

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

  return {
    get clickedDownload() {
      return clickedDownload;
    },
    restore() {
      globalThis.document = originalDocument;
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
    },
  };
}

test("buildHandoverDocumentFilename formats BBBG filename from room and date", () => {
  const { buildHandoverDocumentFilename } = loadContractHandoverService();

  assert.equal(
    buildHandoverDocumentFilename({ roomCode: "205", startDate: "2026-06-29" }),
    "P205_BBBG_29_06_2026.pdf",
  );
  assert.equal(
    buildHandoverDocumentFilename({ roomCode: "P205", handoverDate: "2026-07-16" }),
    "P205_BBBG_16_07_2026.pdf",
  );
  assert.equal(buildHandoverDocumentFilename({}), "Phong-X_BBBG_Chua-Ro-Ngay.pdf");
});

test("handover download fallbacks do not use legacy bien-ban filenames", () => {
  const serviceSource = readFileSync(new URL("./contractHandoverService.js", import.meta.url), "utf8");
  const stepperSource = readFileSync(
    new URL("../app/dashboard/contract-template/ContractWorkflowStepper.jsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(serviceSource, /bien-ban-ban-giao(?:-da-ky)?\.pdf/);
  assert.match(stepperSource, /buildHandoverDocumentFilename/);
  assert.match(
    stepperSource,
    /downloadHandoverDraftPdf\(contractId, "MOVE_IN", buildHandoverDocumentFilename\(contractDetails\)\)/,
  );
  assert.doesNotMatch(stepperSource, /downloadHandoverDraftPdf\(contractId, "MOVE_IN"\);/);
});

test("downloadHandoverDraftPdf prefers backend content-disposition filename", async () => {
  const { downloadHandoverDraftPdf } = loadContractHandoverService();
  const originalFetch = globalThis.fetch;
  const dom = installDownloadDom();

  globalThis.fetch = async () => ({
    status: 200,
    ok: true,
    headers: {
      get(name) {
        return name.toLowerCase() === "content-disposition"
          ? "attachment; filename*=UTF-8''P205_BBBG_29_06_2026.pdf"
          : null;
      },
    },
    blob: async () => new Blob(["pdf"], { type: "application/pdf" }),
  });

  try {
    await downloadHandoverDraftPdf(9);

    assert.equal(dom.clickedDownload, "P205_BBBG_29_06_2026.pdf");
  } finally {
    globalThis.fetch = originalFetch;
    dom.restore();
  }
});

test("downloadHandoverDraftPdf uses caller fallback when header is unavailable", async () => {
  const { downloadHandoverDraftPdf } = loadContractHandoverService();
  const originalFetch = globalThis.fetch;
  const dom = installDownloadDom();

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

  try {
    await downloadHandoverDraftPdf(9, "MOVE_IN", "P201_BBBG_16_07_2026.pdf");

    assert.equal(dom.clickedDownload, "P201_BBBG_16_07_2026.pdf");
  } finally {
    globalThis.fetch = originalFetch;
    dom.restore();
  }
});

test("downloadHandoverSignedPdf prefers backend content-disposition filename", async () => {
  const { downloadHandoverSignedPdf } = loadContractHandoverService();
  const originalFetch = globalThis.fetch;
  const dom = installDownloadDom();

  globalThis.fetch = async () => ({
    status: 200,
    ok: true,
    headers: {
      get(name) {
        return name.toLowerCase() === "content-disposition"
          ? "attachment; filename*=UTF-8''P205_BBBG_29_06_2026.pdf"
          : null;
      },
    },
    blob: async () => new Blob(["pdf"], { type: "application/pdf" }),
  });

  try {
    await downloadHandoverSignedPdf(9);

    assert.equal(dom.clickedDownload, "P205_BBBG_29_06_2026.pdf");
  } finally {
    globalThis.fetch = originalFetch;
    dom.restore();
  }
});
