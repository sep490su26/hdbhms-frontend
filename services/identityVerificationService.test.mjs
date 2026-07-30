import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadIdentityVerificationService(authenticatedFetch = async () => ({})) {
  const source = readFileSync(new URL("./identityVerificationService.js", import.meta.url), "utf8")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/services\/identityAccessService";\s*/m, "")
    .replaceAll("export async function ", "async function ")
    .replaceAll("export function ", "function ");

  const factory = new Function(
    "authenticatedFetch",
    `${source}
return { extractCccdImages, normalizeCccdScanResult, normalizeGenderLabel };`,
  );

  return factory(authenticatedFetch);
}

test("extractCccdImages calls the front/back CCCD extraction endpoint", async () => {
  let request;
  const { extractCccdImages } = loadIdentityVerificationService(async (url, options) => {
    request = { url, options };
    return { success: true, extractedIdentity: { idNumber: "012345678901" } };
  });

  await extractCccdImages("front-image", "back-image");

  assert.equal(request.url, "/identity-verification/cccd/extract");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.body.get("frontImage"), "front-image");
  assert.equal(request.options.body.get("backImage"), "back-image");
});

test("normalizeCccdScanResult maps issued place from backend identity", () => {
  const { normalizeCccdScanResult } = loadIdentityVerificationService();

  const result = normalizeCccdScanResult({
    data: {
      extractedIdentity: {
        id_number: "012345678901",
        issued_date: "01/04/2020",
        issued_place: "Cục Cảnh sát quản lý hành chính về trật tự xã hội",
      },
    },
  });

  assert.equal(result.identity.issuedDate, "2020-04-01");
  assert.equal(result.identity.issuedPlace, "Cục Cảnh sát quản lý hành chính về trật tự xã hội");
});

test("normalizeCccdScanResult formats Vietnamese names and flexible dates", () => {
  const { normalizeCccdScanResult } = loadIdentityVerificationService();

  const result = normalizeCccdScanResult({
    extractedIdentity: {
      fullName: "NGUYỄN VĂN A",
      dob: "25.08.2003",
      issuedDate: "01-03-2021",
    },
  });

  assert.equal(result.identity.fullName, "Nguyễn Văn A");
  assert.equal(result.identity.dob, "2003-08-25");
  assert.equal(result.identity.issuedDate, "2021-03-01");
});

test("normalizeGenderLabel maps enum and Vietnamese variants", () => {
  const { normalizeGenderLabel } = loadIdentityVerificationService();

  assert.equal(normalizeGenderLabel("MALE"), "Nam");
  assert.equal(normalizeGenderLabel("nữ"), "Nữ");
  assert.equal(normalizeGenderLabel("khac"), "Khác");
});
