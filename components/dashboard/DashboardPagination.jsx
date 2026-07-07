"use client";

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
  const hasData = safeTotalElements > 0;
  const safeTotalPages = hasData ? Math.max(1, Number(totalPages) || 1) : 0;
  const firstItem = hasData ? (safePage - 1) * safeSize + 1 : 0;
  const lastItem = Math.min(safePage * safeSize, safeTotalElements);
  const pageItems = hasData ? buildPageItems(safePage, safeTotalPages) : [];
  const isPreviousDisabled = !hasData || safePage <= 1;
  const isNextDisabled = !hasData || safePage >= safeTotalPages;
  const navButtonClass =
    "h-9 rounded-xl px-2.5 text-sm font-medium transition sm:px-3";
  const enabledNavClass =
    "text-slate-600 hover:bg-slate-100 hover:text-slate-700";
  const disabledNavClass =
    "pointer-events-none cursor-not-allowed text-slate-300 hover:bg-transparent hover:text-slate-300";
  const activePageClass =
    "h-9 min-w-9 rounded-xl !border-slate-200 !bg-slate-100 px-3 text-sm font-semibold !text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:!bg-slate-200 hover:!text-slate-900";
  const normalPageClass =
    "h-9 min-w-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900";

  const goToPage = (nextPage) => {
    if (!hasData) return;
    const bounded = Math.min(Math.max(1, nextPage), safeTotalPages);
    if (bounded !== safePage) onPageChange?.(bounded);
  };

  return (
    <div className={`flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 text-sm font-medium text-slate-600 sm:px-5 lg:flex-row lg:items-center lg:justify-between ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <span className="font-semibold text-slate-600">
          {hasData
            ? `Hiển thị ${firstItem}-${lastItem} trong tổng số ${safeTotalElements} ${itemLabel}`
            : "Không có dữ liệu để hiển thị"}
        </span>
        <label className="inline-flex items-center gap-2">
          <span className="text-xs font-bold uppercase text-slate-500">Số dòng</span>
          <select
            value={safeSize}
            onChange={(event) => onSizeChange?.(Number(event.target.value))}
            className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            aria-label="Chọn số bản ghi mỗi trang"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

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
              className={`${navButtonClass} ${isPreviousDisabled ? disabledNavClass : enabledNavClass}`}
            />
          </PaginationItem>
          {pageItems.map((pageNumber, index) => {
            const previous = pageItems[index - 1];
            return (
              <FragmentWithGap key={pageNumber} showGap={previous && pageNumber - previous > 1}>
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    isActive={pageNumber === safePage}
                    className={pageNumber === safePage ? activePageClass : normalPageClass}
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
              className={`${navButtonClass} ${isNextDisabled ? disabledNavClass : enabledNavClass}`}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function FragmentWithGap({ showGap, children }) {
  return (
    <>
      {showGap && (
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
      )}
      {children}
    </>
  );
}
