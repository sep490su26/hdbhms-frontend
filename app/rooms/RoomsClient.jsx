"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Filter,
  Home,
  LayoutGrid,
  Layers3,
  Map as MapIcon,
  Maximize2,
  RotateCcw,
  Search,
  ShoppingCart,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  fetchPublicActiveProperties,
  fetchPublicRoomCatalog,
  getRoomDetailHref,
  normalizeApiRoom,
  ROOM_PLACEHOLDER_IMAGE,
} from "../../services/roomsService";
import { fetchPublicPropertyFloorPlan } from "../../services/floorPlanService";
import { readDepositBatchDraft } from "../../services/depositBatchDraftStorage";

const BUILDING_OVERVIEW_LABEL = "Sơ đồ nhà trọ";
const ALL_FLOORS_VALUE = "all";
const DEFAULT_FACILITY_ID = "default_id";

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;
}

function normalizeFacility(property, totalRooms = 0) {
  return {
    id: String(property?.id ?? DEFAULT_FACILITY_ID),
    name: property?.name ?? "Hải Đăng House",
    totalRooms,
  };
}

function normalizeRoomForBooking(apiRoom) {
  const room = normalizeApiRoom(apiRoom);

  return {
    ...room,
    facilityId: String(
      room.propertyId ?? room.buildingId ?? DEFAULT_FACILITY_ID,
    ),
    floorNumber: Number(room.floorNumber) || 0,
    roomNumber: String(room.roomCode || room.id || ""),
    imageUrl: room.image || ROOM_PLACEHOLDER_IMAGE,
  };
}

function buildFloorPlanData(facilityId, floors, rooms) {
  return {
    facilityId,
    floors: floors.map((floor) => {
      const floorName = floor.name ?? "";
      const floorRooms = rooms
        .filter((room) => room.floor === floorName)
        .sort(sortRoomsByCode);
      const { leftRooms, rightRooms } = autoLayoutRooms(floorRooms);

      return {
        id: String(floor.id ?? floorName),
        name: floorName,
        hallway: {
          left: leftRooms,
          right: rightRooms,
        },
      };
    }),
  };
}

async function fetchRoomsData(facilityId, filters) {
  await new Promise((resolve) => setTimeout(resolve, 350));

  const propertyId =
    facilityId === DEFAULT_FACILITY_ID ? undefined : facilityId;
  const [properties, catalog] = await Promise.all([
    fetchPublicActiveProperties().catch(() => []),
    fetchPublicRoomCatalog({ propertyId }),
  ]);
  const selectedFacilityId = String(
    catalog.property?.id ?? facilityId ?? DEFAULT_FACILITY_ID,
  );
  const rooms = catalog.rooms.map(normalizeRoomForBooking);
  const facilities = properties.length
    ? properties.map((property) => {
        const propertyRooms =
          property.id === catalog.property?.id
            ? rooms.length
            : Number(property.totalRooms ?? property.total_rooms ?? 0);
        return normalizeFacility(property, propertyRooms);
      })
    : [normalizeFacility(catalog.property, rooms.length)];
  const savedFloorPlan = catalog.property
    ? await fetchPublicPropertyFloorPlan(catalog.property.id).catch(() => null)
    : null;

  return {
    facilities,
    rooms,
    floorPlanData: buildFloorPlanData(
      selectedFacilityId,
      catalog.floors,
      rooms,
    ),
    catalogFloors: catalog.floors,
    property: catalog.property,
    savedFloorPlan,
    filters,
  };
}

function guestStatusCopy(status) {
  const copy = {
    draft: "Bản nháp",
    available: "Trống",
    occupied: "Đã thuê",
    soonVacant: "Sắp trống",
    onHold: "Đang đặt cọc",
    deposited: "Đã đặt cọc",
  };

  return copy[status] || "Chưa rõ";
}

function isVacantOrSoonVacant(room) {
  return room.status === "available" || room.status === "soonVacant";
}

