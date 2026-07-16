import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./RulesClient.jsx", import.meta.url), "utf8");

test("rules error state lets the visitor retry the selected property", () => {
  assert.match(source, /status === "error"/);
  assert.match(source, /onClick=\{\(\) => loadRules\(selectedPropertyId\)\}/);
  assert.match(source, /Tải lại/);
});
