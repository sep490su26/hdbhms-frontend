const hasOwn = (value, key) =>
  Object.prototype.hasOwnProperty.call(value, key);

const readField = (room, camelCaseKey, snakeCaseKey) =>
  hasOwn(room, camelCaseKey) ? room[camelCaseKey] : room[snakeCaseKey];

const toFiniteNumber = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function calculateMeterUsage(currentValue, previousValue) {
  if (currentValue === null || currentValue === undefined || currentValue === "") {
    return null;
  }

  const current = Number(currentValue);
  const previous = Number(previousValue);
  return Number.isFinite(current) && Number.isFinite(previous)
    ? current - previous
    : null;
}

export function normalizeMeterReadingRoom(room = {}, index = 0) {
  const roomId = readField(room, "roomId", "room_id");
  const roomCode = readField(room, "roomCode", "room_code");
  const syncTimeValue = readField(room, "syncTime", "sync_time");
  const syncDate = syncTimeValue ? new Date(syncTimeValue) : null;

  return {
    key:
      roomId !== null && roomId !== undefined
        ? `room:${roomId}`
        : roomCode
          ? `code:${roomCode}`
          : `row:${index}`,
    id: String(roomCode ?? roomId ?? ""),
    roomId,
    roomName: readField(room, "roomName", "room_name") ?? "",
    elecPrev: toFiniteNumber(
      readField(room, "electricityPrevious", "electricity_previous"),
      0,
    ),
    elecCurr: toFiniteNumber(
      readField(room, "electricityCurrent", "electricity_current"),
      null,
    ),
    waterPrev: toFiniteNumber(
      readField(room, "waterPrevious", "water_previous"),
      0,
    ),
    waterCurr: toFiniteNumber(
      readField(room, "waterCurrent", "water_current"),
      null,
    ),
    status: readField(room, "status", "status") || "pending",
    syncTime:
      syncDate && Number.isFinite(syncDate.getTime())
        ? syncDate.toLocaleString()
        : null,
    photos: Math.max(
      0,
      toFiniteNumber(readField(room, "photosCount", "photos_count"), 0),
    ),
  };
}
