import { API_BASE_URL, authenticatedFetch, parseEnvelope } from "@/services/identityAccessService";

function normalizeItems(items) {
  return Array.isArray(items) ? items : [];
}

export async function fetchAdminFloorPlan(propertyId, floorId) {
  return authenticatedFetch(
    `${API_BASE_URL}/admin/properties/${encodeURIComponent(propertyId)}/floors/${encodeURIComponent(floorId)}/floor-plan`,
  );
}

export async function saveAdminFloorPlan(propertyId, floorId, items) {
  return authenticatedFetch(
    `${API_BASE_URL}/admin/properties/${encodeURIComponent(propertyId)}/floors/${encodeURIComponent(floorId)}/floor-plan`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: normalizeItems(items) }),
    },
  );
}

export async function fetchPublicPropertyFloorPlan(propertyId) {
  const response = await fetch(
    `${API_BASE_URL}/public/properties/${encodeURIComponent(propertyId)}/floor-plan`,
    {
      method: "GET",
      cache: "no-store",
      headers: { "X-Client-Type": "web" },
    },
  );
  return parseEnvelope(response);
}
