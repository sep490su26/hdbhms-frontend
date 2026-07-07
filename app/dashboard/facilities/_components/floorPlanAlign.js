export const DEFAULT_ALIGN_ROOM_OPTIONS = {
  gridSize: 20,
  columnTolerance: 35,
  rowTolerance: 25,
  gap: 8,
  assumeAllRooms: false,
};

function numericValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function snapToGrid(value, gridSize) {
  if (!gridSize) return numericValue(value);
  return Math.round(numericValue(value) / gridSize) * gridSize;
}

function snapUpToGrid(value, gridSize) {
  if (!gridSize) return numericValue(value);
  return Math.ceil(numericValue(value) / gridSize) * gridSize;
}

function itemKind(item) {
  return String(item?.itemType ?? item?.item_type ?? item?.type ?? "").toUpperCase();
}

function isRoomItem(item, options) {
  return options.assumeAllRooms || itemKind(item) === "ROOM";
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function groupByNearValue(items, key, tolerance) {
  const groups = [];
  [...items]
    .sort((left, right) => left[key] - right[key])
    .forEach((item) => {
      const currentGroup = groups[groups.length - 1];
      const previous = currentGroup?.[currentGroup.length - 1];
      if (!currentGroup || Math.abs(item[key] - previous[key]) > tolerance) {
        groups.push([item]);
        return;
      }
      currentGroup.push(item);
    });
  return groups;
}

export function alignRoomItems(items, options = {}) {
  const config = { ...DEFAULT_ALIGN_ROOM_OPTIONS, ...options };
  if (!Array.isArray(items) || !items.length) return Array.isArray(items) ? [] : [];

  const roomEntries = [];
  const nextItems = items.map((item, index) => {
    if (!isRoomItem(item, config)) return item;
    const aligned = {
      ...item,
      x: snapToGrid(item.x, config.gridSize),
      y: snapToGrid(item.y, config.gridSize),
    };
    roomEntries.push({ index, item: aligned });
    return aligned;
  });

  if (!roomEntries.length) return nextItems;

  groupByNearValue(roomEntries.map((entry) => entry.item), "x", config.columnTolerance)
    .forEach((group) => {
      const targetX = Math.max(0, snapToGrid(median(group.map((item) => item.x)), config.gridSize));
      group.forEach((item) => {
        item.x = targetX;
      });
    });

  groupByNearValue(roomEntries.map((entry) => entry.item), "y", config.rowTolerance)
    .forEach((group) => {
      const targetY = Math.max(0, snapToGrid(median(group.map((item) => item.y)), config.gridSize));
      group.forEach((item) => {
        item.y = targetY;
      });
    });

  const roomsByColumn = new Map();
  roomEntries.forEach(({ item }) => {
    const key = String(item.x);
    roomsByColumn.set(key, [...(roomsByColumn.get(key) ?? []), item]);
  });

  roomsByColumn.forEach((columnRooms) => {
    columnRooms
      .sort((left, right) => left.y - right.y)
      .forEach((item, index, column) => {
        if (index === 0) {
          item.y = Math.max(0, item.y);
          return;
        }
        const previous = column[index - 1];
        const minY = previous.y + numericValue(previous.height) + config.gap;
        if (item.y < minY) item.y = snapUpToGrid(minY, config.gridSize);
        item.y = Math.max(0, item.y);
      });
  });

  return nextItems;
}
