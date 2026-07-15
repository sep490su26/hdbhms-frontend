import assert from "node:assert/strict";
import test from "node:test";
import { parseSortableDate, sortByNewest } from "../lib/sortByNewest.mjs";

test("sortByNewest keeps newest created rows first", () => {
  const rows = sortByNewest([
    { id: 1, createdAt: "2026-07-14T10:00:00Z" },
    { id: 2, createdAt: "2026-07-15T08:00:00Z" },
    { id: 3, createdAt: "2026-07-13T12:00:00Z" },
  ]);

  assert.deepEqual(rows.map((row) => row.id), [2, 1, 3]);
});

test("sortByNewest parses Vietnamese date format", () => {
  const rows = sortByNewest([
    { id: "old", createdAt: "14/07/2026 08:00" },
    { id: "new", createdAt: "15/07/2026 07:30:10" },
  ]);

  assert.deepEqual(rows.map((row) => row.id), ["new", "old"]);
  assert.ok(parseSortableDate("15/07/2026") > parseSortableDate("14/07/2026"));
});

test("sortByNewest uses id as descending tie breaker", () => {
  const rows = sortByNewest([
    { id: "INV-9", createdAt: "2026-07-15T08:00:00Z" },
    { id: "INV-11", createdAt: "2026-07-15T08:00:00Z" },
    { id: "INV-10", createdAt: "2026-07-15T08:00:00Z" },
  ]);

  assert.deepEqual(rows.map((row) => row.id), ["INV-11", "INV-10", "INV-9"]);
});
