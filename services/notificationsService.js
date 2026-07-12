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

function normalizeTemplateVariable(item = {}) {
  return {
    name: item.name ?? "",
    required: item.required ?? false,
  };
}

export function normalizeNotificationTemplateDefinition(item = {}) {
  return {
    eventType: item.eventType ?? "",
    displayName: item.displayName ?? item.eventType ?? "",
    description: item.description ?? "",
    targetType: item.targetType ?? "",
    allowedChannels: item.allowedChannels ?? [],
    variables: (item.variables ?? []).map(normalizeTemplateVariable),
    sampleData: item.sampleData ?? {},
  };
}

export function normalizeNotificationTemplate(item = {}) {
  return {
    eventType: item.eventType ?? "",
    displayName: item.displayName ?? item.eventType ?? "",
    targetType: item.targetType ?? "",
    channel: item.channel ?? "",
    source: item.source ?? "DEFAULT",
    status: item.status ?? "ACTIVE",
    titleTemplate: item.titleTemplate ?? "",
    bodyTemplate: item.bodyTemplate ?? "",
    variables: (item.variables ?? []).map(normalizeTemplateVariable),
    updatedBy: item.updatedBy ?? null,
    updatedAt: item.updatedAt ?? null,
  };
}

export async function fetchNotificationTemplateDefinitions() {
  const data = await authenticatedFetch(`${API_BASE_URL}/notification-template-definitions`, {
    method: "GET",
  });
  return (Array.isArray(data) ? data : []).map(normalizeNotificationTemplateDefinition);
}

export async function fetchNotificationTemplates({ eventType } = {}) {
  const params = new URLSearchParams();
  if (eventType) params.set("eventType", eventType);

  const query = params.toString();
  const data = await authenticatedFetch(
    `${API_BASE_URL}/notification-templates${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
  return (Array.isArray(data) ? data : []).map(normalizeNotificationTemplate);
}

export async function updateNotificationTemplate({
  eventType,
  channel,
  titleTemplate,
  bodyTemplate,
  status = "ACTIVE",
}) {
  const data = await authenticatedFetch(
    `${API_BASE_URL}/notification-templates/${encodeURIComponent(eventType)}/${encodeURIComponent(channel)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titleTemplate, bodyTemplate, status }),
    },
  );
  return normalizeNotificationTemplate(data);
}

export async function resetNotificationTemplate({ eventType, channel }) {
  const data = await authenticatedFetch(
    `${API_BASE_URL}/notification-templates/${encodeURIComponent(eventType)}/${encodeURIComponent(channel)}/reset`,
    { method: "POST" },
  );
  return normalizeNotificationTemplate(data);
}

export async function previewNotificationTemplate({
  eventType,
  channel,
  titleTemplate,
  bodyTemplate,
  data,
}) {
  return authenticatedFetch(
    `${API_BASE_URL}/notification-templates/${encodeURIComponent(eventType)}/${encodeURIComponent(channel)}/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titleTemplate, bodyTemplate, data }),
    },
  );
}

function normalizeBroadcastResult(item = {}) {
  return {
    scopeType: item.scopeType ?? "",
    roles: item.roles ?? [],
    channels: item.channels ?? [],
    recipientCount: Number(item.recipientCount ?? 0),
    outboxCount: Number(item.outboxCount ?? 0),
  };
}

function broadcastPayload({
  scopeType,
  scopeIds = [],
  roles = [],
  channels = [],
  title,
  body,
}) {
  return {
    scopeType,
    scopeIds: scopeIds.map(Number).filter((item) => Number.isFinite(item) && item > 0),
    roles,
    channels,
    title,
    body,
  };
}

export async function previewNotificationBroadcastRecipients(payload) {
  const data = await authenticatedFetch(
    `${API_BASE_URL}/notification-broadcasts/preview-recipients`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(broadcastPayload(payload)),
    },
  );
  return normalizeBroadcastResult(data);
}

export async function sendNotificationBroadcast(payload) {
  const data = await authenticatedFetch(`${API_BASE_URL}/notification-broadcasts/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(broadcastPayload(payload)),
  });
  return normalizeBroadcastResult(data);
}
