import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateMeterUsage,
  normalizeMeterReadingRoom,
} from "../app/dashboard/meter-readings/batch/meterReadingBatchMapper.js";

test("normalizes the backend camelCase meter reading payload", () => {
  const room = normalizeMeterReadingRoom({
    roomId: 41,
    roomCode: "P401",
    roomName: "Phòng 401",
    electricityPrevious: "1200.5",
    electricityCurrent: null,
    waterPrevious: 35,
    waterCurrent: 42,
    status: "synced",
    photosCount: "2",
  });

  assert.equal(room.key, "room:41");
  assert.equal(room.id, "P401");
  assert.equal(room.roomId, 41);
  assert.equal(room.elecPrev, 1200.5);
  assert.equal(room.elecCurr, 1200.5);
  assert.equal(room.waterPrev, 35);
  assert.equal(room.waterCurr, 42);
  assert.equal(room.photos, 2);
});

test("keeps compatibility with legacy snake_case payloads", () => {
  const room = normalizeMeterReadingRoom({
    room_id: 42,
    room_code: "P402",
    electricity_previous: 900,
    electricity_current: 950,
    water_previous: 20,
    water_current: 24,
    photos_count: 1,
  });

  assert.equal(room.key, "room:42");
  assert.equal(room.id, "P402");
  assert.equal(room.elecCurr, 950);
  assert.equal(room.waterCurr, 24);
});

test("never returns NaN when calculating meter usage", () => {
  assert.equal(calculateMeterUsage(null, 10), null);
  assert.equal(calculateMeterUsage(undefined, 10), null);
  assert.equal(calculateMeterUsage("invalid", 10), null);
  assert.equal(calculateMeterUsage(15, undefined), null);
  assert.equal(calculateMeterUsage("15", "10"), 5);
});

test("uses database room ids as stable React keys", () => {
  const rooms = [
    normalizeMeterReadingRoom({ roomId: 41, roomCode: "P401" }, 0),
    normalizeMeterReadingRoom({ roomId: 42, roomCode: "P402" }, 1),
  ];

  assert.equal(new Set(rooms.map((room) => room.key)).size, rooms.length);
});
