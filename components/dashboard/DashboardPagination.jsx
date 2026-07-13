"use client";

import { useEffect } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

function buildPageItems(page, totalPages) {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  const safePage = Math.min(Math.max(1, Number(page) || 1), safeTotal);
  const pages = new Set([1, safeTotal, safePage - 1, safePage, safePage + 1]);

  return [...pages]
    .filter((item) => item >= 1 && item <= safeTotal)
    .sort((left, right) => left - right);
}

export function DashboardPagination({
  page,
  size,
  totalElements,
  totalPages,
  itemLabel = "bản ghi",
  onPageChange,
  onSizeChange,
  className = "",
}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.max(1, Number(size) || PAGE_SIZE_OPTIONS[0]);
  const safeTotalElements = Math.max(0, Number(totalElements) || 0);
  const explicitTotalPages = Math.max(0, Number(totalPages) || 0);
  const hasData = safeTotalElements > 0;
  const computedTotalPages = Math.ceil(safeTotalElements / safeSize);
  const safeTotalPages = hasData
    ? Math.max(1, explicitTotalPages, computedTotalPages)
    : explicitTotalPages;
  const displayPage = safeTotalPages
    ? Math.min(safePage, safeTotalPages)
    : safePage;
  const firstItem = hasData ? (displayPage - 1) * safeSize + 1 : 0;
  const lastItem = hasData
    ? Math.min(displayPage * safeSize, safeTotalElements)
    : 0;
  const pageItems = safeTotalPages > 0
    ? buildPageItems(displayPage, safeTotalPages)
    : [];
  const shouldShowPageNav = safeTotalPages > 1;

  const isPreviousDisabled = safeTotalPages <= 0 || displayPage <= 1;
  const isNextDisabled = safeTotalPages <= 0 || displayPage >= safeTotalPages;

  useEffect(() => {
    if (safeTotalPages > 0 && safePage > safeTotalPages) {
      onPageChange?.(safeTotalPages);
    }
  }, [onPageChange, safePage, safeTotalPages]);

  const navButtonClass =
    "h-9 rounded-xl px-2.5 text-sm font-semibold transition sm:px-3";

  const enabledNavClass =
    "text-slate-600 hover:bg-slate-100 hover:text-[#1e40af] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white";

  const disabledNavClass =
    "pointer-events-none cursor-not-allowed text-slate-300 hover:bg-transparent hover:text-slate-300 dark:text-slate-600 dark:hover:bg-transparent dark:hover:text-slate-600";

  const activePageClass =
    "h-9 min-w-9 rounded-xl border border-[#1e40af] bg-[#1e40af] px-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d4ed8] hover:text-white dark:border-[#2563eb] dark:bg-[#2563eb] dark:text-white dark:hover:bg-[#1d4ed8]";

  const normalPageClass =
    "h-9 min-w-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#1e40af] dark:border-white/10 dark:bg-[#020817] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white";

  const goToPage = (nextPage) => {
    if (safeTotalPages <= 0) return;
    const bounded = Math.min(Math.max(1, nextPage), safeTotalPages);
    if (bounded !== safePage) onPageChange?.(bounded);
  };

  return (
    <div
      className={`flex flex-col gap-3 border-t border-slate-200 bg-[#eef4ff] px-4 py-4 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 sm:px-5 lg:flex-row lg:items-center lg:justify-between ${className}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          {hasData
            ? `Hiển thị ${firstItem}-${lastItem} trong tổng số ${safeTotalElements} ${itemLabel}`
            : "Không có dữ liệu để hiển thị"}
        </span>

        <label className="inline-flex items-center gap-2">
          <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
            Số dòng
          </span>

          <select
            value={safeSize}
            onChange={(event) => onSizeChange?.(Number(event.target.value))}
            className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/20 dark:border-white/10 dark:bg-[#020817] dark:text-white"
            aria-label="Chọn số bản ghi mỗi trang"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option
                key={option}
                value={option}
                className="bg-white text-slate-900 dark:bg-[#020817] dark:text-white"
              >
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {shouldShowPageNav ? (
        <Pagination className="mx-0 w-full justify-start lg:w-auto lg:justify-end">
          <PaginationContent className="flex-wrap gap-1.5">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text="Trước"
                aria-disabled={isPreviousDisabled}
                onClick={(event) => {
                  event.preventDefault();
                  if (isPreviousDisabled) return;
                  goToPage(safePage - 1);
                }}
                className={`${navButtonClass} ${
                  isPreviousDisabled ? disabledNavClass : enabledNavClass
                }`}
              />
            </PaginationItem>

            {pageItems.map((pageNumber, index) => {
              const previous = pageItems[index - 1];

              return (
                <FragmentWithGap
                  key={pageNumber}
                  showGap={previous && pageNumber - previous > 1}
                >
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === safePage}
                      className={
                        pageNumber === safePage
                          ? activePageClass
                          : normalPageClass
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        goToPage(pageNumber);
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                </FragmentWithGap>
              );
            })}

            <PaginationItem>
              <PaginationNext
                href="#"
                text="Sau"
                aria-disabled={isNextDisabled}
                onClick={(event) => {
                  event.preventDefault();
                  if (isNextDisabled) return;
                  goToPage(safePage + 1);
                }}
                className={`${navButtonClass} ${
                  isNextDisabled ? disabledNavClass : enabledNavClass
                }`}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}

function FragmentWithGap({ showGap, children }) {
  return (
    <>
      {showGap && (
        <PaginationItem>
          <PaginationEllipsis className="text-slate-500 dark:text-slate-400" />
        </PaginationItem>
      )}
      {children}
    </>
  );
}
