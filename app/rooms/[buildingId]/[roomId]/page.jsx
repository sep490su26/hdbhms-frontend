import { RoomDetailPageClient } from "./RoomDetailPageClient";

export default async function RoomDetailPage({ params }) {
  const { buildingId, roomId } = await params;

  return <RoomDetailPageClient buildingId={buildingId} roomId={decodeURIComponent(roomId)} />;
}
