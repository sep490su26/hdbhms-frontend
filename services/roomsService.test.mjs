import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadRoomsService() {
  const source = readFileSync(new URL("./roomsService.js", import.meta.url), "utf8")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"@\/lib\/apiConfig";\s*/m, "")
    .replaceAll("export const ", "const ")
    .replaceAll("export async function ", "async function ")
    .replaceAll("export function ", "function ");

  const factory = new Function(
    "API_BASE_URL",
    `${source}
return {
  fetchPublicActiveProperties,
  fetchPublicRoomCatalog,
  fetchPublicRoomById,
  mapApiRoomStatus,
  normalizeApiRoom,
  statusCopy,
};`,
  );

  return factory("https://api.test/api/v1");
}

test("maps draft room status without falling back to occupied", () => {
  const { mapApiRoomStatus, normalizeApiRoom, statusCopy } = loadRoomsService();

  assert.equal(mapApiRoomStatus("DRAFT"), "draft");
  assert.equal(mapApiRoomStatus("RESERVED_FOR_TRANSFER"), "deposited");
  assert.equal(statusCopy("draft"), "Bản nháp");
  assert.equal(statusCopy("unknown"), "Chưa rõ");

  assert.equal(
    normalizeApiRoom({
      id: 901,
      roomCode: "901",
      status: "DRAFT",
      floorName: "Tầng 9",
    }).status,
    "draft",
  );
});

test("public catalog and detail hide draft rooms", async () => {
  const { fetchPublicActiveProperties, fetchPublicRoomCatalog } = loadRoomsService();
  assert.equal(typeof fetchPublicActiveProperties, "function");
  const { fetchPublicRoomById } = loadRoomsService();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    const requestUrl = String(url);
    if (requestUrl.includes("/properties?")) {
      return {
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            data: [{ id: 1, name: "Active 1", status: "ACTIVE" }],
          },
        }),
      };
    }
    if (requestUrl.includes("/floors?")) {
      return {
        ok: true,
        json: async () => ({
          code: 0,
          data: [{ id: 1, name: "Tầng 1", sortOrder: 1 }],
        }),
      };
    }
    if (requestUrl.endsWith("/rooms/102")) {
      return {
        ok: true,
        json: async () => ({
          code: 0,
          data: { id: 102, roomCode: "102", currentStatus: "DRAFT" },
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        code: 0,
        data: {
          data: [
            { id: 101, roomCode: "101", floorId: 1, currentStatus: "VACANT" },
            { id: 102, roomCode: "102", floorId: 1, currentStatus: "DRAFT" },
          ],
        },
      }),
    };
  };

  try {
    const catalog = await fetchPublicRoomCatalog();

    assert.deepEqual(catalog.rooms.map((room) => room.roomCode), ["101"]);
    assert.deepEqual(catalog.floors[0].rooms.map((room) => room.roomCode), ["101"]);
    assert.equal(await fetchPublicRoomById("102"), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchPublicRoomById scopes duplicate room codes by property", async () => {
  const { fetchPublicRoomById } = loadRoomsService();
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url) => {
    const requestUrl = String(url);
    calls.push(requestUrl);
    if (requestUrl.includes("/properties?")) {
      return {
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            data: [
              { id: 1, name: "Active 1", status: "ACTIVE" },
              { id: 2, name: "Active 2", status: "ACTIVE" },
            ],
          },
        }),
      };
    }
    if (requestUrl.includes("/floors?propertyId=2")) {
      return {
        ok: true,
        json: async () => ({
          code: 0,
          data: [{ id: 21, name: "Táº§ng 1", sortOrder: 1 }],
        }),
      };
    }
    if (requestUrl.includes("/rooms?propertyId=2")) {
      return {
        ok: true,
        json: async () => ({
          code: 0,
          data: {
            data: [
              { id: 2101, roomCode: "101", floorId: 21, currentStatus: "VACANT" },
            ],
          },
        }),
      };
    }
    if (requestUrl.endsWith("/rooms/101")) {
      return {
        ok: true,
        json: async () => ({
          code: 0,
          data: { id: 1101, roomCode: "101", propertyId: 1, currentStatus: "VACANT" },
        }),
      };
    }
    throw new Error(`Unexpected request ${requestUrl}`);
  };

  try {
    const room = await fetchPublicRoomById("101", { propertyId: 2 });

    assert.equal(room.id, 2101);
    assert.equal(room.roomCode, "101");
    assert.equal(room.propertyId, 2);
    assert.ok(calls.some((url) => url.includes("/rooms?propertyId=2")));
    assert.ok(!calls.some((url) => url.endsWith("/rooms/101")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetches active properties from paged public endpoint", async () => {
  const { fetchPublicActiveProperties } = loadRoomsService();
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return {
      ok: true,
      json: async () => ({
        code: 0,
        data: {
          data: [
            { id: 1, name: "Active 1", status: "ACTIVE" },
            { id: 2, name: "Active 2", status: "ACTIVE" },
          ],
        },
      }),
    };
  };

  try {
    const properties = await fetchPublicActiveProperties();

    assert.match(calls[0], /\/properties\?/);
    assert.match(calls[0], /status=ACTIVE/);
    assert.deepEqual(properties.map((item) => item.name), ["Active 1", "Active 2"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
