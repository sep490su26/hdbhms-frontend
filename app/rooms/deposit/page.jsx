import { fetchPublicRoomById, normalizeApiRoom, findRoomById } from "../../../services/roomsService";
import { DepositClient } from "./DepositClient";

export default async function DepositPage({ searchParams }) {
  const params = await searchParams;
  
  // Fetch live room data from backend to ensure we have the correct numeric roomId
  const apiRoom = await fetchPublicRoomById(params?.roomId);
  
  // Normalize the live data or fallback to local representation
  const room = apiRoom ? normalizeApiRoom(apiRoom) : findRoomById(params?.roomId);

  return <DepositClient room={room} />;
}
