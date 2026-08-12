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
    `${source}\nreturn { fetchTenantProfiles, downloadTenantProfilesPoliceReportExport };`,
  );

  return factory("https://api.test/api/v1", authenticatedFetch, () => ({}), () => [], () => "");
}

test("fetchTenantProfiles requests the tenant profile list", async () => {
  const calls = [];
  const { fetchTenantProfiles } = loadService(async (url, options) => {
    calls.push({ url, options });
    return { content: [], totalElements: 0, totalPages: 0 };
  });

  const result = await fetchTenantProfiles({ page: 0, size: 10 });

  assert.equal(
    calls[0].url,
    "https://api.test/api/v1/tenant-profiles?page=0&size=10&sort=createdAt%2Cdesc",
  );
  assert.equal(calls[0].options.method, "GET");
  assert.deepEqual(result, { items: [] });
});
