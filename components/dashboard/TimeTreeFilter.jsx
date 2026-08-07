"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * Generates the tree data structure from viewing customer records.
 * Groups appointments by Year → Month → Day with an "all days" option.
 *
 * @param {Array} customers - Array of customer objects with appointmentAt field.
 * @returns {Array} Tree data: [{ year, label, months: [{ month, label, days: [...] }] }]
 */
function buildTreeFromCustomers(customers) {
  const yearMap = new Map();

  for (const customer of customers) {
    if (!customer.appointmentAt) continue;
    const date = new Date(customer.appointmentAt);
    if (Number.isNaN(date.getTime())) continue;

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const monthMap = yearMap.get(year);
    if (!monthMap.has(month)) monthMap.set(month, new Set());
    monthMap.get(month).add(day);
  }

  const tree = [];
  const sortedYears = [...yearMap.keys()].sort((a, b) => b - a);

  for (const year of sortedYears) {
    const monthMap = yearMap.get(year);
    const sortedMonths = [...monthMap.keys()].sort((a, b) => b - a);
    const months = sortedMonths.map((month) => {
      const daySet = monthMap.get(month);
      const sortedDays = [...daySet].sort((a, b) => b - a);
      const days = sortedDays.map((day) => ({
        value: day,
        label: `Ngày ${String(day).padStart(2, "0")}`,
      }));
      return {
        value: month,
        label: `Tháng ${String(month).padStart(2, "0")}`,
        days,
      };
    });
    tree.push({ value: year, label: `Năm ${year}`, months });
  }

  return tree;
}

/**
 * Generates a static tree structure for demonstration purposes.
 * Used as fallback when no customer data is provided.
 *
 * @returns {Array} A static demo tree.
 */
function buildStaticDemoTree() {
  return [
    {
      value: 2026,
      label: "Năm 2026",
      months: [
        {
          value: 8,
          label: "Tháng 08",
          days: [
            { value: 7, label: "Ngày 07" },
            { value: 6, label: "Ngày 06" },
            { value: 5, label: "Ngày 05" },
          ],
        },
        {
          value: 7,
          label: "Tháng 07",
          days: [
            { value: 31, label: "Ngày 31" },
            { value: 30, label: "Ngày 30" },
          ],
        },
      ],
    },
    {
      value: 2025,
      label: "Năm 2025",
      months: [
        {
          value: 12,
          label: "Tháng 12",
          days: [
            { value: 31, label: "Ngày 31" },
            { value: 15, label: "Ngày 15" },
          ],
        },
      ],
    },
  ];
}

/**
 * TimeTreeFilter – Vertical tree-view time filter (Column 2 in the 3-column layout).
 *
 * @param {Object}   props
 * @param {Array}    [props.customers]           - Customer records to derive dates from.
 * @param {Object}   [props.treeData]            - Pre-built tree data (overrides customers).
 * @param {Object}   [props.selectedDate]        - Currently selected date { year, month, day }.
 * @param {Function} [props.onDateSelect]        - Called with { year, month, day } on selection.
 * @param {string}   [props.className]           - Additional CSS class names.
 */
