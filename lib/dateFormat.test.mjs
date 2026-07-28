import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { format, isValid, parseISO } from "date-fns";

function loadDateFormat() {
  const source = readFileSync(new URL("./dateFormat.js", import.meta.url), "utf8")
    .replace(/import\s*{[\s\S]*?}\s*from\s*"date-fns";\s*/m, "")
    .replaceAll("export const ", "const ")
    .replaceAll("export function ", "function ");

  const factory = new Function(
    "format",
    "isValid",
    "parseISO",
    `${source}
return { DATE_DISPLAY_FORMAT, DATE_TIME_DISPLAY_FORMAT, toDate, formatDate, formatDateTime };`,
  );

  return factory(format, isValid, parseISO);
}

test("toDate treats server ISO datetimes without timezone as UTC", () => {
  const { toDate } = loadDateFormat();

  assert.equal(
    toDate("2026-07-28T10:00:00")?.toISOString(),
    "2026-07-28T10:00:00.000Z",
  );
  assert.equal(
    toDate("2026-07-28 10:00:00")?.toISOString(),
    "2026-07-28T10:00:00.000Z",
  );
});

test("toDate keeps date-only values as local calendar dates", () => {
  const { toDate } = loadDateFormat();
  const date = toDate("2026-07-28");

  assert.equal(date?.getFullYear(), 2026);
  assert.equal(date?.getMonth(), 6);
  assert.equal(date?.getDate(), 28);
});
