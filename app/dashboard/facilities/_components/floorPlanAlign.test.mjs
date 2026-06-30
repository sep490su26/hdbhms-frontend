import assert from "node:assert/strict";
import test from "node:test";

import { alignRoomItems } from "./floorPlanAlign.js";

test("alignRoomItems only changes room x/y", () => {
  const metadata = { orientation: "north", doors: [{ id: "door-1" }], windows: [] };
  const input = [{
    itemType: "ROOM",
    roomId: 1,
    label: "101",
    x: 13,
    y: 27,
    width: 100,
    height: 120,
    rotation: 90,
    metadata,
  }];

  const [room] = alignRoomItems(input);

  assert.equal(room.x, 20);
  assert.equal(room.y, 20);
  assert.equal(room.width, input[0].width);
  assert.equal(room.height, input[0].height);
  assert.equal(room.rotation, input[0].rotation);
  assert.equal(room.roomId, input[0].roomId);
  assert.equal(room.label, input[0].label);
  assert.equal(room.metadata, metadata);
});

test("alignRoomItems leaves non-room items untouched", () => {
  const corridor = { itemType: "CORRIDOR", x: 11, y: 12, width: 50, height: 300 };
  const stair = { type: "STAIR", x: 41, y: 42, width: 80, height: 80 };
  const parking = { itemType: "PARKING", x: 71, y: 72, width: 160, height: 120 };
  const laundry = { type: "LAUNDRY", x: 91, y: 92, width: 120, height: 100 };

  const result = alignRoomItems([corridor, stair, parking, laundry]);

  assert.deepEqual(result, [corridor, stair, parking, laundry]);
  assert.equal(result[0], corridor);
  assert.equal(result[1], stair);
  assert.equal(result[2], parking);
  assert.equal(result[3], laundry);
});

test("alignRoomItems groups nearby room columns", () => {
  const result = alignRoomItems([
    { itemType: "ROOM", id: 1, x: 103, y: 20, width: 100, height: 80 },
    { itemType: "ROOM", id: 2, x: 122, y: 140, width: 100, height: 80 },
    { itemType: "ROOM", id: 3, x: 135, y: 260, width: 100, height: 80 },
  ]);

  assert.equal(result[0].x, result[1].x);
  assert.equal(result[1].x, result[2].x);
});

test("alignRoomItems groups nearby room rows", () => {
  const result = alignRoomItems([
    { itemType: "ROOM", id: 1, x: 40, y: 104, width: 80, height: 60 },
    { itemType: "ROOM", id: 2, x: 220, y: 123, width: 80, height: 60 },
  ]);

  assert.equal(result[0].y, result[1].y);
});

test("alignRoomItems prevents overlap within the same column", () => {
  const result = alignRoomItems([
    { itemType: "ROOM", id: 1, x: 100, y: 100, width: 100, height: 80 },
    { itemType: "ROOM", id: 2, x: 112, y: 130, width: 100, height: 80 },
  ]);

  assert.ok(result[1].y >= result[0].y + result[0].height + 8);
});

test("alignRoomItems handles an empty list", () => {
  assert.deepEqual(alignRoomItems([]), []);
});

test("alignRoomItems returns non-room-only lists unchanged", () => {
  const items = [
    { itemType: "CORRIDOR", x: 10, y: 20, width: 50, height: 100 },
    { type: "STAIR", x: 30, y: 40, width: 80, height: 80 },
  ];

  assert.deepEqual(alignRoomItems(items), items);
});