function publicStatusClass(status) {
  if (status === "available")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "soonVacant")
    return "border-purple-200 bg-purple-50 text-purple-700";
  if (status === "onHold" || status === "deposited")
    return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "draft") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function floorPlanStatusStyle(status) {
  if (status === "draft")
    return {
      box: "border-2 border-slate-300 bg-slate-50 text-slate-600",
      dot: "bg-slate-400",
    };
  if (status === "available")
    return {
      box: "border-2 border-emerald-400 bg-emerald-50 text-emerald-800",
      dot: "bg-emerald-500",
    };
  if (status === "onHold" || status === "deposited")
    return {
      box: "border-2 border-amber-400 bg-amber-50 text-amber-800",
      dot: "bg-amber-500",
    };
  return {
    box: "border-2 border-slate-300 bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  };
}

const FLOOR_PLAN_STATUS_META = {
  DRAFT: {
    label: "Bản nháp",
    dot: "bg-slate-400",
    fill: "#f8fafc",
    stroke: "#94a3b8",
    text: "text-slate-600",
  },
  VACANT: {
    label: "Còn trống",
    dot: "bg-emerald-500",
    fill: "#ecfdf5",
    stroke: "#10b981",
    text: "text-emerald-700",
  },
  SOON_VACANT: {
    label: "Sắp trống",
    dot: "bg-purple-500",
    fill: "#faf5ff",
    stroke: "#a855f7",
    text: "text-purple-700",
  },
  HOLDING: {
    label: "Đang đặt cọc",
    dot: "bg-amber-500",
    fill: "#fffbeb",
    stroke: "#f59e0b",
    text: "text-amber-700",
  },
  OCCUPIED: {
    label: "Đã thuê",
    dot: "bg-slate-400",
    fill: "#f1f5f9",
    stroke: "#64748b",
    text: "text-slate-700",
  },
};

function getFloorPlanStatus(room) {
  const status = String(
    room?.status ??
      room?.currentStatus ??
      room?.current_status ??
      room?.publicStatus ??
      room?.public_status ??
      "",
  ).trim();
  const normalized = status.toLowerCase();

  if (!normalized || normalized === "draft") return "DRAFT";
  if (normalized === "available" || normalized === "vacant") return "VACANT";
  if (normalized === "soonvacant" || normalized === "soon_vacant")
    return "SOON_VACANT";
  if (
    normalized === "onhold" ||
    normalized === "on_hold" ||
    normalized === "holding"
  )
    return "HOLDING";
  if (
    normalized === "reserved" ||
    normalized === "deposited" ||
    normalized === "reserved_for_transfer"
  )
    return "HOLDING";
  return "OCCUPIED";
}

function getRoomCode(room) {
  return String(room.roomCode || room.id || room.name || "");
}

function getRoomSuffix(room) {
  const digits = getRoomCode(room).match(/\d+/g)?.join("") || "";
  if (!digits) return 0;
  return Number(digits.slice(-2)) || Number(digits) || 0;
}

function sortRoomsByCode(left, right) {
  const leftFloor = Number(left.floorNumber) || 0;
  const rightFloor = Number(right.floorNumber) || 0;
  const leftOrder = Number(
    left.sortOrder ?? left.displayOrder ?? left.order ?? getRoomSuffix(left),
  );
  const rightOrder = Number(
    right.sortOrder ??
      right.displayOrder ??
      right.order ??
      getRoomSuffix(right),
  );

  return (
    leftFloor - rightFloor ||
    leftOrder - rightOrder ||
    getRoomCode(left).localeCompare(getRoomCode(right), "vi")
  );
}

function autoLayoutRooms(rooms) {
  const sortedRooms = [...rooms].sort(sortRoomsByCode);
  const splitIndex = Math.min(2, Math.ceil(sortedRooms.length / 3));

  return {
    leftRooms: sortedRooms.slice(0, splitIndex).reverse(),
    rightRooms: sortedRooms.slice(splitIndex),
  };
}

function Door({ x, y, side = "left", radius = 24 }) {
  if (side === "right") {
    return (
      <g>
        <line
          x1={x}
          y1={y}
          x2={x}
          y2={y + radius}
          stroke="#cbd5e1"
          strokeWidth="2.5"
        />
        <path
          d={`M ${x} ${y + radius} A ${radius} ${radius} 0 0 0 ${x - radius} ${y}`}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="2.5"
        />
      </g>
    );
  }

  return (
    <g>
      <line
        x1={x}
        y1={y}
        x2={x}
        y2={y + radius}
        stroke="#cbd5e1"
        strokeWidth="2.5"
      />
      <path
        d={`M ${x} ${y + radius} A ${radius} ${radius} 0 0 1 ${x + radius} ${y}`}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="2.5"
      />
    </g>
  );
}

function WindowLine({ x, y, width = 52 }) {
  return (
    <line
      x1={x}
      y1={y}
      x2={x + width}
      y2={y}
      stroke="#94a3b8"
      strokeWidth="3"
      strokeLinecap="round"
    />
  );
}

function DoorHorizontal({ x, y, side = "top", radius = 24 }) {
  if (side === "top") {
    return (
      <g>
        <line
          x1={x}
          y1={y}
          x2={x + radius}
          y2={y}
          stroke="#cbd5e1"
          strokeWidth="2.5"
        />
        <path
          d={`M ${x + radius} ${y} A ${radius} ${radius} 0 0 1 ${x} ${y + radius}`}
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="2.5"
        />
      </g>
    );
  }
  return (
    <g>
      <line
        x1={x}
        y1={y}
        x2={x + radius}
        y2={y}
        stroke="#cbd5e1"
        strokeWidth="2.5"
      />
      <path
        d={`M ${x + radius} ${y} A ${radius} ${radius} 0 0 0 ${x} ${y - radius}`}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="2.5"
      />
    </g>
  );
}

function BlueprintRoomShape({ room, x, y, w, h, orientation, onSelect }) {
  const statusKey = getFloorPlanStatus(room);
  const meta =
    FLOOR_PLAN_STATUS_META[statusKey] ?? FLOOR_PLAN_STATUS_META.OCCUPIED;
  const roomCode = getRoomCode(room);

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Phòng ${roomCode}`}
      onClick={() => onSelect(room)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(room);
        }
      }}
      className="cursor-pointer transition hover:drop-shadow-md focus:outline-none"
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={meta.fill}
        stroke="#475569"
        strokeWidth="2.5"
        rx="8"
      />
      <rect
        x={x + 7}
        y={y + 7}
        width={w - 14}
        height={h - 14}
        fill="none"
        stroke={meta.stroke}
        strokeWidth="1.5"
        strokeDasharray="4 6"
        opacity="0.35"
        rx="4"
      />

      {orientation === "top" && (
        <>
          <DoorHorizontal
            x={x + w / 2 - 12}
            y={y + h}
            side="bottom"
            radius={24}
          />
          <WindowLine x={x + w / 2 - 26} y={y + 4} width={52} />
        </>
      )}

      {orientation === "bottom" && (
        <>
          <DoorHorizontal x={x + w / 2 - 12} y={y} side="top" radius={24} />
          <WindowLine x={x + w / 2 - 26} y={y + h - 4} width={52} />
        </>
      )}

      <text
        x={x + w / 2}
        y={y + h / 2 + 5}
        textAnchor="middle"
        fontSize="17"
        fontWeight="800"
        fill="#0f172a"
      >
        {roomCode}
      </text>
      <circle cx={x + w - 14} cy={y + 14} r="5.5" fill={meta.stroke} />
    </g>
  );
}

function FloorBlueprint({ rooms, onSelect }) {
  const sortedRooms = useMemo(() => [...rooms].sort(sortRoomsByCode), [rooms]);

  const splitIndex = Math.min(2, sortedRooms.length);
  const bottomRooms = sortedRooms.slice(0, splitIndex).reverse();
  const topRooms = sortedRooms.slice(splitIndex);

  if (rooms.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200/80 px-6 py-14 text-center text-sm font-semibold text-slate-500 shadow-2xs">
        Chưa có dữ liệu phòng cho tầng này.
      </div>
    );
  }

  const ROOM_W = 146;
  const ROOM_H = 110;
  const GAP = 12;
  const START_X = 40;
  const START_Y = 40;
  const HALL_HEIGHT = 64;

  const maxColumns = Math.max(topRooms.length, bottomRooms.length + 1);
  const totalContentWidth = maxColumns * ROOM_W + (maxColumns - 1) * GAP;

  const svgWidth = START_X * 2 + totalContentWidth;
  const svgHeight = START_Y * 2 + ROOM_H * 2 + HALL_HEIGHT;

  const hallTop = START_Y + ROOM_H;
  const hallLeft = START_X;

  return (
    <div className="overflow-x-auto rounded-2xl bg-slate-100/80 p-6 border border-slate-200/80">
      <div className="w-full min-w-[760px]">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="block h-auto w-full"
        >
          <defs>
            <linearGradient
              id="hallGradientHorizontal"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <filter
              id="softShadowHorizontal"
              x="-10%"
              y="-20%"
              width="120%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="6"
                stdDeviation="6"
                floodColor="#64748b"
                floodOpacity="0.12"
              />
            </filter>
          </defs>

          {/* HÀNH LANG */}
          <rect
            x={hallLeft}
            y={hallTop}
            width={totalContentWidth}
            height={HALL_HEIGHT}
            rx="16"
            fill="url(#hallGradientHorizontal)"
            stroke="#cbd5e1"
            strokeWidth="1.8"
            filter="url(#softShadowHorizontal)"
          />
          <line
            x1={hallLeft + 14}
            y1={hallTop + HALL_HEIGHT / 2}
            x2={hallLeft + totalContentWidth - 14}
            y2={hallTop + HALL_HEIGHT / 2}
            stroke="#94a3b8"
            strokeWidth="2"
            strokeDasharray="7 9"
            opacity="0.65"
          />
          <text
            x={hallLeft + totalContentWidth / 2}
            y={hallTop + HALL_HEIGHT / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
            fontWeight="800"
            fill="#64748b"
            letterSpacing="5"
          >
            HÀNH LANG
          </text>

          {/* DÃY PHÒNG TRÊN */}
          {topRooms.map((room, index) => (
            <BlueprintRoomShape
              key={getRoomCode(room)}
              room={room}
              x={START_X + index * (ROOM_W + GAP)}
              y={START_Y}
              w={ROOM_W}
              h={ROOM_H}
              orientation="top"
              onSelect={onSelect}
            />
          ))}

          {/* DÃY PHÒNG DƯỚI */}
          {bottomRooms.map((room, index) => (
            <BlueprintRoomShape
              key={getRoomCode(room)}
              room={room}
              x={START_X + index * (ROOM_W + GAP)}
              y={hallTop + HALL_HEIGHT}
              w={ROOM_W}
              h={ROOM_H}
              orientation="bottom"
              onSelect={onSelect}
            />
          ))}

          {/* CẦU THANG */}
          <g
            transform={`translate(${START_X + bottomRooms.length * (ROOM_W + GAP)}, ${hallTop + HALL_HEIGHT})`}
          >
            <rect
              width={ROOM_W}
              height={ROOM_H}
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeWidth="2"
              rx="12"
              strokeDasharray="6 6"
            />
            <text
              x={ROOM_W / 2}
              y={ROOM_H / 2 - 10}
              textAnchor="middle"
              fontSize="13"
              fontWeight="800"
              fill="#64748b"
              letterSpacing="2"
            >
              CẦU THANG
            </text>
            <path
              d={`M 40 60 L 106 60 M 40 75 L 106 75 M 40 90 L 106 90`}
              stroke="#cbd5e1"
              strokeWidth="2.5"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}

function FloorPlanLegend() {
  return (
    <div className="flex flex-wrap gap-2.5">
      {Object.entries(FLOOR_PLAN_STATUS_META).map(([key, meta]) => (
        <div
          key={key}
          className="flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 border border-slate-200/80 shadow-2xs"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </div>
      ))}
    </div>
  );
}

function getMiniRoomLabel(room) {
  const roomCode = getRoomCode(room);
  return roomCode.toUpperCase().startsWith("P") ? roomCode : `P${roomCode}`;
}

function MiniDoor({ x, y, side = "left", radius = 13 }) {
  const sweep = side === "right" ? 0 : 1;
  const arcEndX = side === "right" ? x - radius : x + radius;

  return (
    <g>
      <line
        x1={x}
        y1={y}
        x2={x}
        y2={y + radius}
        stroke="#cbd5e1"
        strokeWidth="1.5"
      />
      <path
        d={`M ${x} ${y + radius} A ${radius} ${radius} 0 0 ${sweep} ${arcEndX} ${y}`}
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="1.5"
      />
    </g>
  );
}

function MiniWindowLine({ x, y, width = 32 }) {
  return (
    <line
      x1={x}
      y1={y}
      x2={x + width}
      y2={y}
      stroke="#94a3b8"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  );
}

function MiniVerticalWindowLine({ x, y, height = 28 }) {
  return (
    <line
      x1={x}
      y1={y}
      x2={x}
      y2={y + height}
      stroke="#94a3b8"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  );
}

function MiniStair({ x, y }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {[0, 1, 2, 3, 4, 5].map((step) => {
        const sx = step * 8;
        const sy = 48 - step * 7;
        return (
          <path
            key={step}
            d={`M ${sx} ${sy} H ${sx + 8} V ${sy - 7}`}
            fill="none"
            stroke="#475569"
            strokeWidth="3"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        );
      })}
    </g>
  );
}

function MiniBlueprintRoomShape({
  room,
  x,
  y,
  w,
  h,
  orientation,
  onSelect,
  isFirstRoom,
  isLastRoom,
}) {
  const statusKey = getFloorPlanStatus(room);
  const meta =
    FLOOR_PLAN_STATUS_META[statusKey] ?? FLOOR_PLAN_STATUS_META.OCCUPIED;
  const isVertical = orientation === "vertical";

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(room);
    }
  };

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Xem phòng ${getRoomCode(room)}`}
      onClick={() => onSelect(room)}
      onKeyDown={handleKeyDown}
      className="cursor-pointer transition hover:drop-shadow-xs focus:outline-none"
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={meta.fill}
        stroke="#475569"
        strokeWidth="2"
        rx="6"
      />
      <rect
        x={x + 5}
        y={y + 5}
        width={w - 10}
        height={h - 10}
        fill="none"
        stroke={meta.stroke}
        strokeWidth="1"
        strokeDasharray="3 5"
        opacity="0.3"
      />

      {isVertical ? (
        <>
          <MiniDoor x={x + w} y={y + h - 28} side="right" radius={14} />
          {isFirstRoom && (
            <MiniWindowLine x={x + 12} y={y + 3} width={w - 24} />
          )}
          {isLastRoom && (
            <MiniVerticalWindowLine x={x + 3} y={y + h - 38} height={30} />
          )}
        </>
      ) : (
        <>
          <MiniDoor x={x} y={y + h * 0.42} side="left" radius={13} />
          <MiniVerticalWindowLine
            x={x + w - 3}
            y={y + h / 2 - 14}
            height={28}
          />
          {isFirstRoom && (
            <MiniWindowLine x={x + w / 2 - 17} y={y + 3} width={34} />
          )}
          {isLastRoom && (
            <MiniWindowLine x={x + w / 2 - 17} y={y + h - 3} width={34} />
          )}
        </>
      )}

      <text
        x={x + w / 2}
        y={y + h / 2 + 4}
        textAnchor="middle"
        fontSize={Math.max(11, Math.min(18, w * 0.18))}
        fontWeight="800"
        fill="#0f172a"
      >
        {getMiniRoomLabel(room)}
      </text>
      <circle cx={x + w - 8} cy={y + 8} r="4" fill={meta.stroke} />
    </g>
  );
}

