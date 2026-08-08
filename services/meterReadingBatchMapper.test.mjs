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
    electricityPhotoId: 9,
    status: "synced",
  });

  assert.equal(room.key, "room:41");
  assert.equal(room.id, "P401");
  assert.equal(room.roomId, 41);
  assert.equal(room.elecPrev, 1200.5);
  assert.equal(room.elecCurr, 1200.5);
  assert.equal(room.photos, 1);
});

test("keeps compatibility with legacy snake_case payloads", () => {
  const room = normalizeMeterReadingRoom({
    room_id: 42,
    room_code: "P402",
    electricity_previous: 900,
    electricity_current: 950,
  });

  assert.equal(room.key, "room:42");
  assert.equal(room.id, "P402");
  assert.equal(room.elecCurr, 950);
});

test("normalizes unresolved reading warnings", () => {
  const room = normalizeMeterReadingRoom({
    roomId: 43,
    roomCode: "P403",
    status: "warning",
    warnings: [
      {
        id: 7,
        meter_type: "ELECTRICITY",
        type: "HIGH_USAGE",
        severity: "MEDIUM",
        message: "Mức tiêu thụ điện vượt ngưỡng cần kiểm tra.",
      },
    ],
  });

  assert.equal(room.status, "warning");
  assert.equal(room.warnings.length, 1);
  assert.equal(room.warnings[0].id, 7);
  assert.equal(room.warnings[0].meterType, "ELECTRICITY");
  assert.equal(room.warnings[0].type, "HIGH_USAGE");
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
