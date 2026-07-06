import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";
import { normalizePageResponse, readPageItems } from "@/lib/pageResponse";

function normalizeNotification(item = {}) {
  return {
    id: item.id ?? null,
    title: item.title ?? "",
    body: item.body ?? "",
    eventType: item.eventType ?? item.event_type ?? "",
    targetType: item.targetType ?? item.target_type ?? "",
    targetId: item.targetId ?? item.target_id ?? null,
    data: item.data ?? {},
    createdAt: item.createdAt ?? item.created_at ?? null,
    isRead: item.isRead ?? item.read ?? item.is_read ?? false,
  };
}

export async function fetchNotifications({ page = 0, size = 6 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc",
  });
  const data = await authenticatedFetch(
    `${API_BASE_URL}/notifications?${params.toString()}`,
    { method: "GET" },
  );
  const items = readPageItems(data).map(normalizeNotification);
  return {
    ...normalizePageResponse(data, { page: page + 1, size, items }),
    items,
  };
}

export async function fetchUnreadNotificationCount() {
  const count = await authenticatedFetch(
    `${API_BASE_URL}/notifications/unread-count`,
    { method: "GET" },
  );
  return Number(count) || 0;
}

export async function markNotificationAsRead(id) {
  return authenticatedFetch(`${API_BASE_URL}/notifications/${id}/read`, {
    method: "POST",
  });
}

export async function markAllNotificationsAsRead() {
  return authenticatedFetch(`${API_BASE_URL}/notifications/read-all`, {
    method: "POST",
  });
}
