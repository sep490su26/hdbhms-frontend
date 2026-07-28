import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function loadAdvisorChatState() {
  const source = readFileSync(new URL("./advisorChatState.js", import.meta.url), "utf8")
    .replaceAll("export function ", "function ");

  return new Function(
    `${source}
return { historyMessages, mergeAdvisorMessages, resolveAdvisorSessionId };`,
  )();
}

test("mergeAdvisorMessages keeps local cached messages when server history is stale", () => {
  const { mergeAdvisorMessages } = loadAdvisorChatState();
  const serverHistory = [
    { role: "assistant", content: "intro" },
    { role: "user", content: "first question" },
  ];
  const cachedHistory = [
    ...serverHistory,
    { role: "assistant", content: "first answer" },
    { role: "user", content: "second question" },
  ];

  assert.deepEqual(mergeAdvisorMessages(cachedHistory, serverHistory), cachedHistory);
});

test("mergeAdvisorMessages accepts newer server history when it extends local cache", () => {
  const { mergeAdvisorMessages } = loadAdvisorChatState();
  const cachedHistory = [{ role: "assistant", content: "intro" }];
  const serverHistory = [
    ...cachedHistory,
    { role: "user", content: "question" },
    { role: "assistant", content: "answer" },
  ];

  assert.deepEqual(mergeAdvisorMessages(cachedHistory, serverHistory), serverHistory);
});

test("resolveAdvisorSessionId accepts snake_case and camelCase API payloads", () => {
  const { resolveAdvisorSessionId } = loadAdvisorChatState();
  assert.equal(resolveAdvisorSessionId({ session_id: "snake" }, "old"), "snake");
  assert.equal(resolveAdvisorSessionId({ sessionId: "camel" }, "old"), "camel");
  assert.equal(resolveAdvisorSessionId({}, "old"), "old");
});

test("historyMessages drops invalid chat rows", () => {
  const { historyMessages } = loadAdvisorChatState();
  assert.deepEqual(
    historyMessages([
      { role: "system", content: "skip" },
      { role: "user", content: "keep" },
      { role: "assistant", content: "" },
    ]),
    [{ role: "user", content: "keep" }],
  );
});
