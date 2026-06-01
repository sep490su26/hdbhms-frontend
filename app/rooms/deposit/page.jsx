import { fetchPublicRoomById, normalizeApiRoom } from "../../../services/roomsService";
import { DepositClient } from "./DepositClient";

export default async function DepositPage({ searchParams }) {
  const params = await searchParams;
  const roomIdentifier = params?.roomCode || params?.roomId || "";
  const apiRoom = await fetchPublicRoomById(roomIdentifier);
  const room = apiRoom ? normalizeApiRoom(apiRoom) : null;

  return <DepositClient room={room} />;
}
