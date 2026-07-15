import assert from "node:assert/strict";
import test from "node:test";

import {
  FLOOR_PLAN_CANVAS_MIN_HEIGHT,
  FLOOR_PLAN_CANVAS_MIN_WIDTH,
  floorPlanCanvasSize,
} from "./floorPlanCanvas.js";

test("floorPlanCanvasSize keeps an empty canvas usable", () => {
  assert.deepEqual(floorPlanCanvasSize(), {
    width: FLOOR_PLAN_CANVAS_MIN_WIDTH,
    height: FLOOR_PLAN_CANVAS_MIN_HEIGHT,
  });
});

test("floorPlanCanvasSize expands past the farthest room and block", () => {
  const size = floorPlanCanvasSize(
    [{ x: 1400, y: 200, width: 200, height: 100 }],
    [{ x: 300, y: 900, width: 80, height: 120 }],
  );

  assert.equal(size.width, 1800);
  assert.equal(size.height, 1120);
});

test("floorPlanCanvasSize rounds custom bounds to the design grid", () => {
  const size = floorPlanCanvasSize(
    [{ x: 101, y: 103, width: 100, height: 80 }],
    [],
    { minWidth: 0, minHeight: 0, edgePaddingX: 10, edgePaddingY: 10, gridSize: 20 },
  );

  assert.deepEqual(size, { width: 220, height: 200 });
});
