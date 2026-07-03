import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

function pageRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

export async function fetchManagementRoomCatalog(propertyId = null) {
  const properties = await authenticatedFetch(`${API_BASE_URL}/properties/simple`, {
    method: "GET",
  });

  if (!Array.isArray(properties) || properties.length === 0) {
    return [];
  }

  const scopedProperties = propertyId
    ? properties.filter((property) => String(property.id) === String(propertyId))
    : properties;

  const groups = await Promise.all(
    scopedProperties.map(async (property) => {
      const page = await authenticatedFetch(
        `${API_BASE_URL}/rooms?propertyId=${encodeURIComponent(property.id)}&size=500`,
        { method: "GET" },
      );
      return pageRows(page).map((room) => ({
        ...room,
        propertyId:
          room.propertyId ??
          room.property_id ??
          room.floor?.property?.id ??
          property.id,
        propertyName:
          room.propertyName ??
          room.property_name ??
          room.floor?.property?.name ??
          property.name ??
          "",
      }));
    }),
  );

  return groups.flat();
}
