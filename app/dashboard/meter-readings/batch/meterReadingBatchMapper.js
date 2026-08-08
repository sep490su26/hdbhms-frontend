import { formatDateTime } from "../../../../lib/dateFormat.js";

const hasOwn = (value, key) =>
  Object.prototype.hasOwnProperty.call(value, key);

const readField = (room, camelCaseKey, snakeCaseKey) =>
  hasOwn(room, camelCaseKey) ? room[camelCaseKey] : room[snakeCaseKey];

const toFiniteNumber = (value, fallback) => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeWarnings = (warnings) =>
  Array.isArray(warnings)
    ? warnings.map((warning) => ({
        id: readField(warning, "id", "id") ?? readField(warning, "warningId", "warning_id") ?? null,
        meterType: readField(warning, "meterType", "meter_type") ?? "",
        type: readField(warning, "type", "type") ?? "",
        severity: readField(warning, "severity", "severity") ?? "",
        message: readField(warning, "message", "message") ?? "",
      }))
    : [];

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
  const electricityPrevious = toFiniteNumber(
    readField(room, "electricityPrevious", "electricity_previous"),
    0,
  );
  const electricityPhotoId = readField(room, "electricityPhotoId", "electricity_photo_id");

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
    elecPrev: electricityPrevious,
    elecCurr: toFiniteNumber(
      readField(room, "electricityCurrent", "electricity_current"),
      electricityPrevious,
    ),
    electricityPhotoId: electricityPhotoId ?? null,
    status: readField(room, "status", "status") || "pending",
    syncTime: formatDateTime(syncTimeValue, null),
    photos: Number(Boolean(electricityPhotoId)),
    warnings: normalizeWarnings(readField(room, "warnings", "warnings")),
  };
}
