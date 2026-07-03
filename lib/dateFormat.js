import { format, isValid, parseISO } from "date-fns";

export const DATE_DISPLAY_FORMAT = "dd/MM/yyyy";
export const DATE_TIME_DISPLAY_FORMAT = "dd/MM/yyyy HH:mm:ss";

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;

  if (typeof value === "number") {
    const date = new Date(value);
    return isValid(date) ? date : null;
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;

    const dateOnlyMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return isValid(date) ? date : null;
    }

    const isoDate = parseISO(text);
    if (isValid(isoDate)) return isoDate;

    const date = new Date(text);
    return isValid(date) ? date : null;
  }

  return null;
}

export function formatDate(value, fallback = "Chưa cập nhật") {
  const date = toDate(value);
  return date ? format(date, DATE_DISPLAY_FORMAT) : fallback;
}

export function formatDateTime(value, fallback = "Chưa cập nhật") {
  const date = toDate(value);
  return date ? format(date, DATE_TIME_DISPLAY_FORMAT) : fallback;
}
