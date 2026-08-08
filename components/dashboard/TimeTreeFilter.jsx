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

/**
 * Generates the tree data structure from an array of items.
 * Groups by Year → Quarter → Month → Day with an "all" option.
 */
function buildTreeFromData(items, dateExtractor) {
  const yearMap = new Map();

  for (const item of items) {
    const rawDate = dateExtractor(item);
    if (!rawDate) continue;
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) continue;

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    const day = date.getDate();

    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const quarterMap = yearMap.get(year);
    if (!quarterMap.has(quarter)) quarterMap.set(quarter, new Map());
    const monthMap = quarterMap.get(quarter);
    if (!monthMap.has(month)) monthMap.set(month, new Set());
    monthMap.get(month).add(day);
  }

  const tree = [];
  const sortedYears = [...yearMap.keys()].sort((a, b) => b - a);

  for (const year of sortedYears) {
    const quarterMap = yearMap.get(year);
    const sortedQuarters = [...quarterMap.keys()].sort((a, b) => b - a);
    
    const quarters = sortedQuarters.map((quarter) => {
      const monthMap = quarterMap.get(quarter);
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
      
      return {
        value: quarter,
        label: `Quý ${quarter}`,
        months,
      };
    });
    
    tree.push({
      value: year,
      label: `Năm ${year}`,
      quarters,
    });
  }

  return tree;
}

