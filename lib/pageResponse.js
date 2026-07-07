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
