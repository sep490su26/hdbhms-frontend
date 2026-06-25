import { API_BASE_URL, authenticatedFetch } from "@/services/identityAccessService";

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getDashboardOverview() {
  const data = await authenticatedFetch(`${API_BASE_URL}/dashboard`, {
    method: "GET",
  });

  return {
    totalRoomCount: numberValue(data?.totalRoomCount ?? data?.total_room_count),
    totalOccupiedRoomCount: numberValue(
      data?.totalOccupiedRoomCount ?? data?.total_occupied_room_count,
    ),
    totalVacantRoomCount: numberValue(
      data?.totalVacantRoomCount ?? data?.total_vacant_room_count,
    ),
    floorEfficiencies: Array.isArray(data?.floorEfficiencies)
      ? data.floorEfficiencies.map((floor) => ({
          propertyId: floor.propertyId ?? floor.property_id ?? null,
          propertyName: floor.propertyName ?? floor.property_name ?? "",
          floorId: floor.floorId ?? floor.floor_id ?? null,
          floorName: floor.floorName ?? floor.floor_name ?? "",
          roomCount: numberValue(floor.roomCount ?? floor.room_count),
          vacantRoomCount: numberValue(
            floor.vacantRoomCount ?? floor.vacant_room_count,
          ),
        }))
      : [],
  };
}

export const roles = [
  {
    id: "owner",
    label: "Chủ trọ",
    description: "Theo dõi và quản lý toàn bộ hoạt động hệ thống.",
  },
  {
    id: "manager",
    label: "Quản lý",
    description: "Quản lý phòng, khách thuê, hợp đồng và bảo trì.",
  },
  {
    id: "accountant",
    label: "Kế toán",
    description: "Theo dõi nghiệp vụ thu chi và báo cáo tài chính.",
  },
];
