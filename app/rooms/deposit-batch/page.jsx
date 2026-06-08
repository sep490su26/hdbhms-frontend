import { fetchPublicRoomCatalog, normalizeApiRoom } from "../../../services/roomsService";
import { BatchDepositClient } from "./BatchDepositClient";

export default async function BatchDepositPage({ searchParams }) {
  const params = await searchParams;
  const requestedIds = String(params?.roomIds || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const catalog = await fetchPublicRoomCatalog();
  const requestedIdSet = new Set(requestedIds);
  const rooms = catalog.rooms
    .map((room) => normalizeApiRoom(room))
    .filter((room) => requestedIdSet.has(String(room.roomId)));

  return <BatchDepositClient initialRooms={rooms} />;
}
