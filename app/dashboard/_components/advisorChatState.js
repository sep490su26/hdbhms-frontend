export function historyMessages(history) {
  return (Array.isArray(history) ? history : [])
    .filter((item) => (item?.role === "user" || item?.role === "assistant") && item?.content)
    .map((item) => ({ role: item.role, content: item.content }));
}

function isPrefix(shorter, longer) {
  return shorter.length <= longer.length && shorter.every((item, index) => (
    item.role === longer[index]?.role && item.content === longer[index]?.content
  ));
}

export function mergeAdvisorMessages(cachedHistory, serverHistory) {
  const cachedMessages = historyMessages(cachedHistory);
  const serverMessages = historyMessages(serverHistory);

  if (!serverMessages.length) return cachedMessages;
  if (!cachedMessages.length) return serverMessages;
  if (isPrefix(serverMessages, cachedMessages)) return cachedMessages;
  if (isPrefix(cachedMessages, serverMessages)) return serverMessages;
  return cachedMessages.length >= serverMessages.length ? cachedMessages : serverMessages;
}

export function resolveAdvisorSessionId(reply = {}, fallback = "") {
  return reply?.session_id || reply?.sessionId || fallback || "";
}