export default function TimeTreeFilter({
  customers,
  treeData: treeDataProp,
  selectedDate,
  onDateSelect,
  className = "",
}) {
  /* ---------- derive tree ---------- */
  const tree = useMemo(() => {
    if (treeDataProp) return treeDataProp;
    if (customers && customers.length > 0) return buildTreeFromCustomers(customers);
    return buildStaticDemoTree();
  }, [treeDataProp, customers]);

  /* ---------- expand / collapse state ---------- */
 const [expandedYears, setExpandedYears] = useState(() => {
    if (selectedDate && selectedDate.year) return new Set([selectedDate.year]);
    return new Set();
  });

  const [expandedMonths, setExpandedMonths] = useState(() => {
    if (selectedDate && selectedDate.year && selectedDate.month !== "all") {
      return new Set([`${selectedDate.year}-${selectedDate.month}`]);
    }
    return new Set();
  });

  /* ---------- internal selected state (when uncontrolled) ---------- */
  const [internalSelected, setInternalSelected] = useState(
    () => selectedDate || null,
  );

  const selected = selectedDate || internalSelected;

  /* ---------- handlers ---------- */
  const toggleYear = useCallback((yearValue) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(yearValue)) next.delete(yearValue);
      else next.add(yearValue);
      return next;
    });
    const nextSelection = { year: yearValue, month: "all", day: "all" };
    setInternalSelected(nextSelection);
    onDateSelect?.(nextSelection);
  }, [onDateSelect]);

  const toggleMonth = useCallback((yearValue, monthValue) => {
    const key = `${yearValue}-${monthValue}`;
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    const nextSelection = { year: yearValue, month: monthValue, day: "all" };
    setInternalSelected(nextSelection);
    onDateSelect?.(nextSelection);
  }, [onDateSelect]);

  const selectDay = useCallback(
    (year, month, day) => {
      const next = { year, month, day };
      setInternalSelected(next);
      onDateSelect?.(next);
    },
    [onDateSelect],
  );



  /* ---------- helpers ---------- */
  const isYearExpanded = (yearValue) => expandedYears.has(yearValue);
  const isMonthExpanded = (yearValue, monthValue) =>
    expandedMonths.has(`${yearValue}-${monthValue}`);

  const isYearSelected = (yearValue) =>
    selected?.year === yearValue && selected?.month === "all";

  const isMonthSelected = (yearValue, monthValue) =>
    selected?.year === yearValue && selected?.month === monthValue && selected?.day === "all";

  const isDaySelected = (yearValue, monthValue, dayValue) =>
    selected?.year === yearValue &&
    selected?.month === monthValue &&
    selected?.day === dayValue;

  /* ---------- render ---------- */
  return (
    <aside
      className={`flex shrink-0 flex-col overflow-y-auto border-r border-[#E5E7EB] bg-[#F9FAFB] dark:border-white/10 dark:bg-[#0f172a]/50 w-[250px] ${className}`}
      aria-label="Bộ lọc thời gian"
    >
      {/* Header */}
      <div className="px-4 pt-4 mb-4">
        <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#6B7280] dark:text-slate-400">
          THỜI GIAN
        </span>
      </div>

      {/* Tree */}
      <nav className="flex flex-col gap-1 px-4 pb-4" role="tree" aria-label="Bộ lọc ngày tháng">
        {tree.map((yearNode) => {
          const yearExpanded = isYearExpanded(yearNode.value);

          return (
            <div key={yearNode.value} role="treeitem" aria-expanded={yearExpanded} className="flex flex-col gap-1">
              {/* ── Level 1: Year ── */}
              <button
                type="button"
                onClick={() => toggleYear(yearNode.value)}
                className={`group flex w-full items-center justify-between rounded-lg pl-2 pr-3 py-2 text-left transition-colors duration-150 ${
                  isYearSelected(yearNode.value)
                    ? "bg-[#1e40af] text-white shadow-sm dark:bg-blue-600"
                    : "hover:bg-[#F3F4F6] dark:hover:bg-white/5"
                }`}
                aria-label={`${yearExpanded ? "Thu gọn" : "Mở rộng"} ${yearNode.label}`}
              >
                <span
                  className={`text-sm leading-5 ${
                    isYearSelected(yearNode.value)
                      ? "font-semibold text-white"
                      : yearExpanded
                        ? "font-semibold text-[#111827] dark:text-white"
                        : "font-normal text-[#4B5563] dark:text-slate-300"
                  }`}
                >
                  {yearNode.label}
                </span>
                {yearExpanded ? (
                  <ChevronDown className={`h-4 w-4 shrink-0 ${isYearSelected(yearNode.value) ? "text-white" : "text-[#111827] dark:text-white"}`} />
                ) : (
                  <ChevronRight className={`h-4 w-4 shrink-0 ${isYearSelected(yearNode.value) ? "text-white" : "text-[#4B5563] dark:text-slate-400"}`} />
                )}
              </button>

              {/* ── Month list (Level 2) ── */}
              {yearExpanded && (
                <div className="flex flex-col gap-1" role="group">
                  {yearNode.months.map((monthNode) => {
                    const monthExpanded = isMonthExpanded(
                      yearNode.value,
                      monthNode.value,
                    );
                    const monthSelected = isMonthSelected(
                      yearNode.value,
                      monthNode.value,
                    );

                    return (
                      <div
                        key={monthNode.value}
                        role="treeitem"
                        aria-expanded={monthExpanded}
                        className="flex flex-col gap-1"
                      >
                        {/* Level 2: Month */}
                        <button
                          type="button"
                          onClick={() =>
                            toggleMonth(yearNode.value, monthNode.value)
                          }
                          className={`flex w-full items-center justify-between rounded-[6px] pl-[24px] pr-3 py-2 text-left transition-colors duration-150 ${
                            monthSelected
                              ? "bg-[#1e40af] text-white shadow-sm dark:bg-blue-600"
                              : "hover:bg-[#F3F4F6] dark:hover:bg-white/5"
                          }`}
                          aria-label={`${monthExpanded ? "Thu gọn" : "Mở rộng"} ${monthNode.label}`}
                        >
                          <span
                            className={`text-sm leading-5 ${
                              monthSelected
                                ? "font-medium text-white"
                                : "font-normal text-[#4B5563] dark:text-slate-300"
                            }`}
                          >
                            {monthNode.label}
                          </span>
                          {monthExpanded ? (
                            <ChevronDown
                              className={`h-4 w-4 shrink-0 ${
                                monthSelected
                                  ? "text-white"
                                  : "text-[#4B5563] dark:text-slate-400"
                              }`}
                            />
                          ) : (
                            <ChevronRight
                              className={`h-4 w-4 shrink-0 ${
                                monthSelected
                                  ? "text-white"
                                  : "text-[#4B5563] dark:text-slate-400"
                              }`}
                            />
                          )}
                        </button>

                        {/* ── Day list (Level 3) ── */}
                        {monthExpanded && (
                          <div className="flex flex-col gap-1" role="group">

                            {monthNode.days.map((dayNode) => {
                              const daySelected = isDaySelected(
                                yearNode.value,
                                monthNode.value,
                                dayNode.value,
                              );

                              return (
                                <button
                                  key={dayNode.value}
                                  type="button"
                                  role="treeitem"
                                  onClick={() =>
                                    selectDay(
                                      yearNode.value,
                                      monthNode.value,
                                      dayNode.value,
                                    )
                                  }
                                  className={`flex w-full items-center justify-between rounded-[6px] pl-[40px] pr-3 py-2 text-left text-sm leading-5 transition-colors duration-150 ${
                                    daySelected
                                      ? "bg-[#1e40af] font-medium text-white shadow-sm dark:bg-blue-600"
                                      : "font-normal text-[#6B7280] hover:bg-[#F3F4F6] dark:text-slate-400 dark:hover:bg-white/5"
                                  }`}
                                  aria-selected={daySelected}
                                >
                                  <span>{dayNode.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export { buildTreeFromCustomers, buildStaticDemoTree };
