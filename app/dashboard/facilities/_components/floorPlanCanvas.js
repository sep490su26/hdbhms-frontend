export const FLOOR_PLAN_CANVAS_MIN_WIDTH = 1100;
export const FLOOR_PLAN_CANVAS_MIN_HEIGHT = 720;

const DEFAULT_EDGE_PADDING_X = 200;
const DEFAULT_EDGE_PADDING_Y = 100;
const DEFAULT_GRID_SIZE = 20;

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionNumber(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundUp(value, gridSize) {
  return Math.ceil(value / gridSize) * gridSize;
}

export function floorPlanCanvasSize(rooms = [], blocks = [], options = {}) {
  const items = [...rooms, ...blocks];
  const gridSize = Math.max(1, optionNumber(options.gridSize, DEFAULT_GRID_SIZE));
  const edgePaddingX = Math.max(0, optionNumber(options.edgePaddingX, DEFAULT_EDGE_PADDING_X));
  const edgePaddingY = Math.max(0, optionNumber(options.edgePaddingY, DEFAULT_EDGE_PADDING_Y));
  const minWidth = Math.max(0, optionNumber(options.minWidth, FLOOR_PLAN_CANVAS_MIN_WIDTH));
  const minHeight = Math.max(0, optionNumber(options.minHeight, FLOOR_PLAN_CANVAS_MIN_HEIGHT));

  const maxRight = items.reduce(
    (maximum, item) => Math.max(maximum, finiteNumber(item?.x) + Math.max(0, finiteNumber(item?.width))),
    0,
  );
  const maxBottom = items.reduce(
    (maximum, item) => Math.max(maximum, finiteNumber(item?.y) + Math.max(0, finiteNumber(item?.height))),
    0,
  );

  return {
    width: Math.max(minWidth, roundUp(maxRight + edgePaddingX, gridSize)),
    height: Math.max(minHeight, roundUp(maxBottom + edgePaddingY, gridSize)),
  };
}
