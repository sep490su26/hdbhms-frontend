export const DEPOSIT_BATCH_DRAFT_KEY = "hdbhms_batch_deposit_draft";
export const DEPOSIT_BATCH_DRAFT_TTL_MS = 30 * 60 * 1000;
const DEPOSIT_BATCH_DRAFT_MAX_AGE_SECONDS = Math.floor(DEPOSIT_BATCH_DRAFT_TTL_MS / 1000);

const SAFE_FORM_FIELDS = [
  "fullName",
  "phone",
  "email",
  "dob",
  "idIssueDate",
  "idIssuePlace",
  "permanentAddress",
  "expectedMoveInDate",
  "expectedLeaseSignDate",
  "paymentCycleMonths",
];

function cookieAvailable() {
  return typeof document !== "undefined";
}

function readCookie(name) {
  if (!cookieAvailable()) return "";

  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=") || "";
}

export function readDepositBatchDraft() {
  if (!cookieAvailable()) return null;

  try {
    const rawValue = readCookie(DEPOSIT_BATCH_DRAFT_KEY);
    if (!rawValue) return null;

    const draft = JSON.parse(decodeURIComponent(rawValue));
    if (!draft?.expiresAt || draft.expiresAt <= Date.now()) {
      clearDepositBatchDraft();
      return null;
    }
    return draft;
  } catch {
    clearDepositBatchDraft();
    return null;
  }
}

export function writeDepositBatchDraft({ form, rooms, roomForms }) {
  if (!cookieAvailable()) return;

  const safeForm = SAFE_FORM_FIELDS.reduce((result, fieldName) => {
    result[fieldName] = form?.[fieldName] ?? "";
    return result;
  }, {});
  const selectedRoomIds = new Set((rooms || []).map((room) => String(room.roomId)));
  const safeRoomForms = Object.fromEntries(
    Object.entries(roomForms || {})
      .filter(([roomId]) => selectedRoomIds.has(String(roomId)))
      .map(([roomId, roomForm]) => [
        roomId,
        {
          occupantCount: Number(roomForm?.occupantCount || 1),
          coOccupants: (roomForm?.coOccupants || []).map((occupant, index) => ({
            fullName: String(occupant?.fullName || ""),
            phone: String(occupant?.phone || ""),
            displayOrder: index + 1,
          })),
        },
      ]),
  );

  try {
    const draft = JSON.stringify({
      data: {
        form: safeForm,
        selectedRooms: (rooms || []).map((room) => ({
          roomId: room.roomId,
          roomCode: room.roomCode,
        })),
        roomForms: safeRoomForms,
      },
      expiresAt: Date.now() + DEPOSIT_BATCH_DRAFT_TTL_MS,
    });
    document.cookie = `${DEPOSIT_BATCH_DRAFT_KEY}=${encodeURIComponent(draft)}; Max-Age=${DEPOSIT_BATCH_DRAFT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
  } catch {
    // Draft persistence is optional when browser cookies are unavailable.
  }
}

export function clearDepositBatchDraft() {
  if (!cookieAvailable()) return;
  try {
    document.cookie = `${DEPOSIT_BATCH_DRAFT_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
  } catch {
    // Ignore browser cookie restrictions.
  }
}
