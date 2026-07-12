"use client";

import { useEffect, useState } from "react";

function isoToDisplay(value) {
  if (!value) return "";
  const text = String(value).slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(value);
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function displayToIso(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const [, rawDay, rawMonth, rawYear] = match;
  const day = Number(rawDay);
  const month = Number(rawMonth);
  const year = Number(rawYear);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${rawYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildEvent(originalEvent, value) {
  return {
    ...originalEvent,
    target: {
      ...originalEvent.target,
      value,
    },
    currentTarget: {
      ...originalEvent.currentTarget,
      value,
    },
  };
}

export function DateInput({
  value = "",
  onChange,
  onBlur,
  placeholder = "dd/mm/yyyy",
  inputMode = "numeric",
  pattern = "\\d{1,2}/\\d{1,2}/\\d{4}",
  min,
  max,
  ...props
}) {
  const [displayValue, setDisplayValue] = useState(() => isoToDisplay(value));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayValue(isoToDisplay(value));
  }, [value]);

  function commit(event, { notifyOnInvalid = false } = {}) {
    const isoValue = displayToIso(displayValue);
    const nextValue = isoValue ?? (displayValue.trim() ? displayValue : "");

    if (isoValue) {
      if (min && isoValue < min) {
        onChange?.(buildEvent(event, isoValue));
        onBlur?.(buildEvent(event, isoValue));
        return;
      }
      if (max && isoValue > max) {
        onChange?.(buildEvent(event, isoValue));
        onBlur?.(buildEvent(event, isoValue));
        return;
      }
      onChange?.(buildEvent(event, isoValue));
    } else if (notifyOnInvalid || !displayValue.trim()) {
      onChange?.(buildEvent(event, nextValue));
    }

    onBlur?.(buildEvent(event, nextValue));
  }

  return (
    <input
      {...props}
      type="text"
      inputMode={inputMode}
      pattern={pattern}
      placeholder={placeholder}
      value={displayValue}
      onChange={(event) => {
        const nextDisplayValue = event.target.value;
        setDisplayValue(nextDisplayValue);

        const isoValue = displayToIso(nextDisplayValue);
        if (isoValue || !nextDisplayValue.trim()) {
          onChange?.(buildEvent(event, isoValue || ""));
        }
      }}
      onBlur={(event) => commit(event, { notifyOnInvalid: true })}
    />
  );
}

export default DateInput;