import RoomsClient from "./RoomsClient";

export default async function RoomsPage({ searchParams }) {
  const params = await searchParams;

  return (
    <RoomsClient
      depositSuccess={params?.depositSuccess === "1"}
      requestedRoomId={params?.roomCode || params?.roomId || ""}
      requestedPropertyId={params?.propertyId || ""}
    />
  );
}
