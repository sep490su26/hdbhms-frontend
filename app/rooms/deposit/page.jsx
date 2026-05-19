import { findRoomById } from "../../../services/roomsService";
import { DepositClient } from "./DepositClient";

export default async function DepositPage({ searchParams }) {
  const params = await searchParams;
  const room = findRoomById(params?.roomId);

  return <DepositClient room={room} />;
}
