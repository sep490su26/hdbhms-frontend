import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadIdentityAccessService() {
  const source = readFileSync(new URL("./identityAccessService.js", import.meta.url), "utf8")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/lib\/apiConfig";\s*/m, "")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/lib\/pageResponse";\s*/m, "")
    .replace(/export\s*{\s*API_BASE_URL\s*};\s*/m, "")
    .replaceAll("export class ", "class ")
    .replaceAll("export async function ", "async function ")
    .replaceAll("export function ", "function ");

  const factory = new Function(
    "API_BASE_URL",
    `${source}
return {
  ApiError,
  authenticatedFetch,
  normalizeUserAccount,
  parseEnvelope,
};`,
  );

  return factory("https://api.test/api/v1");
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json" },
  });
}

test("parseEnvelope accepts backend success envelopes with numeric or string code", async () => {
  const { parseEnvelope } = loadIdentityAccessService();

  assert.deepEqual(await parseEnvelope(jsonResponse({ code: 0, data: { ok: true } })), { ok: true });
  assert.deepEqual(await parseEnvelope(jsonResponse({ code: "0", data: [1, 2] })), [1, 2]);
});

test("parseEnvelope accepts direct JSON object and array responses", async () => {
  const { parseEnvelope } = loadIdentityAccessService();

  assert.deepEqual(await parseEnvelope(jsonResponse({ id: 7, name: "P101" })), { id: 7, name: "P101" });
  assert.deepEqual(await parseEnvelope(jsonResponse([{ id: 1 }])), [{ id: 1 }]);
});

test("parseEnvelope preserves backend error message, details, code, and status", async () => {
  const { parseEnvelope } = loadIdentityAccessService();

  await assert.rejects(
    parseEnvelope(jsonResponse({ code: 40902, message: "Meter reading not found", details: "Missing" }, { status: 404 })),
    (error) => {
      assert.equal(error.message, "Meter reading not found");
      assert.equal(error.details, "Missing");
      assert.equal(error.code, 40902);
      assert.equal(error.status, 404);
      return true;
    },
  );
});

test("parseEnvelope parses XML error envelopes without treating code 0 as success", async () => {
  const { parseEnvelope } = loadIdentityAccessService();
  const xml = "<ApiResponse><code>0</code><message>Undefined</message><details>Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.</details></ApiResponse>";

  await assert.rejects(
    parseEnvelope(new Response(xml, { status: 500, headers: { "content-type": "application/xml" } })),
    (error) => {
      assert.equal(error.message, "Undefined");
      assert.equal(error.details, "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.");
      assert.equal(error.code, 0);
      assert.equal(error.status, 500);
      return true;
    },
  );
});

test("parseEnvelope falls back to details when message is empty", async () => {
  const { parseEnvelope } = loadIdentityAccessService();

  await assert.rejects(
    parseEnvelope(jsonResponse({ code: 400, details: "Invalid period" }, { status: 400 })),
    /Invalid period/,
  );
});

test("parseEnvelope handles empty, 204, and non JSON responses", async () => {
  const { parseEnvelope } = loadIdentityAccessService();

  assert.deepEqual(await parseEnvelope(new Response(null, { status: 204 })), {});
  assert.deepEqual(await parseEnvelope(new Response("", { status: 200 })), {});
  assert.equal(await parseEnvelope(new Response("plain text", { status: 200 })), "plain text");

  await assert.rejects(
    parseEnvelope(new Response("server exploded", { status: 500 })),
    (error) => {
      assert.equal(error.message, "server exploded");
      assert.equal(error.status, 500);
      return true;
    },
  );
});

test("parseEnvelope maps empty HTTP errors to clear status messages", async () => {
  const { parseEnvelope } = loadIdentityAccessService();

  await assert.rejects(parseEnvelope(new Response(null, { status: 401 })), /chưa đăng nhập|hết hạn/);
  await assert.rejects(parseEnvelope(new Response(null, { status: 403 })), /không có quyền/i);
  await assert.rejects(parseEnvelope(new Response(null, { status: 500 })), /Lỗi hệ thống/);
});

test("authenticatedFetch reports network failures as ApiError", async () => {
  const { authenticatedFetch } = loadIdentityAccessService();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };

  try {
    await assert.rejects(authenticatedFetch("/meter-readings/history"), /Không thể kết nối máy chủ/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("authenticatedFetch requests JSON responses", async () => {
  const { authenticatedFetch } = loadIdentityAccessService();
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.headers.Accept, "application/json");
      return jsonResponse({ code: 0, data: { ok: true } });
    };

    assert.deepEqual(await authenticatedFetch("/meter-readings/history"), { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("normalizeUserAccount preserves assigned property shapes used by staff accounts", () => {
  const { normalizeUserAccount } = loadIdentityAccessService();

  const assignedArray = normalizeUserAccount({
    id: 10,
    role: "MANAGER",
    assigned_properties: [{ property_id: 7, property_name: "Cơ sở A", property_code: "CSA" }],
  });
  assert.equal(assignedArray.assignedProperties[0].id, 7);
  assert.equal(assignedArray.assignedProperties[0].name, "Cơ sở A");
  assert.equal(assignedArray.assignedProperties[0].code, "CSA");

  const assignedObject = normalizeUserAccount({
    id: 11,
    role: "MANAGER",
    assignedProperty: { id: 8, name: "Cơ sở B", code: "CSB" },
  });
  assert.equal(assignedObject.assignedProperties[0].id, 8);
  assert.equal(assignedObject.assignedProperties[0].name, "Cơ sở B");

  const flatProperty = normalizeUserAccount({
    id: 12,
    role: "MANAGER",
    propertyId: 9,
    propertyName: "Cơ sở C",
  });
  assert.equal(flatProperty.assignedProperties[0].id, 9);
  assert.equal(flatProperty.assignedProperties[0].name, "Cơ sở C");
});
