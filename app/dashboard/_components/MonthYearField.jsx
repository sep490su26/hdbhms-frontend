const MONTHS = Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  return {
    label: `Tháng ${month}`,
    value: String(month).padStart(2, "0"),
  };
});

function periodParts(value) {
  const match = String(value || "").match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (match) return { year: match[1], month: match[2] };

  const now = new Date();
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, "0"),
  };
}

function yearOptions(selectedYear) {
  const currentYear = new Date().getFullYear();
  const years = new Set([Number(selectedYear)]);
  for (let year = currentYear + 1; year >= currentYear - 5; year -= 1) years.add(year);
  return [...years].sort((left, right) => right - left);
}

export function MonthYearField({ value, onChange, label = "Kỳ báo cáo", className = "" }) {
  const { year, month } = periodParts(value);

  const updatePeriod = (nextYear, nextMonth) => {
    onChange(`${nextYear}-${nextMonth}`);
  };

  return (
    <label
      className={`inline-flex h-10 max-w-full items-center gap-2 overflow-hidden rounded-lg border border-[#cbd5e1] bg-white px-3 ${className}`}
    >
      <span className="shrink-0 whitespace-nowrap text-xs font-black text-[#475569]">{label}</span>
      <span className="flex min-w-0 items-center gap-1">
        <select
          value={month}
          onChange={(event) => updatePeriod(year, event.target.value)}
          className="h-8 w-[5.75rem] bg-transparent text-sm font-semibold text-[#0f1d33] outline-none"
          aria-label="Chọn tháng"
        >
          {MONTHS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(event) => updatePeriod(event.target.value, month)}
          className="h-8 w-[4.75rem] bg-transparent text-sm font-semibold text-[#0f1d33] outline-none"
          aria-label="Chọn năm"
        >
          {yearOptions(year).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
