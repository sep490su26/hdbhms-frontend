import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadService(authenticatedFetch) {
  const source = readFileSync(new URL("./tenantProfilesService.js", import.meta.url), "utf8")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/services\/identityAccessService";\s*/m, "")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/lib\/pageResponse";\s*/m, "")
    .replaceAll("export async function ", "async function ");

  const factory = new Function(
    "API_BASE_URL",
    "authenticatedFetch",
    "normalizePageResponse",
    "readPageItems",
    "getAuthToken",
    `${source}\nreturn { requestTenantProfileAccess };`,
  );

  return factory("https://api.test/api/v1", authenticatedFetch, () => ({}), () => [], () => "");
}

test("requestTenantProfileAccess posts to the selected profile", async () => {
  const calls = [];
  const { requestTenantProfileAccess } = loadService(async (url, options) => {
    calls.push({ url, options });
    return { requestId: 12, status: "PENDING", canViewSensitiveProfile: false };
  });

  const result = await requestTenantProfileAccess(42);

  assert.equal(calls[0].url, "https://api.test/api/v1/tenant-profiles/42/access-requests");
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].options.body), {});
  assert.equal(result.status, "PENDING");
});
