import { fetchPublicRoomCatalog, normalizeApiRoom } from "../../../services/roomsService";
import { BatchDepositClient } from "./BatchDepositClient";

export default async function BatchDepositPage({ searchParams }) {
  const params = await searchParams;
  const requestedIds = String(params?.roomIds || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  let catalog = { rooms: [] };
  let loadError = "";
  try {
    catalog = await fetchPublicRoomCatalog();
  } catch {
    loadError = "Không thể tải danh sách phòng. Vui lòng kiểm tra kết nối máy chủ và thử lại.";
  }
  const requestedIdSet = new Set(requestedIds);
  const rooms = (catalog.rooms ?? [])
    .map((room) => normalizeApiRoom(room))
    .filter((room) => requestedIdSet.has(String(room.roomId)));

  return <BatchDepositClient key={requestedIds.join(",")} initialRooms={rooms} initialError={loadError} />;
}
