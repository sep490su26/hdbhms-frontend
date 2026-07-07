import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

function rows(page) {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.data)) return page.data;
  return [];
}

export async function fetchFloorPlanDesignerData(propertyId) {
  const [property, floors, roomPage] = await Promise.all([
    authenticatedFetch(`${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}`),
    authenticatedFetch(`${API_BASE_URL}/floors?propertyId=${encodeURIComponent(propertyId)}`),
    authenticatedFetch(`${API_BASE_URL}/rooms?propertyId=${encodeURIComponent(propertyId)}&size=500`),
  ]);

  const rooms = rows(roomPage);
  return {
    property,
    floors: (Array.isArray(floors) ? floors : []).map((floor) => ({
      ...floor,
      rooms: rooms.filter((room) =>
        String(room.floorId ?? room.floor_id ?? room.floor?.id) === String(floor.id),
      ),
    })),
  };
}
