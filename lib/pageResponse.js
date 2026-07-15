export function readPageItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export function normalizePageResponse(payload, { page = 1, size = 10, items = readPageItems(payload) } = {}) {
  const currentPage = Number(payload?.currentPage ?? payload?.current_page ?? page);
  const pageSize = Number(payload?.pageSize ?? payload?.page_size ?? payload?.size ?? size);
  const totalElements = Number(payload?.totalElements ?? payload?.total_elements ?? items.length);
  const totalPages = Number(payload?.totalPages ?? payload?.total_pages ?? Math.max(1, Math.ceil(totalElements / Math.max(1, pageSize))));

  return {
    items,
    totalElements: Number.isFinite(totalElements) ? totalElements : items.length,
    totalPages: Number.isFinite(totalPages) ? Math.max(1, totalPages) : 1,
    page: Number.isFinite(currentPage) ? Math.max(1, currentPage) : page,
    size: Number.isFinite(pageSize) ? Math.max(1, pageSize) : size,
  };
}

export function getPaginationState({
  page = 1,
  size = 10,
  totalElements = 0,
  totalPages,
} = {}) {
  const safeSize = Math.max(1, Number(size) || 10);
  const safeTotalElements = Math.max(0, Number(totalElements) || 0);
  const calculatedTotalPages = Math.ceil(safeTotalElements / safeSize);
  const parsedTotalPages = Number(totalPages);
  const safeTotalPages =
    safeTotalElements === 0
      ? 0
      : Math.max(
          1,
          Number.isFinite(parsedTotalPages)
            ? parsedTotalPages
            : calculatedTotalPages,
        );
  const safePage =
    safeTotalPages === 0
      ? 1
      : Math.min(Math.max(1, Number(page) || 1), safeTotalPages);

  return {
    page: safePage,
    size: safeSize,
    totalElements: safeTotalElements,
    totalPages: safeTotalPages,
    firstItem:
      safeTotalElements === 0 ? 0 : (safePage - 1) * safeSize + 1,
    lastItem:
      safeTotalElements === 0
        ? 0
        : Math.min(safePage * safeSize, safeTotalElements),
  };
}

export function paginateItems(items, { page = 1, size = 10 } = {}) {
  const rows = Array.isArray(items) ? items : [];
  const pagination = getPaginationState({
    page,
    size,
    totalElements: rows.length,
  });
  const startIndex = (pagination.page - 1) * pagination.size;

  return {
    ...pagination,
    items: rows.slice(startIndex, startIndex + pagination.size),
  };
}

export async function fetchAllPageItems(
  fetchPage,
  { size = 100, maxPages = 1000 } = {},
) {
  const allItems = [];
  let page = 0;

  while (page < maxPages) {
    const response = await fetchPage({ page, size });
    const items = readPageItems(response);
    allItems.push(...items);

    const totalPages = Number(response?.totalPages ?? response?.total_pages);
    const hasKnownTotalPages = Number.isFinite(totalPages);
    const reachedLastPage = hasKnownTotalPages
      ? page + 1 >= totalPages
      : items.length < size;

    if (items.length === 0 || reachedLastPage) {
      return allItems;
    }

    page += 1;
  }

  throw new Error(`Pagination exceeded the safety limit of ${maxPages} pages.`);
}
