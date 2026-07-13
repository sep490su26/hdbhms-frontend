import assert from "node:assert/strict";
import test from "node:test";
import { dedupeBatchHistory, getHistoryRowKey } from "../lib/meterReadingHistory.mjs";

test("dedupeBatchHistory keeps one row per period and prefers active/latest batches", () => {
  const rows = dedupeBatchHistory([
    { batchId: 10, period: "2026-07", status: "CONFIRMED" },
    { batchId: 11, period: "2026-07", status: "DRAFT", isCurrent: true },
    { batch_id: 8, period: "2026-06", status: "CONFIRMED" },
    { batch_id: 9, period: "2026-06", status: "CONFIRMED" },
  ]);

  assert.deepEqual(
    rows.map((row) => [row.period, row.batchId ?? row.batch_id]),
    [
      ["2026-07", 11],
      ["2026-06", 9],
    ],
  );
  assert.equal(getHistoryRowKey(rows[0]), "2026-07-11");
  assert.equal(getHistoryRowKey({ period: "2026-07" }, 2), "2026-07-2");
});
