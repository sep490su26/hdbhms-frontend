import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

function toNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : 0;
}

export async function fetchPropertyUtilitySettings(propertyId) {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/utility-settings`,
    { method: "GET" },
  );
  return response?.data ?? response;
}

export async function updatePropertyUtilitySettings(propertyId, payload) {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/utility-settings`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        electricityUnitPrice: toNonNegativeNumber(payload.electricityUnitPrice),
        electricityFreeAllowance: toNonNegativeNumber(payload.electricityFreeAllowance),
        serviceFeeUnitPrice: toNonNegativeNumber(payload.serviceFeeUnitPrice ?? 50000),
      }),
    },
  );
  return response?.data ?? response;
}
