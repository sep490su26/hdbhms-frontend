import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

function rows(page) {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.data)) return page.data;
  return [];
}

function facilitiesOf(data) {
  if (Array.isArray(data?.facilities)) return data.facilities;
  if (Array.isArray(data?.properties)) return data.properties;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dashboardRoomsByFloor(dashboard, propertyId) {
  const facility = facilitiesOf(dashboard).find((item) => String(item.id) === String(propertyId));
  const byFloor = new Map();
  (facility?.floors ?? []).forEach((floor) => {
    byFloor.set(
      String(floor.id),
      (floor.rooms ?? []).map((room) => ({
        id: room.id ?? null,
        floorId: floor.id ?? null,
        propertyId,
        roomCode: room.roomCode ?? room.code ?? room.name ?? "",
        name: room.name ?? room.roomCode ?? room.code ?? "",
        areaM2: numberValue(room.areaM2 ?? room.area),
        listedPrice: numberValue(room.listedPrice ?? room.listed_price ?? room.price),
        maxOccupants: numberValue(room.maxOccupants),
        sortOrder: numberValue(room.sortOrder ?? room.sort_order),
        currentStatus: room.currentStatus ?? room.status ?? "VACANT",
      })),
    );
  });
  return byFloor;
}

export async function fetchFloorPlanDesignerData(propertyId) {
  const [property, floors, dashboard] = await Promise.all([
    authenticatedFetch(`${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}`),
    authenticatedFetch(`${API_BASE_URL}/floors?propertyId=${encodeURIComponent(propertyId)}`),
    authenticatedFetch(`${API_BASE_URL}/dashboard/facilities?size=500`).catch(() => null),
  ]);

  const roomsByFloor = dashboardRoomsByFloor(dashboard, propertyId);
  return {
    property,
    floors: (Array.isArray(floors) ? floors : []).map((floor) => ({
      ...floor,
      rooms: roomsByFloor.get(String(floor.id)) ?? rows(floor.rooms),
    })),
  };
}