function MiniFloorOverview({ floor, rooms, onSelectRoom, onSelectFloor }) {
  const { leftRooms, rightRooms } = useMemo(
    () => autoLayoutRooms(rooms),
    [rooms],
  );
  const RIGHT_ROOM_H = 80;
  const RIGHT_GAP = 8;
  const LEFT_GAP = 8;
  const LEFT_ROOM_W = 100;
  const LEFT_ROOM_H = 120;
  const TOTAL_LEFT_HEIGHT =
    LEFT_ROOM_H * Math.max(leftRooms.length, 2) +
    LEFT_GAP * Math.max(leftRooms.length - 1, 1);
  const RIGHT_ROOM_W = 150;
  const START_Y = 40;
  const LEFT_X = 40;
  const HALL_X = 160;
  const RIGHT_X = 230;
  const rightColumnHeight =
    rightRooms.length > 0
      ? RIGHT_ROOM_H * rightRooms.length +
        RIGHT_GAP * Math.max(0, rightRooms.length - 1)
      : 0;
  const contentHeight = Math.max(TOTAL_LEFT_HEIGHT, rightColumnHeight);
  const svgHeight = Math.max(260, START_Y + contentHeight + 84);
  const hallTop = START_Y;
  const hallBottom = START_Y + contentHeight;
  const hallHeight = hallBottom - hallTop;
  const safeFloorId = String(floor).replace(/[^a-zA-Z0-9_-]/g, "") || "floor";
  const hallGradientId = `miniHallGradient-${safeFloorId}`;
  const hallShadowId = `miniHallShadow-${safeFloorId}`;

  const availableCount = rooms.filter(isVacantOrSoonVacant).length;

  return (
    <article className="w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-md transition-all duration-300">
      <button
        type="button"
        onClick={() => onSelectFloor(floor)}
        className="mb-3 block w-full text-left transition hover:text-blue-600 focus:outline-none group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600">
            {floor}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            {availableCount}/{rooms.length} phòng trống
          </span>
        </div>
      </button>

      {rooms.length === 0 ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl bg-slate-50 border border-slate-200/60 px-3 text-center text-xs font-semibold text-slate-400">
          Chưa có dữ liệu phòng
        </div>
      ) : (
        <svg
          viewBox={`0 0 420 ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className="mx-auto block h-auto w-full rounded-xl bg-slate-50/70 p-2"
        >
          <defs>
            <linearGradient id={hallGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <filter
              id={hallShadowId}
              x="-35%"
              y="-12%"
              width="170%"
              height="124%"
            >
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="5"
                floodColor="#64748b"
                floodOpacity="0.1"
              />
            </filter>
          </defs>

          <rect
            x={HALL_X}
            y={hallTop}
            width="50"
            height={hallHeight}
            rx="12"
            fill={`url(#${hallGradientId})`}
            stroke="#cbd5e1"
            strokeWidth="1.3"
            filter={`url(#${hallShadowId})`}
          />
          <line
            x1={HALL_X + 25}
            y1={hallTop + 8}
            x2={HALL_X + 25}
            y2={hallTop + hallHeight / 2 - 34}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="5 8"
            opacity="0.72"
          />
          <line
            x1={HALL_X + 25}
            y1={hallTop + hallHeight / 2 + 34}
            x2={HALL_X + 25}
            y2={hallBottom - 8}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="5 8"
            opacity="0.72"
          />
          <text
            x={HALL_X + 25}
            y={hallTop + hallHeight / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8"
            fontWeight="800"
            fill="#64748b"
            letterSpacing="2"
            transform={`rotate(-90 ${HALL_X + 25} ${hallTop + hallHeight / 2})`}
          >
            HÀNH LANG
          </text>

          {leftRooms.map((room, index) => (
            <MiniBlueprintRoomShape
              key={getRoomCode(room)}
              room={room}
              x={LEFT_X}
              y={START_Y + index * (LEFT_ROOM_H + LEFT_GAP)}
              w={LEFT_ROOM_W}
              h={LEFT_ROOM_H}
              orientation="vertical"
              onSelect={onSelectRoom}
              isFirstRoom={index === 0}
              isLastRoom={index === leftRooms.length - 1}
            />
          ))}

          <MiniStair x={LEFT_X} y={START_Y + TOTAL_LEFT_HEIGHT + 16} />

          {rightRooms.map((room, index) => (
            <MiniBlueprintRoomShape
              key={getRoomCode(room)}
              room={room}
              x={RIGHT_X}
              y={START_Y + index * (RIGHT_ROOM_H + RIGHT_GAP)}
              w={RIGHT_ROOM_W}
              h={RIGHT_ROOM_H}
              orientation="horizontal"
              onSelect={onSelectRoom}
              isFirstRoom={index === 0}
              isLastRoom={index === rightRooms.length - 1}
            />
          ))}
        </svg>
      )}
    </article>
  );
}

function planValue(item, ...keys) {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) return item[key];
  }
  return undefined;
}

