export const DEFAULT_NEWEST_KEYS = [
  "createdAt",
  "created_at",
  "createdDate",
  "created_date",
  "accountCreatedAt",
  "account_created_at",
  "deletedAt",
  "deleted_at",
  "issuedAt",
  "issued_at",
  "issueDate",
  "issue_date",
  "transactionTime",
  "transaction_time",
  "grantedAt",
  "granted_at",
  "signedAt",
  "signed_at",
  "startDate",
  "start_date",
  "date",
  "period",
];

export const DEFAULT_TIE_KEYS = [
  "id",
  "batchId",
  "batch_id",
  "transactionId",
  "transaction_id",
  "invoiceId",
  "invoice_id",
  "contractId",
  "contract_id",
  "leaseContractId",
  "lease_contract_id",
  "depositAgreementId",
  "deposit_agreement_id",
  "profileId",
  "profile_id",
  "userId",
  "user_id",
  "roomId",
  "room_id",
];

function numericSuffix(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const text = String(value).trim();
  if (!text) return 0;

  const direct = Number(text);
  if (Number.isFinite(direct)) return direct;

  const matches = text.match(/\d+/g);
  if (!matches?.length) return 0;
  return Number(matches.at(-1)) || 0;
}

export function parseSortableDate(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const text = String(value).trim();
  if (!text) return 0;

  const vietnameseDate = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[\s,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (vietnameseDate) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] = vietnameseDate;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
    const timestamp = date.getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  const yearMonth = text.match(/^(\d{4})-(\d{1,2})$/);
  if (yearMonth) {
    const [, year, month] = yearMonth;
    const date = new Date(Number(year), Number(month) - 1, 1);
    const timestamp = date.getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function getNewestTimestamp(item, keys = DEFAULT_NEWEST_KEYS) {
  for (const key of keys) {
    const timestamp = parseSortableDate(item?.[key]);
    if (timestamp > 0) return timestamp;
  }
  return 0;
}

export function compareByNewest(
  left,
  right,
  keys = DEFAULT_NEWEST_KEYS,
  tieKeys = DEFAULT_TIE_KEYS,
) {
  const dateDiff = getNewestTimestamp(right, keys) - getNewestTimestamp(left, keys);
  if (dateDiff !== 0) return dateDiff;

  for (const key of tieKeys) {
    const tieDiff = numericSuffix(right?.[key]) - numericSuffix(left?.[key]);
    if (tieDiff !== 0) return tieDiff;
  }

  return 0;
}

export function sortByNewest(
  items,
  keys = DEFAULT_NEWEST_KEYS,
  tieKeys = DEFAULT_TIE_KEYS,
) {
  return [...(Array.isArray(items) ? items : [])]
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const newestDiff = compareByNewest(left.item, right.item, keys, tieKeys);
      return newestDiff || left.index - right.index;
    })
    .map(({ item }) => item);
}
