import { format, isValid, parseISO } from "date-fns";

export const DATE_DISPLAY_FORMAT = "dd/MM/yyyy";
export const DATE_TIME_DISPLAY_FORMAT = "dd/MM/yyyy HH:mm:ss";
const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
const VIETNAM_TIME_ZONE_OFFSET_MS = 7 * 60 * 60 * 1000;
const ISO_DATE_TIME_WITHOUT_ZONE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?$/;
const DATE_TIME_PART_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  timeZone: VIETNAM_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function parseVietnamLocalDateTime(text) {
  const match = text.match(ISO_DATE_TIME_WITHOUT_ZONE);
  if (!match) return null;

  const [
    ,
    rawYear,
    rawMonth,
    rawDay,
    rawHour,
    rawMinute,
    rawSecond = "0",
    rawFraction = "",
  ] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  const second = Number(rawSecond);
  const millisecond = Number(rawFraction.padEnd(3, "0").slice(0, 3) || 0);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  const vietnamLocal = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond),
  );
  vietnamLocal.setUTCFullYear(year);
  const date = new Date(vietnamLocal.getTime() - VIETNAM_TIME_ZONE_OFFSET_MS);
  return isValid(date) ? date : null;
}

function formatVietnamDateTime(date) {
  const parts = DATE_TIME_PART_FORMATTER.formatToParts(date).reduce(
    (result, part) =>
      part.type === "literal" ? result : { ...result, [part.type]: part.value },
    {},
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
}

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

    const vietnamDateTime = parseVietnamLocalDateTime(text);
    if (vietnamDateTime) return vietnamDateTime;

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
  return date ? formatVietnamDateTime(date) : fallback;
}
