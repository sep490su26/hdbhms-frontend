"use client";

import { useState } from "react";
import { Rnd } from "react-rnd";
import { ArrowLeft, Plus, Save, Layers3, Move, Maximize2 } from "lucide-react";

const GRID_SIZE = 20;

function buildInitialFloors(facility) {
  return (facility?.floors || []).map((floor) => ({
    ...floor,
    rooms: floor.rooms.map((room) => ({
      ...room,
      floorPlan: room.floorPlan || { x: 40, y: 40, w: 120, h: 160 },
    })),
  }));
}

export function FacilityFloorPlanDesigner({ facility, onClose, onSave }) {
  const [selectedFloorId, setSelectedFloorId] = useState(
    facility?.floors?.[0]?.id || null
  );

  const [floorsData, setFloorsData] = useState(() => buildInitialFloors(facility));

  const currentFloor = floorsData.find((f) => f.id === selectedFloorId);
  const handleAddFloor = () => {
    const newFloorId = `floor-${Date.now()}`;
    const newFloorName = `Tầng ${floorsData.length + 1}`; 
    
    const newFloor = {
      id: newFloorId,
      name: newFloorName,
      rooms: [], 
    };

    setFloorsData((prevFloors) => [...prevFloors, newFloor]);
    setSelectedFloorId(newFloorId); 
  };
  const handleAddRoom = () => {
    if (!selectedFloorId) return;

    const newRoomNumber = (currentFloor?.rooms?.length || 0) + 1;
    const newRoom = {
      id: `new-room-${Date.now()}`,
      name: `Phòng ${currentFloor.name.replace("Tầng ", "")}0${newRoomNumber}`,
      status: "VACANT",
      floorPlan: { x: 60, y: 60, w: 160, h: 120 }, // 8m x 6m
    };

    setFloorsData((prevFloors) =>
      prevFloors.map((floor) =>
        floor.id === selectedFloorId
          ? { ...floor, rooms: [...floor.rooms, newRoom] }
          : floor
      )
    );
  };

  const handleUpdateRoomLayout = (roomId, newLayout) => {
    setFloorsData((prevFloors) =>
      prevFloors.map((floor) =>
        floor.id === selectedFloorId
          ? {
              ...floor,
              rooms: floor.rooms.map((room) =>
                room.id === roomId
                  ? { ...room, floorPlan: { ...room.floorPlan, ...newLayout } }
                  : room
              ),
            }
          : floor
      )
    );
  };
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f8fafc]">
      <header className="flex h-16 items-center justify-between border-b border-[#e2e8f0] bg-white px-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#505f76] transition hover:bg-[#f2f4f6] hover:text-[#091426]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-[#091426]">
              Thiết kế sơ đồ tầng: {facility?.name}
            </h2>
            <p className="text-xs text-[#6b7280]">
              Kéo thả để định vị, kéo góc để thay đổi kích thước diện tích phòng.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSave(floorsData)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white transition hover:bg-[#16253a]"
          >
            <Save className="h-4 w-4" />
            Lưu sơ đồ
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r border-[#e2e8f0] bg-white p-5 flex flex-col gap-5">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#647089]">
                Chọn Tầng thiết kế
              </label>
              <button
                type="button"
                onClick={handleAddFloor}
                className="text-xs font-bold text-blue-600 transition hover:text-blue-800"
              >
                + Thêm tầng
              </button>
            </div>
            
            {floorsData.length > 0 ? (
              <div className="relative">
                <Layers3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8490a3]" />
                <select
                  value={selectedFloorId || ""}
                  onChange={(e) => setSelectedFloorId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#cbd3df] bg-white pl-9 pr-3 text-sm font-bold text-[#243047] outline-none focus:border-[#091426]"
                >
                  {floorsData.map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#cbd3df] bg-[#f8fafc] p-3 text-center text-xs text-[#8490a3]">
                Chưa có tầng nào. Hãy bấm thêm tầng.
              </div>
            )}
          </div>

          <hr className="border-[#e2e8f0]" />

          <button
            type="button"
            onClick={handleAddRoom}
            disabled={!selectedFloorId}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cbd3df] text-sm font-bold text-[#243047] transition hover:border-[#091426] hover:bg-[#f8fafc] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Thêm ô phòng mới
          </button>

          <div className="flex-1 overflow-y-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-[#647089] mb-3">
              Danh sách phòng ({currentFloor?.rooms?.length || 0})
            </p>
            <div className="grid gap-2">
              {currentFloor?.rooms?.map((room) => {
                const area = (
                  (room.floorPlan.w / GRID_SIZE) *
                  (room.floorPlan.h / GRID_SIZE)
                ).toFixed(1);
                return (
                  <div
                    key={room.id}
                    className="flex items-center justify-between rounded-xl border border-[#e2e8f0] p-3 bg-[#f8fafc]"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#091426]">{room.name}</p>
                      <p className="text-xs text-[#6b7280]">Diện tích: {area} m²</p>
                    </div>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        room.status === "OCCUPIED" ? "bg-blue-500" : "bg-emerald-500"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <main
          className="flex-1 overflow-auto bg-[#f1f5f9] p-10 relative"
          style={{
            backgroundImage: "radial-gradient(#cbd3df 1.5px, transparent 0)",
            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
          }}
        >
          {currentFloor?.rooms?.map((room) => {
            const widthInMeters = room.floorPlan.w / GRID_SIZE;
            const heightInMeters = room.floorPlan.h / GRID_SIZE;
            const area = (widthInMeters * heightInMeters).toFixed(1);

            return (
              <Rnd
                key={room.id}
                bounds="parent"
                dragGrid={[GRID_SIZE, GRID_SIZE]}  
                resizeGrid={[GRID_SIZE, GRID_SIZE]} 
                size={{ width: room.floorPlan.w, height: room.floorPlan.h }}
                position={{ x: room.floorPlan.x, y: room.floorPlan.y }}
                onDragStop={(e, d) => {
                  handleUpdateRoomLayout(room.id, { x: d.x, y: d.y });
                }}
                onResizeStop={(e, direction, ref, delta, position) => {
                  handleUpdateRoomLayout(room.id, {
                    w: parseInt(ref.style.width, 10),
                    h: parseInt(ref.style.height, 10),
                    ...position,
                  });
                }}
                className={`group flex flex-col justify-between rounded-xl border-2 p-3 shadow-sm select-none bg-white ${
                  room.status === "OCCUPIED"
                    ? "border-blue-500 hover:bg-blue-50/40"
                    : "border-emerald-500 hover:bg-emerald-50/40"
                }`}
              >
                <div className="flex items-center justify-between cursor-move text-[#8490a3] group-hover:text-[#091426]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#647089]">
                    {room.name}
                  </span>
                  <Move className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
                </div>

                <div className="text-center my-auto">
                  <p className="text-lg font-black text-[#091426]">{area} m²</p>
                  <p className="text-[10px] font-medium text-[#6b7280]">
                    {widthInMeters}m × {heightInMeters}m
                  </p>
                </div>

                <div className="flex justify-end text-[#cbd3df]">
                  <Maximize2 className="h-3 w-3 rotate-90" />
                </div>
              </Rnd>
            );
          })}

          {currentFloor?.rooms?.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm font-semibold text-[#8490a3] bg-white px-4 py-2 rounded-full shadow-sm border border-[#e2e8f0]">
                Tầng này chưa có phòng. Hãy nhấn &quot;Thêm ô phòng mới&quot; ở sidebar.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