function planMetadata(item) {
  const metadata = planValue(item, "metadata", "metadata_json", "metadataJson");
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata))
    return metadata;
  if (typeof metadata === "string" && metadata.trim()) {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function floorPlanItems(floorLayout) {
  return Array.isArray(planValue(floorLayout, "items"))
    ? floorLayout.items
    : [];
}

function normalizeOpeningWall(value) {
  const wall = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["top", "right", "bottom", "left"].includes(wall) ? wall : "top";
}

function normalizeOpeningOffset(value) {
  const offset = Number(value);
  if (!Number.isFinite(offset)) return 0.5;
  return Math.min(0.96, Math.max(0.04, offset));
}

function normalizeSavedOpenings(item, metadata, key) {
  const singularKey = key === "doors" ? "door" : "window";
  const openings =
    planValue(
      metadata,
      key,
      singularKey,
      `${key}_json`,
      `${singularKey}_json`,
    ) ??
    planValue(item, key, singularKey, `${key}_json`, `${singularKey}_json`);
  const parsedOpenings =
    typeof openings === "string" && openings.trim().startsWith("[")
      ? (() => {
          try {
            return JSON.parse(openings);
          } catch {
            return openings;
          }
        })()
      : openings;
  if (Array.isArray(parsedOpenings)) {
    return parsedOpenings.map((opening, index) =>
      typeof opening === "string"
        ? {
            id: `${key}-${index}`,
            wall: normalizeOpeningWall(opening),
            offset: 0.5,
          }
        : {
            id: opening?.id ?? `${key}-${index}`,
            wall: normalizeOpeningWall(opening?.wall),
            offset: normalizeOpeningOffset(
              planValue(opening, "offset", "position", "percent"),
            ),
          },
    );
  }
  if (parsedOpenings && typeof parsedOpenings === "object") {
    return [
      {
        id: parsedOpenings.id ?? singularKey,
        wall: normalizeOpeningWall(parsedOpenings.wall),
        offset: normalizeOpeningOffset(
          planValue(parsedOpenings, "offset", "position", "percent"),
        ),
      },
    ];
  }
  if (typeof parsedOpenings === "string") {
    return [
      {
        id: singularKey,
        wall: normalizeOpeningWall(parsedOpenings),
        offset: 0.5,
      },
    ];
  }
  return [];
}

function SavedMiniDoorOpening({ opening, x, y, width, height }) {
  const wall = normalizeOpeningWall(opening.wall);
  const offset = normalizeOpeningOffset(opening.offset);
  const radius = Math.min(20, Math.max(12, Math.min(width, height) * 0.24));
  const strokeProps = { stroke: "#cbd5e1", strokeWidth: "2.2", fill: "none" };

  if (wall === "bottom") {
    const px = x + offset * width;
    const py = y + height;
    return (
      <>
        <line x1={px} y1={py} x2={px - radius} y2={py} {...strokeProps} />
        <path
          d={`M ${px - radius} ${py} A ${radius} ${radius} 0 0 1 ${px} ${py - radius}`}
          {...strokeProps}
        />
      </>
    );
  }
  if (wall === "right") {
    const px = x + width;
    const py = y + offset * height;
    return (
      <>
        <line x1={px} y1={py} x2={px} y2={py + radius} {...strokeProps} />
        <path
          d={`M ${px} ${py + radius} A ${radius} ${radius} 0 0 0 ${px - radius} ${py}`}
          {...strokeProps}
        />
      </>
    );
  }
  if (wall === "left") {
    const px = x;
    const py = y + offset * height;
    return (
      <>
        <line x1={px} y1={py} x2={px} y2={py + radius} {...strokeProps} />
        <path
          d={`M ${px} ${py + radius} A ${radius} ${radius} 0 0 1 ${px + radius} ${py}`}
          {...strokeProps}
        />
      </>
    );
  }

  const px = x + offset * width;
  const py = y;
  return (
    <>
      <line x1={px} y1={py} x2={px - radius} y2={py} {...strokeProps} />
      <path
        d={`M ${px - radius} ${py} A ${radius} ${radius} 0 0 0 ${px} ${py + radius}`}
        {...strokeProps}
      />
    </>
  );
}

function SavedMiniWindowOpening({ opening, x, y, width, height }) {
  const wall = normalizeOpeningWall(opening.wall);
  const offset = normalizeOpeningOffset(opening.offset);
  const length = Math.min(
    34,
    Math.max(20, (wall === "top" || wall === "bottom" ? width : height) * 0.32),
  );
  const strokeProps = {
    stroke: "#94a3b8",
    strokeWidth: "2.5",
    strokeLinecap: "round",
  };

  if (wall === "left" || wall === "right") {
    const px = wall === "left" ? x + 4 : x + width - 4;
    const py = y + offset * height;
    return (
      <line
        x1={px}
        y1={py - length / 2}
        x2={px}
        y2={py + length / 2}
        {...strokeProps}
      />
    );
  }

  const px = x + offset * width;
  const py = wall === "bottom" ? y + height - 4 : y + 4;
  return (
    <line
      x1={px - length / 2}
      y1={py}
      x2={px + length / 2}
      y2={py}
      {...strokeProps}
    />
  );
}

function SavedMiniFloorOverview({
  floor,
  floorLayout,
  roomsById,
  onSelectRoom,
  onSelectFloor,
}) {
  const items = floorPlanItems(floorLayout);
  const bounds = items.reduce(
    (acc, item) => {
      const x = Number(planValue(item, "positionX", "position_x", "x")) || 0;
      const y = Number(planValue(item, "positionY", "position_y", "y")) || 0;
      const width = Number(planValue(item, "width")) || 80;
      const height = Number(planValue(item, "height")) || 80;
      return {
        minX: Math.min(acc.minX, x),
        minY: Math.min(acc.minY, y),
        maxX: Math.max(acc.maxX, x + width),
        maxY: Math.max(acc.maxY, y + height),
      };
    },
    { minX: Infinity, minY: Infinity, maxX: 0, maxY: 0 },
  );
  const pad = 24;
  const viewX = Number.isFinite(bounds.minX) ? bounds.minX - pad : 0;
  const viewY = Number.isFinite(bounds.minY) ? bounds.minY - pad : 0;
  const viewW = Math.max(180, bounds.maxX - viewX + pad);
  const viewH = Math.max(242, bounds.maxY - viewY + pad);
  const viewRatio = viewW / viewH;
  const svgHeight = Math.max(260, Math.round(200 / viewRatio));

  return (
    <article className="w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-md transition-all duration-300">
      <button
        type="button"
        onClick={() => onSelectFloor(floor)}
        className="mb-3 block w-full text-left transition hover:text-blue-600 focus:outline-none group"
      >
        <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600">
          {floor}
        </span>
      </button>
      <svg
        viewBox={`${viewX} ${viewY} ${viewW} ${viewH}`}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block w-full rounded-xl bg-slate-50/70 p-2"
        style={{ height: svgHeight }}
      >
        {items.map((item, index) => {
          const itemType = String(
            planValue(item, "type", "itemType", "item_type") ?? "",
          ).toUpperCase();
          const x =
            Number(planValue(item, "positionX", "position_x", "x")) || 0;
          const y =
            Number(planValue(item, "positionY", "position_y", "y")) || 0;
          const width = Number(planValue(item, "width")) || 80;
          const height = Number(planValue(item, "height")) || 80;
          const metadata = planMetadata(item);
          const label = metadata.label ?? planValue(item, "label") ?? itemType;

          if (itemType === "ROOM") {
            const room = roomsById.get(
              String(planValue(item, "roomId", "room_id")),
            );
            const statusSource = room ?? {
              publicStatus: planValue(
                item,
                "publicStatus",
                "public_status",
                "currentStatus",
                "current_status",
              ),
            };
            const statusKey = getFloorPlanStatus(statusSource);
            if (statusKey === "DRAFT") return null;

            const meta =
              FLOOR_PLAN_STATUS_META[statusKey] ??
              FLOOR_PLAN_STATUS_META.OCCUPIED;
            const code = room
              ? getMiniRoomLabel(room)
              : (planValue(item, "roomCode", "room_code") ?? label);
            const doors = normalizeSavedOpenings(item, metadata, "doors");
            const windows = normalizeSavedOpenings(item, metadata, "windows");
            return (
              <g
                key={`${itemType}-${planValue(item, "id") ?? index}`}
                role={room ? "button" : undefined}
                tabIndex={room ? 0 : undefined}
                onClick={() => room && onSelectRoom(room)}
                className={
                  room ? "cursor-pointer transition hover:drop-shadow-xs" : ""
                }
              >
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={meta.fill}
                  stroke="#475569"
                  strokeWidth="2.2"
                  rx="6"
                />
                <rect
                  x={x + 8}
                  y={y + 8}
                  width={Math.max(0, width - 16)}
                  height={Math.max(0, height - 16)}
                  fill="none"
                  stroke={meta.stroke}
                  strokeDasharray="4 7"
                  opacity="0.28"
                  rx="4"
                />
                {doors.map((opening) => (
                  <SavedMiniDoorOpening
                    key={opening.id}
                    opening={opening}
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                  />
                ))}
                {windows.map((opening) => (
                  <SavedMiniWindowOpening
                    key={opening.id}
                    opening={opening}
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                  />
                ))}
                <text
                  x={x + width / 2}
                  y={y + height / 2 + 4}
                  textAnchor="middle"
                  fontSize={Math.max(11, Math.min(18, width * 0.18))}
                  fontWeight="800"
                  fill="#0f172a"
                >
                  {code}
                </text>
                <circle
                  cx={x + width - 8}
                  cy={y + 8}
                  r="4"
                  fill={meta.stroke}
                />
              </g>
            );
          }

          const isCorridor = itemType === "CORRIDOR";
          const blockFill =
            itemType === "PARKING"
              ? "#ecfdf5"
              : itemType === "LAUNDRY"
                ? "#eff6ff"
                : "#f8fafc";
          const blockStroke =
            itemType === "PARKING" || itemType === "LAUNDRY"
              ? "#60a5fa"
              : "#cbd5e1";
          return (
            <g key={`${itemType}-${planValue(item, "id") ?? index}`}>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={isCorridor ? Math.min(14, width / 2, height / 2) : 8}
                fill={blockFill}
                stroke={blockStroke}
                strokeWidth="1.6"
                strokeDasharray={
                  itemType === "PARKING" || itemType === "LAUNDRY"
                    ? "5 5"
                    : undefined
                }
              />
              <text
                x={x + width / 2}
                y={y + height / 2 + 4}
                textAnchor="middle"
                fontSize={Math.min(11, Math.max(8, width / 8))}
                fontWeight="800"
                fill="#64748b"
                transform={
                  isCorridor || metadata.orientation === "north"
                    ? `rotate(-90 ${x + width / 2} ${y + height / 2})`
                    : undefined
                }
              >
                {String(label).toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </article>
  );
}

function BuildingOverview({
  floors,
  allRooms,
  onSelectFloor,
  onSelectRoom,
  savedFloorPlan,
}) {
  const roomsByFloor = useMemo(() => {
    const grouped = new Map();
    for (const floor of floors) grouped.set(floor, []);
    for (const room of allRooms) {
      const key = room.floor;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(room);
    }
    return grouped;
  }, [allRooms, floors]);
  const roomsById = useMemo(
    () => new Map(allRooms.map((room) => [String(room.roomId), room])),
    [allRooms],
  );
  const savedLayoutByFloor = useMemo(() => {
    const layouts = Array.isArray(savedFloorPlan?.floors)
      ? savedFloorPlan.floors
      : [];
    return new Map(
      layouts.map((floor) => [
        planValue(floor, "floorName", "floor_name"),
        floor,
      ]),
    );
  }, [savedFloorPlan]);

  if (floors.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200/80 px-6 py-16 text-center text-sm font-semibold text-slate-500 shadow-2xs">
        Chưa có dữ liệu tầng.
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-slate-100/70 p-4 border border-slate-200/80">
      <div className="mx-auto grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {floors.map((floor) => {
          const floorLayout = savedLayoutByFloor.get(floor);
          const savedItems = floorPlanItems(floorLayout);
          return savedItems.length ? (
            <SavedMiniFloorOverview
              key={floor}
              floor={floor}
              floorLayout={floorLayout}
              roomsById={roomsById}
              onSelectRoom={onSelectRoom}
              onSelectFloor={onSelectFloor}
            />
          ) : (
            <MiniFloorOverview
              key={floor}
              floor={floor}
              rooms={[...(roomsByFloor.get(floor) || [])].sort(sortRoomsByCode)}
              onSelectRoom={onSelectRoom}
              onSelectFloor={onSelectFloor}
            />
          );
        })}
      </div>
    </div>
  );
}

function FloorPlanPanel({
  floors,
  selectedFloor,
  rooms,
  allRooms,
  onSelectFloor,
  onSelectRoom,
  savedFloorPlan,
}) {
  const isOverview =
    selectedFloor === ALL_FLOORS_VALUE ||
    selectedFloor === BUILDING_OVERVIEW_LABEL;
  const title = isOverview ? BUILDING_OVERVIEW_LABEL : selectedFloor;

  return (
    <div className="space-y-6 rounded-3xl bg-white border border-slate-200/80 p-5 text-slate-900 shadow-2xs md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Sơ đồ tổng quan
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-900 md:text-3xl">
            {title}
          </h2>
        </div>
        <FloorPlanLegend />
      </div>

      {isOverview ? (
        <BuildingOverview
          floors={floors}
          allRooms={allRooms}
          onSelectFloor={onSelectFloor}
          onSelectRoom={onSelectRoom}
          savedFloorPlan={savedFloorPlan}
        />
      ) : (
        <div className="overflow-x-auto">
          <FloorBlueprint rooms={rooms} onSelect={onSelectRoom} />
        </div>
      )}
    </div>
  );
}

function RoomListingCard({
  room,
  isSelected,
  onSelect,
  multiSelect,
  onToggleBatch,
  priority = false,
}) {
  const selectable = room.status === "available";
  const formattedPrice = room.price
    ? formatMoney(room.price)
    : room.priceLabel || "Liên hệ";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (multiSelect && selectable) {
          onToggleBatch(room);
        } else {
          onSelect(room);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (multiSelect && selectable) {
            onToggleBatch(room);
          } else {
            onSelect(room);
          }
        }
      }}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white text-left shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer ${
        isSelected
          ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10"
          : "border-slate-200/80 hover:border-slate-300"
      }`}
    >
      <div>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
          <Image
            src={room.image}
            alt={`Ảnh phòng ${room.id}`}
            fill
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 380px"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-80" />

          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shadow-2xs backdrop-blur-md bg-white/90">
            <span
              className={`h-2 w-2 rounded-full ${
                room.status === "available"
                  ? "bg-emerald-500"
                  : room.status === "soonVacant"
                    ? "bg-purple-500"
                    : room.status === "onHold" || room.status === "deposited"
                      ? "bg-amber-500"
                      : "bg-slate-400"
              }`}
            />
            <span className="text-slate-800 font-semibold">
              {guestStatusCopy(room.status)}
            </span>
          </div>

          {multiSelect && (
            <div
              className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-xl border text-xs font-extrabold shadow-2xs transition ${
                isSelected
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : selectable
                    ? "border-slate-300 bg-white/90 text-slate-400 hover:border-emerald-500 hover:text-emerald-500"
                    : "border-slate-200 bg-slate-100/90 text-slate-300 cursor-not-allowed"
              }`}
            >
              {isSelected ? "✓" : ""}
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {room.floor}
              </span>
              <h3 className="mt-0.5 text-xl font-bold text-slate-900 group-hover:text-[#091426] transition-colors">
                Phòng {room.id}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-base font-extrabold text-emerald-600">
                {formattedPrice}
              </span>
              {room.price ? (
                <span className="block text-[11px] font-medium text-slate-400">
                  / tháng
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
            <span className="rounded-lg bg-slate-100 border border-slate-200/60 px-2.5 py-1">
              {room.area}m²
            </span>
            <span className="rounded-lg bg-slate-100 border border-slate-200/60 px-2.5 py-1">
              {room.feature}
            </span>
            {room.maxPeople ? (
              <span className="rounded-lg bg-slate-100 border border-slate-200/60 px-2.5 py-1">
                Tối đa {room.maxPeople} người
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 pt-1 border-t border-slate-100 mt-2 flex items-center justify-between text-xs font-bold text-slate-600 group-hover:text-[#091426] transition-colors">
        <span>
          {multiSelect
            ? selectable
              ? isSelected
                ? "Bỏ chọn phòng"
                : "Chọn phòng này"
              : "Phòng không có sẵn"
            : "Xem chi tiết phòng"}
        </span>
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </div>
  );
}

function RoomDetail({ room, onClose }) {
  const [activeImage, setActiveImage] = useState(
    room.images?.[0] ?? room.image ?? ROOM_PLACEHOLDER_IMAGE,
  );
  const galleryImages = room.images?.length
    ? room.images
    : [room.image || ROOM_PLACEHOLDER_IMAGE];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-2xl">
      <div className="relative h-56 shrink-0 overflow-hidden bg-slate-100">
        <Image
          src={activeImage || ROOM_PLACEHOLDER_IMAGE}
          alt={`Ảnh phòng ${room.id}`}
          fill
          sizes="(max-width: 1024px) 100vw, 420px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chi tiết phòng"
          className="absolute right-4 top-4 rounded-full bg-white/80 p-2.5 text-slate-800 backdrop-blur transition hover:bg-white"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Phòng {room.id}</h2>
            <p className="mt-1 text-xs font-medium text-white/80">
              {room.floor} · {room.area}m² · {room.maxPeople} người
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-white">
              {room.priceLabel}
            </p>
          </div>
        </div>
      </div>

      <div
        className={`border-b px-5 py-3 ${
          room.status === "available"
            ? "border-emerald-200 bg-emerald-50"
            : "border-slate-200 bg-slate-100"
        }`}
      >
        <span
          className={`inline-flex items-center gap-2 text-sm font-bold ${
            room.status === "available" ? "text-emerald-700" : "text-slate-700"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              room.status === "available" ? "bg-emerald-500" : "bg-slate-400"
            }`}
          />
          {room.status === "available"
            ? "Còn trống - sẵn sàng vào ở"
            : "Đã thuê - không còn trống"}
        </span>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto bg-white p-5 text-slate-900">
        <div className="mb-5 grid grid-cols-4 gap-2">
          {galleryImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveImage(image)}
              className={`relative aspect-[4/3] overflow-hidden rounded-xl border transition ${
                activeImage === image
                  ? "border-slate-900 ring-2 ring-slate-900/10"
                  : "border-slate-200"
              }`}
              aria-label={`Xem ảnh phòng ${index + 1}`}
            >
              <Image
                src={image}
                alt={`Ảnh ${index + 1} phòng ${room.id}`}
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>

        <p className="text-sm leading-6 text-slate-500">{room.description}</p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 p-4 text-center border border-slate-200/60">
            <Maximize2 className="mx-auto mb-2 h-5 w-5 text-blue-600" />
            <p className="font-bold">{room.area}m²</p>
            <p className="text-xs text-slate-400">Diện tích</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-center border border-slate-200/60">
            <Users className="mx-auto mb-2 h-5 w-5 text-blue-600" />
            <p className="font-bold">{room.maxPeople}</p>
            <p className="text-xs text-slate-400">Tối đa</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-center border border-slate-200/60">
            <Building2 className="mx-auto mb-2 h-5 w-5 text-blue-600" />
            <p className="font-bold">T{room.floorNumber}</p>
            <p className="text-xs text-slate-400">Tầng</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Chỉ số gần nhất
            </h3>
          </div>
          <div className="mt-4 text-sm">
            <div className="rounded-lg bg-white p-3 border border-slate-200/60">
              <p className="text-xs font-semibold text-slate-400">Điện cũ</p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {room.lastMeterReading?.electric ?? "—"} kWh
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white p-4">
        <Link
          href={getRoomDetailHref(room)}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1e2746] px-4 py-3 text-center text-sm font-bold text-white shadow-md transition hover:bg-[#16253a]"
        >
          <span>Xem chi tiết phòng</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      </div>
    </div>
  );
}

function RoomsLoadingSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4"
        >
          <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-slate-100" />
          <div className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-6 w-36 animate-pulse rounded bg-slate-100" />
            <div className="flex gap-2 pt-2">
              <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BookingSidebar({
  facilities,
  selectedFacilityId,
  onFacilityChange,
  searchKeyword,
  setSearchKeyword,
  showEmptyOnly,
  setShowEmptyOnly,
  selectedFloor,
  setSelectedFloor,
  floors,
  propertyName,
}) {
  return (
    <aside className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs text-slate-900">
      <div className="mb-5 flex items-center gap-2.5 text-sm font-bold text-slate-900 border-b border-slate-100 pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <Building2 className="h-4 w-4" />
        </div>
        <span className="truncate">{propertyName || "Hệ thống nhà trọ"}</span>
      </div>

      <div className="space-y-5">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
            Cơ sở
          </span>
          <select
            value={selectedFacilityId}
            onChange={(event) => onFacilityChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
          >
            {facilities.map((facility) => (
              <option
                key={facility.id}
                value={facility.id}
                className="text-slate-900"
              >
                {facility.name} ({facility.totalRooms} phòng)
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
            Tìm phòng
          </span>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Nhập mã phòng..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </label>

        <label className="flex h-11 cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 transition hover:bg-slate-100/80">
          <span className="text-sm font-semibold text-slate-800">
            Chỉ hiện phòng trống
          </span>
          <span className="relative flex h-5 w-10 shrink-0 items-center rounded-full">
            <input
              type="checkbox"
              className="sr-only"
              checked={showEmptyOnly}
              onChange={(event) => setShowEmptyOnly(event.target.checked)}
            />
            <span
              className={`absolute inset-0 rounded-full transition-colors ${
                showEmptyOnly ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
            <span
              className={`absolute left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                showEmptyOnly ? "translate-x-5" : ""
              }`}
            />
          </span>
        </label>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 block">
            Lọc theo tầng
          </span>
          <div className="flex flex-col gap-1.5">
            {[
              { value: ALL_FLOORS_VALUE, label: "Tất cả các tầng" },
              ...floors.map((floor) => ({ value: floor, label: floor })),
            ].map((floor) => {
              const active = selectedFloor === floor.value;
              return (
                <button
                  key={floor.value}
                  type="button"
                  onClick={() => setSelectedFloor(floor.value)}
                  className={`h-10 rounded-xl px-3.5 text-left text-xs font-bold uppercase tracking-wider transition ${
                    active
                      ? "bg-[#1e2746] text-white shadow-2xs"
                      : "border border-slate-200/70 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {floor.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileFilterDrawer({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-white p-6 shadow-2xl overflow-y-auto flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <h3 className="text-lg font-bold text-slate-900">
              Bộ lọc tìm kiếm
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
        <div className="mt-6 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-[#1e2746] text-white font-bold text-sm"
          >
            Áp dụng bộ lọc
          </button>
        </div>
      </div>
    </div>
  );
}

function RoomsMainHeader({
  viewMode,
  setViewMode,
  multiSelect,
  onToggleMultiSelect,
  onOpenMobileFilter,
}) {
  return (
    <div className="mb-6 flex flex-col gap-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
            <Link href="/" className="hover:text-slate-900 transition-colors">
              Trang chủ
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="text-slate-900 font-bold">Danh sách phòng</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Tìm phòng & Đặt cọc
          </h1>
          <p className="mt-1 text-sm font-normal text-slate-500">
            Xem tình trạng phòng theo danh sách hoặc sơ đồ tầng.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenMobileFilter}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-2xs hover:bg-slate-50 lg:hidden"
        >
          <Filter className="h-4 w-4" />
          <span>Bộ lọc</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
        <button
          type="button"
          onClick={onToggleMultiSelect}
          className={`flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition whitespace-nowrap shadow-2xs ${
            multiSelect
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Layers3 className="h-4 w-4" />
          {multiSelect ? "Đang chọn nhiều phòng" : "Chọn nhiều phòng"}
        </button>

        <div className="flex h-11 rounded-xl border border-slate-200 bg-slate-200/60 p-1">
          {[
            { key: "list", label: "Danh sách", icon: LayoutGrid },
            { key: "floor_plan", label: "Sơ đồ tầng", icon: MapIcon },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setViewMode(item.key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition sm:flex-none whitespace-nowrap ${
                  viewMode === item.key
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ visibleRoomsCount, onResetFilters }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-2xs">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
        <Search className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-bold text-slate-900">
        {visibleRoomsCount === 0
          ? "Chưa có dữ liệu phòng"
          : "Không tìm thấy phòng phù hợp"}
      </h3>
      <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
        {visibleRoomsCount === 0
          ? "Hiện chưa có phòng nào được cập nhật cho cơ sở này."
          : "Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các điều kiện lọc."}
      </p>
      {visibleRoomsCount > 0 && (
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-5 inline-flex items-center gap-2 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 text-sm transition"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Xóa bộ lọc</span>
        </button>
      )}
    </div>
  );
}

function RoomsListView({
  rooms,
  visibleRoomsCount,
  selectedRooms,
  openRoom,
  multiSelect,
  toggleBatchRoom,
  onResetFilters,
}) {
  if (rooms.length === 0) {
    return (
      <EmptyState
        visibleRoomsCount={visibleRoomsCount}
        onResetFilters={onResetFilters}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {rooms.map((room, index) => (
        <RoomListingCard
          key={room.id}
          room={room}
          priority={index === 0}
          isSelected={selectedRooms.some((item) => item.roomId === room.roomId)}
          onSelect={openRoom}
          multiSelect={multiSelect}
          onToggleBatch={toggleBatchRoom}
        />
      ))}
    </div>
  );
}

export default function RoomsClient({
  depositSuccess = false,
  mobileDeposit = false,
  requestedRoomId = "",
  requestedPropertyId = "",
}) {
  const router = useRouter();
  const initialFacilityId = requestedPropertyId || DEFAULT_FACILITY_ID;
  const [selectedFacilityId, setSelectedFacilityId] =
    useState(initialFacilityId);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [showEmptyOnly, setShowEmptyOnly] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(ALL_FLOORS_VALUE);
  const [viewMode, setViewMode] = useState("list");
  const [isLoading, setIsLoading] = useState(true);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const restoredMobileDepositRef = useRef(false);

  const [facilities, setFacilities] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [catalogFloors, setCatalogFloors] = useState([]);
  const [floorPlanData, setFloorPlanData] = useState({
    facilityId: initialFacilityId,
    floors: [],
  });
  const [publicFloorPlan, setPublicFloorPlan] = useState(null);
  const [property, setProperty] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  const filters = useMemo(
    () => ({
      searchKeyword,
      showEmptyOnly,
      selectedFloor,
      viewMode,
    }),
    [searchKeyword, selectedFloor, showEmptyOnly, viewMode],
  );

  const loadRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const data = await fetchRoomsData(selectedFacilityId, filters);
      setFacilities(data.facilities);
      setRooms(data.rooms);
      setCatalogFloors(data.catalogFloors);
      setFloorPlanData(data.floorPlanData);
      setPublicFloorPlan(data.savedFloorPlan);
      setProperty(data.property);
      setSelectedFloor((current) =>
        current === ALL_FLOORS_VALUE ||
        data.catalogFloors.some((floor) => floor.name === current)
          ? current
          : ALL_FLOORS_VALUE,
      );
      setIsSuccess(true);
    } catch {
      setIsError(true);
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  }, [filters, selectedFacilityId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    if (!mobileDeposit || rooms.length === 0 || restoredMobileDepositRef.current) return undefined;
    restoredMobileDepositRef.current = true;

    const timer = window.setTimeout(() => {
      const draftRooms = readDepositBatchDraft()?.data?.selectedRooms || [];
      let savedRooms = [];
      try {
        savedRooms = JSON.parse(
          window.sessionStorage.getItem("hdbhms_batch_selected_rooms") || "[]",
        );
      } catch {
        savedRooms = [];
      }

      const selectedIds = new Set(
        [...draftRooms, ...savedRooms]
          .map((room) => String(room?.roomId ?? ""))
          .filter(Boolean),
      );

      if (selectedIds.size === 0) {
        setMultiSelect(true);
        setViewMode("list");
        return;
      }

      const restoredRooms = rooms.filter((room) =>
        selectedIds.has(String(room.roomId)),
      );
      setSelectedRooms(restoredRooms);
      setMultiSelect(true);
      setViewMode("list");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [mobileDeposit, rooms]);

  const floorsForPlan = useMemo(
    () => catalogFloors.map((floor) => floor.name).filter(Boolean),
    [catalogFloors],
  );

  const filteredRooms = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return rooms.filter((room) => {
      if (selectedFloor !== ALL_FLOORS_VALUE && room.floor !== selectedFloor)
        return false;
      if (showEmptyOnly && !isVacantOrSoonVacant(room)) return false;
      if (keyword) {
        const searchable = [room.id, room.roomCode, room.roomNumber, room.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(keyword)) return false;
      }
      return true;
    });
  }, [rooms, searchKeyword, selectedFloor, showEmptyOnly]);

  const currentFloorRooms = useMemo(
    () =>
      selectedFloor === ALL_FLOORS_VALUE
        ? rooms
        : rooms.filter((room) => room.floor === selectedFloor),
    [rooms, selectedFloor],
  );

  const selectedFacility = useMemo(
    () =>
      facilities.find((facility) => facility.id === selectedFacilityId) ??
      facilities[0] ??
      null,
    [facilities, selectedFacilityId],
  );

  const openRoom = (room) => {
    router.push(getRoomDetailHref(room));
  };

  const toggleBatchRoom = (room) => {
    if (room.status !== "available") return;
    setSelectedRooms((current) =>
      current.some((item) => item.roomId === room.roomId)
        ? current.filter((item) => item.roomId !== room.roomId)
        : [...current, room],
    );
  };

  const startBatchDeposit = () => {
    if (selectedRooms.length < 2) return;
    const roomIds = selectedRooms.map((room) => room.roomId).join(",");
    window.sessionStorage.setItem(
      "hdbhms_batch_selected_rooms",
      JSON.stringify(
        selectedRooms.map((room) => ({
          roomId: room.roomId,
          roomCode: room.roomCode,
        })),
      ),
    );
    router.push(`/rooms/deposit-batch?roomIds=${encodeURIComponent(roomIds)}`);
  };

  const handleFacilityChange = (facilityId) => {
    setSelectedFacilityId(facilityId);
    setSearchKeyword("");
    setShowEmptyOnly(false);
    setSelectedFloor(ALL_FLOORS_VALUE);
    setSelectedRooms([]);
  };

  const resetFilters = () => {
    setSearchKeyword("");
    setShowEmptyOnly(false);
    setSelectedFloor(ALL_FLOORS_VALUE);
  };

  const sidebarContent = (
    <BookingSidebar
      facilities={
        facilities.length
          ? facilities
          : [
              normalizeFacility(
                property ?? {
                  id: selectedFacilityId,
                  name: "Đang tải cơ sở",
                },
                rooms.length,
              ),
            ]
      }
      selectedFacilityId={selectedFacility?.id ?? selectedFacilityId}
      onFacilityChange={handleFacilityChange}
      searchKeyword={searchKeyword}
      setSearchKeyword={setSearchKeyword}
      showEmptyOnly={showEmptyOnly}
      setShowEmptyOnly={setShowEmptyOnly}
      selectedFloor={selectedFloor}
      setSelectedFloor={setSelectedFloor}
      floors={floorPlanData.floors.map((floor) => floor.name).filter(Boolean)}
      propertyName={property?.name}
    />
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 text-slate-900 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">
      {isError && (
        <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center shadow-2xs">
          <p className="text-sm font-semibold text-rose-800">
            Không tải được dữ liệu phòng
          </p>
          <button
            type="button"
            onClick={loadRooms}
            className="mt-4 h-10 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white shadow-2xs transition hover:bg-rose-700"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="mx-auto grid w-full max-w-[1440px] gap-8 lg:grid-cols-12 items-start">
        <div className="hidden lg:block lg:col-span-3 xl:col-span-3 sticky top-24">
          {sidebarContent}
        </div>

        <main className="lg:col-span-9 xl:col-span-9">
          <RoomsMainHeader
            viewMode={viewMode}
            setViewMode={setViewMode}
            multiSelect={multiSelect}
            onToggleMultiSelect={() => {
              setMultiSelect((current) => !current);
              setViewMode("list");
              setShowEmptyOnly(true);
            }}
            onOpenMobileFilter={() => setIsMobileFilterOpen(true)}
          />

          {depositSuccess && (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800 shadow-2xs">
              Yêu cầu đặt phòng {requestedRoomId || ""} đã được gửi thành công.
              Chủ trọ sẽ kiểm tra và phản hồi theo thông tin liên hệ đã cung
              cấp.
            </div>
          )}

          {isLoading ? (
            <RoomsLoadingSkeleton />
          ) : isSuccess && viewMode === "list" ? (
            <RoomsListView
              rooms={filteredRooms}
              visibleRoomsCount={rooms.length}
              selectedRooms={selectedRooms}
              openRoom={openRoom}
              multiSelect={multiSelect}
              toggleBatchRoom={toggleBatchRoom}
              onResetFilters={resetFilters}
            />
          ) : isSuccess ? (
            <FloorPlanPanel
              floors={floorsForPlan}
              selectedFloor={selectedFloor}
              rooms={currentFloorRooms}
              allRooms={rooms}
              savedFloorPlan={publicFloorPlan}
              onSelectFloor={setSelectedFloor}
              onSelectRoom={openRoom}
            />
          ) : null}
        </main>
      </div>

      <MobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
      >
        {sidebarContent}
      </MobileFilterDrawer>

      {multiSelect && (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md sm:bottom-6 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ShoppingCart className="h-4 w-4 text-emerald-600" />
              {selectedRooms.length} phòng đã chọn
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">
              {selectedRooms.length
                ? selectedRooms.map((room) => room.roomCode).join(", ")
                : "Chọn ít nhất 2 phòng đang trống"}
            </p>
            <p className="mt-1 text-xs font-bold text-emerald-700">
              Tổng tiền cọc:{" "}
              {(selectedRooms.length * 2000).toLocaleString("vi-VN")} VNĐ
            </p>
          </div>
          <div className="mt-3 flex gap-2 sm:mt-0">
            <button
              type="button"
              onClick={() => setSelectedRooms([])}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Xóa chọn
            </button>
            <button
              type="button"
              disabled={selectedRooms.length < 2}
              onClick={startBatchDeposit}
              className="h-10 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Đặt cọc các phòng đã chọn
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
