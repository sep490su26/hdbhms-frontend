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

export function saveRoomLayouts(rooms) {
  // TODO: Backend endpoint PATCH /api/v1/rooms/layout not yet confirmed.
  // Saving layout will silently fail until backend implements this.
  return authenticatedFetch(`${API_BASE_URL}/rooms/layout`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rooms: rooms.map((room) => ({
        room_id: room.id,
        position_x: Math.round(room.x),
        position_y: Math.round(room.y),
        type: "ROOM",
        width: Math.round(room.width ?? room.w ?? 0),
        height: Math.round(room.height ?? room.h ?? 0),
        orientation: room.orientation ?? "north",
        area_sqm: Number(room.areaSqm ?? room.areaM2 ?? room.area_m2 ?? 0),
        doors: Array.isArray(room.doors) ? room.doors : [],
        windows: Array.isArray(room.windows) ? room.windows : [],
      })),
    }),
  });
}


