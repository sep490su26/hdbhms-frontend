export function formatThousandVND(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(numericValue / 1000);
}
