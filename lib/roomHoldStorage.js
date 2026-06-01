export const ROOM_HOLD_DURATION_MS = 15 * 60 * 1000;

const storageKey = "hdbhms:room-holds";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readHolds() {
  if (!canUseStorage()) return {};

  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
}

function writeHolds(holds) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(storageKey, JSON.stringify(holds));
}

export function getActiveRoomHolds(now = Date.now()) {
  const holds = readHolds();
  const activeHolds = Object.fromEntries(
    Object.entries(holds).filter(([, hold]) => Number(hold.expiresAt) > now),
  );

  if (Object.keys(activeHolds).length !== Object.keys(holds).length) {
    writeHolds(activeHolds);
  }

  return activeHolds;
}

export function getRoomHold(roomId, now = Date.now()) {
  return getActiveRoomHolds(now)[roomId] || null;
}

export function createRoomHold(roomId, details = {}) {
  const now = Date.now();
  const holds = getActiveRoomHolds(now);
  const hold = {
    id: `HOLD-${roomId}-${now}`,
    roomId,
    createdAt: now,
    expiresAt: now + ROOM_HOLD_DURATION_MS,
    ...details,
  };

  writeHolds({
    ...holds,
    [roomId]: hold,
  });

  return hold;
}

export function clearRoomHold(roomId) {
  const holds = readHolds();
  const { [roomId]: removedHold, ...remainingHolds } = holds;
  writeHolds(remainingHolds);
  return removedHold || null;
}

export function getHoldRemainingMs(hold, now = Date.now()) {
  if (!hold) return 0;
  return Math.max(0, Number(hold.expiresAt) - now);
}

export function formatHoldCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}