function buildTreeFromCustomers(customers) {
  return buildTreeFromData(customers, c => c.appointmentAt);
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
      quarters: [
        {
          value: 3,
          label: "Quý 3",
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
      ],
    },
    {
      value: 2025,
      label: "Năm 2025",
      quarters: [
        {
          value: 4,
          label: "Quý 4",
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
  maxDepth = "day",
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

  const [expandedQuarters, setExpandedQuarters] = useState(() => {
    if (selectedDate && selectedDate.year && selectedDate.quarter && selectedDate.quarter !== "all") {
      return new Set([`${selectedDate.year}-${selectedDate.quarter}`]);
    }
    return new Set();
  });

  const [expandedMonths, setExpandedMonths] = useState(() => {
    if (selectedDate && selectedDate.year && selectedDate.quarter && selectedDate.quarter !== "all" && selectedDate.month !== "all") {
      return new Set([`${selectedDate.year}-${selectedDate.quarter}-${selectedDate.month}`]);
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
    const nextSelection = { year: yearValue, quarter: "all", month: "all", day: "all" };
    setInternalSelected(nextSelection);
    onDateSelect?.(nextSelection);
  }, [onDateSelect]);

  const toggleQuarter = useCallback((yearValue, quarterValue) => {
    const key = `${yearValue}-${quarterValue}`;
    setExpandedQuarters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    const nextSelection = { year: yearValue, quarter: quarterValue, month: "all", day: "all" };
    setInternalSelected(nextSelection);
    onDateSelect?.(nextSelection);
  }, [onDateSelect]);

  const toggleMonth = useCallback((yearValue, quarterValue, monthValue) => {
    const key = `${yearValue}-${quarterValue}-${monthValue}`;
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    const nextSelection = { year: yearValue, quarter: quarterValue, month: monthValue, day: "all" };
    setInternalSelected(nextSelection);
    onDateSelect?.(nextSelection);
  }, [onDateSelect]);

  const selectDay = useCallback(
    (year, quarter, month, day) => {
      const next = { year, quarter, month, day };
      setInternalSelected(next);
      onDateSelect?.(next);
    },
    [onDateSelect],
  );

  /* ---------- helpers ---------- */
  const isYearExpanded = (yearValue) => expandedYears.has(yearValue);
  const isQuarterExpanded = (yearValue, quarterValue) =>
    expandedQuarters.has(`${yearValue}-${quarterValue}`);
  const isMonthExpanded = (yearValue, quarterValue, monthValue) =>
    expandedMonths.has(`${yearValue}-${quarterValue}-${monthValue}`);

  const isYearSelected = (yearValue) =>
    selected?.year === yearValue && selected?.quarter === "all" && selected?.month === "all" && selected?.day === "all";

  const isQuarterSelected = (yearValue, quarterValue) =>
    selected?.year === yearValue && selected?.quarter === quarterValue && selected?.month === "all" && selected?.day === "all";

  const isMonthSelected = (yearValue, quarterValue, monthValue) =>
    selected?.year === yearValue && selected?.quarter === quarterValue && selected?.month === monthValue && selected?.day === "all";

  const isDaySelected = (yearValue, quarterValue, monthValue, dayValue) =>
    selected?.year === yearValue &&
    selected?.quarter === quarterValue &&
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

              {/* ── Quarter list (Level 2) ── */}
              {yearExpanded && (
                <div className="flex flex-col gap-1" role="group">
                  {yearNode.quarters.map((quarterNode) => {
                    const quarterExpanded = isQuarterExpanded(
                      yearNode.value,
                      quarterNode.value,
                    );
                    const quarterSelected = isQuarterSelected(
                      yearNode.value,
                      quarterNode.value,
                    );

                    return (
                      <div
                        key={quarterNode.value}
                        role="treeitem"
                        aria-expanded={quarterExpanded}
                        className="flex flex-col gap-1"
                      >
                        {/* Level 2: Quarter */}
                        <button
                          type="button"
                          onClick={() =>
                            toggleQuarter(yearNode.value, quarterNode.value)
                          }
                          className={`flex w-full items-center justify-between rounded-[6px] pl-[24px] pr-3 py-2 text-left transition-colors duration-150 ${
                            quarterSelected
                              ? "bg-[#1e40af] text-white shadow-sm dark:bg-blue-600"
                              : "hover:bg-[#F3F4F6] dark:hover:bg-white/5"
                          }`}
                          aria-label={`${quarterExpanded ? "Thu gọn" : "Mở rộng"} ${quarterNode.label}`}
                        >
                          <span
                            className={`text-sm leading-5 ${
                              quarterSelected
                                ? "font-medium text-white"
                                : quarterExpanded
                                  ? "font-semibold text-[#111827] dark:text-white"
                                  : "font-normal text-[#4B5563] dark:text-slate-300"
                            }`}
                          >
                            {quarterNode.label}
                          </span>
                          {quarterExpanded ? (
                            <ChevronDown
                              className={`h-4 w-4 shrink-0 ${
                                quarterSelected
                                  ? "text-white"
                                  : "text-[#111827] dark:text-white"
                              }`}
                            />
                          ) : (
                            <ChevronRight
                              className={`h-4 w-4 shrink-0 ${
                                quarterSelected
                                  ? "text-white"
                                  : "text-[#4B5563] dark:text-slate-400"
                              }`}
                            />
                          )}
                        </button>

                        {/* ── Month list (Level 3) ── */}
                        {quarterExpanded && (
                          <div className="flex flex-col gap-1" role="group">
                            {quarterNode.months.map((monthNode) => {
                              const monthExpanded = isMonthExpanded(
                                yearNode.value,
                                quarterNode.value,
                                monthNode.value,
                              );
                              const monthSelected = isMonthSelected(
                                yearNode.value,
                                quarterNode.value,
                                monthNode.value,
                              );

                              return (
                                <div
                                  key={monthNode.value}
                                  role="treeitem"
                                  aria-expanded={monthExpanded}
                                  className="flex flex-col gap-1"
                                >
                                  {/* Level 3: Month */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleMonth(
                                        yearNode.value,
                                        quarterNode.value,
                                        monthNode.value,
                                      )
                                    }
                                    className={`flex w-full items-center justify-between rounded-[6px] pl-[40px] pr-3 py-2 text-left transition-colors duration-150 ${
                                      monthSelected
                                        ? "bg-[#1e40af] text-white shadow-sm dark:bg-blue-600"
                                        : "hover:bg-[#F3F4F6] dark:hover:bg-white/5"
                                    }`}
                                    aria-label={`${maxDepth === "month" ? "Chọn" : (monthExpanded ? "Thu gọn" : "Mở rộng")} ${monthNode.label}`}
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
                                    {maxDepth !== "month" && (
                                      monthExpanded ? (
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
                                      )
                                    )}
                                  </button>

                                  {/* ── Day list (Level 4) ── */}
                                  {maxDepth !== "month" && monthExpanded && (
                                    <div className="flex flex-col gap-1" role="group">
                                      {monthNode.days.map((dayNode) => {
                                        const daySelected = isDaySelected(
                                          yearNode.value,
                                          quarterNode.value,
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
                                                quarterNode.value,
                                                monthNode.value,
                                                dayNode.value,
                                              )
                                            }
                                            className={`flex w-full items-center justify-between rounded-[6px] pl-[56px] pr-3 py-2 text-left text-sm leading-5 transition-colors duration-150 ${
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
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export { buildTreeFromCustomers, buildTreeFromData, buildStaticDemoTree };
