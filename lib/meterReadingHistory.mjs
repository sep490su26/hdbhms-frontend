function getHistoryPeriodKey(item) {
  return String(item?.period || item?.readingPeriod || item?.reading_period || "").trim();
}

function getHistoryBatchId(item) {
  const id = Number(item?.batchId ?? item?.batch_id ?? item?.id ?? 0);
  return Number.isFinite(id) ? id : 0;
}

function getHistoryRank(item) {
  const status = String(item?.status || "").toUpperCase();
  return [
    item?.isCurrent ? 4 : 0,
    status === "DRAFT" ? 3 : 0,
    status === "PREVIEWED" ? 2 : 0,
    status === "CONFIRMED" ? 1 : 0,
    getHistoryBatchId(item),
  ];
}

function shouldReplaceHistoryItem(current, next) {
  const currentRank = getHistoryRank(current);
  const nextRank = getHistoryRank(next);
  for (let i = 0; i < nextRank.length; i += 1) {
    if (nextRank[i] !== currentRank[i]) return nextRank[i] > currentRank[i];
  }
  return false;
}

export function dedupeBatchHistory(items) {
  const byPeriod = new Map();
  for (const item of items) {
    const period = getHistoryPeriodKey(item);
    if (!period) continue;
    const current = byPeriod.get(period);
    if (!current || shouldReplaceHistoryItem(current, item)) {
      byPeriod.set(period, item);
    }
  }
  return Array.from(byPeriod.values());
}

export function getHistoryRowKey(item, index = 0) {
  const period = getHistoryPeriodKey(item);
  const batchId = getHistoryBatchId(item);
  return batchId ? `${period}-${batchId}` : `${period}-${index}`;
}
