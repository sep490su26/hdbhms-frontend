import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

function toNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : 0;
}

export async function fetchPropertyUtilitySettings(propertyId) {
  return authenticatedFetch(
    `${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/utility-settings`,
    { method: "GET" },
  );
}

export async function updatePropertyUtilitySettings(propertyId, payload) {
  return authenticatedFetch(
    `${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/utility-settings`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        electricityUnitPrice: toNonNegativeNumber(payload.electricityUnitPrice),
        electricityFreeAllowance: toNonNegativeNumber(payload.electricityFreeAllowance),
        waterUnitPrice: toNonNegativeNumber(payload.waterUnitPrice),
        waterFreeAllowance: toNonNegativeNumber(payload.waterFreeAllowance),
      }),
    },
  );
}
