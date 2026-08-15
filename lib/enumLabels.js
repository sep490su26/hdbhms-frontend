export function enumLabel(value, labels, fallback = "Chưa xác định") {
  const key = String(value ?? "").trim().toUpperCase();
  if (!key) return fallback;
  return labels?.[key] || fallback;
}

