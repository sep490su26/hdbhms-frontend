"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Home,
  LayoutGrid,
  Layers3,
  Map as MapIcon,
  Maximize2,
  Search,
  ShoppingCart,
  Users,
  X,
  Zap,
} from "lucide-react";
import { fetchPublicRoomCatalog, getRoomDetailHref, normalizeApiRoom, floorPlans, ROOM_PLACEHOLDER_IMAGE } from "../../services/roomsService";

const BUILDING_OVERVIEW_LABEL = "Sơ đồ nhà trọ";

const ROOM_LAYOUT_BY_CODE = new Map();
floorPlans.forEach((plan, floorIndex) => {
  [...plan.left, ...plan.right].forEach((roomCode, roomIndex) => {
    ROOM_LAYOUT_BY_CODE.set(roomCode, {
      floor: plan.floor,
      order: floorIndex * 100 + roomIndex,
      position: roomIndex < plan.left.length ? "left" : "right",
    });
  });
});

function guestStatusCopy(status) {
  const copy = {
    available: "Trống",
    occupied: "Đã thuê",
    onHold: "Đang đặt cọc",
    deposited: "Đã đặt cọc",
    soonVacant: "Sắp trống",
    maintenance: "Bảo trì",
    expired: "Hết hạn",
  };

  return copy[status] || "Đã thuê";
}

function isVacantOrSoonVacant(room) {
  return room.status === "available" || room.status === "soonVacant";
}

function publicStatusClass(status) {
  if (status === "available") return "border-emerald-400/30 bg-emerald-400/15 text-emerald-100";
  if (status === "onHold") return "border-orange-400/30 bg-orange-400/15 text-orange-100";
  if (status === "deposited") return "border-amber-300/40 bg-amber-300/20 text-amber-100";
  return "border-slate-400/20 bg-slate-900/50 text-slate-200";
}

function floorPlanStatusStyle(status) {
  if (status === "available")
    return {
      box: "border-2 border-emerald-400 bg-emerald-50/50 text-emerald-700",
      dot: "bg-emerald-400",
    };
  if (status === "onHold")
    return {
      box: "border-2 border-orange-400 bg-orange-50/50 text-orange-700",
      dot: "bg-orange-400",
    };
  if (status === "deposited")
    return {
      box: "border-2 border-amber-500 bg-amber-500/35 text-amber-700",
      dot: "bg-amber-500",
    };
  return {
    box: "border-2 border-slate-300 bg-slate-100 text-slate-400",
    dot: "bg-slate-400",
  };
}

function FloorPlanRoomBox({ room, isSelected, onSelect }) {
  const { box, dot } = floorPlanStatusStyle(room.status);
  const priceShort = room.price ? `${(room.price / 1000000).toFixed(1)}M` : "—";

  return (
    <button
      type="button"
      onClick={() => {
        onSelect(room);
      }}
      aria-label={`Phòng ${room.id}`}
      className={`relative flex w-full min-w-[92px] flex-col justify-between rounded-[14px] p-2.5 text-left transition-all ${box} hover:-translate-y-0.5 hover:shadow-md ${isSelected ? "ring-[3px] ring-blue-500 ring-offset-1 ring-offset-white shadow-[0_2px_4px_-2px_rgba(219,234,254,1),0_4px_6px_-1px_rgba(219,234,254,1)]" : ""}`}
      style={{ height: 72 }}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold leading-none">{room.id}</span>
        <span className={`h-[6px] w-[6px] shrink-0 rounded-full ${dot}`} />
      </div>
      <div className="mt-auto flex flex-col gap-0.5">
        <span className="text-[10px] font-medium leading-tight opacity-60">{room.area}m²</span>
        <span className="text-[11px] font-semibold leading-tight">{priceShort}</span>
      </div>
    </button>
  );
}

function StairBox() {
  return (
    <div
      className="flex w-full min-w-[92px] items-center justify-center rounded-[14px] border-2 border-slate-300 bg-slate-100 text-center"
      style={{ height: 72 }}
    >
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">CẦU THANG</span>
    </div>
  );
}

const FLOOR_PLAN_STATUS_META = {
  VACANT: {
    label: "Còn trống",
    dot: "bg-emerald-500",
    fill: "#ecfdf5",
    stroke: "#10b981",
    text: "text-emerald-600",
  },
  HOLDING: {
    label: "Đang đặt cọc",
    dot: "bg-amber-500",
    fill: "#fffbeb",
    stroke: "#f59e0b",
    text: "text-amber-600",
  },
  RESERVED: {
    label: "Đặt cọc",
    dot: "bg-orange-500",
    fill: "#fff7ed",
    stroke: "#f97316",
    text: "text-orange-600",
  },
  OCCUPIED: {
    label: "Đã thuê",
    dot: "bg-blue-500",
    fill: "#eff6ff",
    stroke: "#3b82f6",
    text: "text-blue-600",
  },
};

function getFloorPlanStatus(room) {
  if (room.status === "available") return "VACANT";
  if (room.status === "onHold") return "HOLDING";
  if (room.status === "deposited") return "RESERVED";
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

function resolveRoomLayout(room) {
  return ROOM_LAYOUT_BY_CODE.get(getRoomCode(room)) ?? null;
}

function sortRoomsByCode(left, right) {
  const leftLayout = resolveRoomLayout(left);
  const rightLayout = resolveRoomLayout(right);
  const leftOrder = leftLayout?.order ?? getRoomSuffix(left);
  const rightOrder = rightLayout?.order ?? getRoomSuffix(right);
  return leftOrder - rightOrder || getRoomCode(left).localeCompare(getRoomCode(right), "vi");
}

function buildFloorLayoutRooms(rooms) {
  const sortedRooms = [...rooms].sort(sortRoomsByCode);
  const floorName = rooms[0]?.floor ?? "";
  const floorPlan = floorPlans.find((plan) => plan.floor === floorName) ?? null;

  if (floorPlan) {
    const roomMap = new Map(sortedRooms.map((room) => [getRoomCode(room), room]));
    const leftRooms = floorPlan.left.map((roomCode) => roomMap.get(roomCode)).filter(Boolean);
    const rightRooms = floorPlan.right.map((roomCode) => roomMap.get(roomCode)).filter(Boolean);

    return {
      leftRooms,
      rightRooms,
    };
  }

  const fallbackLeft = sortedRooms.slice(0, Math.min(2, sortedRooms.length));
  const leftCodes = new Set(fallbackLeft.map(getRoomCode));
  const rightRooms = sortedRooms.filter((room) => !leftCodes.has(getRoomCode(room)));

  return {
    leftRooms: [...fallbackLeft].sort((a, b) => sortRoomsByCode(b, a)),
    rightRooms,
  };
}

function Door({ x, y, side = "left", radius = 24 }) {
  if (side === "right") {
    return (
      <g>
        <line x1={x} y1={y} x2={x} y2={y + radius} stroke="#cbd5e1" strokeWidth="2.5" />
        <path d={`M ${x} ${y + radius} A ${radius} ${radius} 0 0 0 ${x - radius} ${y}`} fill="none" stroke="#cbd5e1" strokeWidth="2.5" />
      </g>
    );
  }

  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + radius} stroke="#cbd5e1" strokeWidth="2.5" />
      <path d={`M ${x} ${y + radius} A ${radius} ${radius} 0 0 1 ${x + radius} ${y}`} fill="none" stroke="#cbd5e1" strokeWidth="2.5" />
    </g>
  );
}

function WindowLine({ x, y, width = 52 }) {
  return <line x1={x} y1={y} x2={x + width} y2={y} stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />;
}

function VerticalWindowLine({ x, y, height = 46 }) {
  return <line x1={x} y1={y} x2={x} y2={y + height} stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />;
}

function Stair({ x, y }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {[0, 1, 2, 3, 4, 5].map((step) => {
        const sx = step * 12;
        const sy = 70 - step * 10;
        return (
          <path
            key={step}
            d={`M ${sx} ${sy} H ${sx + 12} V ${sy - 10}`}
            fill="none"
            stroke="#111827"
            strokeWidth="5"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        );
      })}
    </g>
  );
}

function BlueprintRoomShape({ room, x, y, w, h, orientation, onSelect, isFirstRoom, isLastRoom }) {
  const statusKey = getFloorPlanStatus(room);
  const meta = FLOOR_PLAN_STATUS_META[statusKey] ?? FLOOR_PLAN_STATUS_META.OCCUPIED;
  const isVertical = orientation === "vertical";
  const roomCode = getRoomCode(room);

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
      aria-label={`Xem phòng ${roomCode}`}
      onClick={() => onSelect(room)}
      onKeyDown={handleKeyDown}
      className="cursor-pointer transition hover:drop-shadow-lg focus:outline-none"
    >
      <rect x={x} y={y} width={w} height={h} fill={meta.fill} stroke="#111827" strokeWidth="3" />
      <rect
        x={x + 9}
        y={y + 9}
        width={w - 18}
        height={h - 18}
        fill="none"
        stroke={meta.stroke}
        strokeWidth="1.5"
        strokeDasharray="4 7"
        opacity="0.28"
      />

      {isVertical ? (
        <>
          <Door x={x + w} y={y + h - 42} side="right" radius={24} />
          {isFirstRoom && <WindowLine x={x + 18} y={y + 4} width={w - 36} />}
          {isLastRoom && <VerticalWindowLine x={x + 4} y={y + h - 62} height={48} />}
        </>
      ) : (
        <>
          <Door x={x} y={y + h * 0.42} side="left" radius={22} />
          <VerticalWindowLine x={x + w - 4} y={y + h / 2 - 23} height={46} />
          {isFirstRoom && <WindowLine x={x + w / 2 - 26} y={y + 4} width={52} />}
          {isLastRoom && <WindowLine x={x + w / 2 - 26} y={y + h - 4} width={52} />}
        </>
      )}

      <text x={x + w / 2} y={y + h / 2 + 6} textAnchor="middle" fontSize="18" fontWeight="900" fill="#111827">
        {roomCode}
      </text>
      <circle cx={x + w - 13} cy={y + 13} r="7" fill={meta.stroke} />
    </g>
  );
}

function FloorBlueprint({ rooms, onSelect }) {
  const { leftRooms, rightRooms } = useMemo(() => buildFloorLayoutRooms(rooms), [rooms]);

  if (rooms.length === 0) {
    return (
      <div className="rounded-[2rem] bg-[#e9e9e9] px-6 py-16 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
        Chưa có dữ liệu phòng cho tầng này.
      </div>
    );
  }

  const LEFT_ROOM_W = 92;
  const LEFT_ROOM_H = 118;
  const LEFT_GAP = 8;
  const TOTAL_LEFT_HEIGHT = LEFT_ROOM_H * Math.max(leftRooms.length, 2) + LEFT_GAP * Math.max(leftRooms.length - 1, 1);
  const RIGHT_ROOM_W = 146;
  const RIGHT_GAP = 8;
  const visibleRightRows = Math.min(Math.max(rightRooms.length, 1), 3);
  const RIGHT_ROOM_H = Math.max(70, (LEFT_ROOM_H * 2 + LEFT_GAP - RIGHT_GAP * (visibleRightRows - 1)) / visibleRightRows);
  const START_Y = 68;
  const LEFT_X = 90;
  const HALL_X = 210;
  const RIGHT_X = 300;
  const extraRightCount = Math.max(0, rightRooms.length - 3);
  const svgHeight = Math.max(430, START_Y + TOTAL_LEFT_HEIGHT + 42 + extraRightCount * (RIGHT_ROOM_H + RIGHT_GAP) + 96);
  const lastRightRoomY =
    rightRooms.length <= 3
      ? START_Y + Math.max(0, rightRooms.length - 1) * (RIGHT_ROOM_H + RIGHT_GAP)
      : START_Y + TOTAL_LEFT_HEIGHT + RIGHT_GAP + Math.max(0, rightRooms.length - 4) * (RIGHT_ROOM_H + RIGHT_GAP);
  const hallTop = START_Y;
  const hallBottom = Math.max(START_Y + TOTAL_LEFT_HEIGHT, lastRightRoomY + RIGHT_ROOM_H);
  const hallHeight = hallBottom - hallTop;

  return (
    <div className="overflow-x-auto rounded-[2rem] bg-[#e9e9e9] p-6 ring-1 ring-slate-200">
      <div className="mx-auto min-w-[620px] max-w-[760px]">
        <svg viewBox={`0 0 560 ${svgHeight}`} className="mx-auto block h-auto w-full max-w-[700px]">
          <defs>
            <linearGradient id="hallGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#dbe3ee" />
            </linearGradient>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#64748b" floodOpacity="0.18" />
            </filter>
          </defs>

          <rect x={HALL_X} y={hallTop} width="54" height={hallHeight} rx="18" fill="url(#hallGradient)" stroke="#cbd5e1" strokeWidth="2" filter="url(#softShadow)" />
          <line x1={HALL_X + 27} y1={hallTop + 14} x2={HALL_X + 27} y2={hallTop + hallHeight / 2 - 62} stroke="#94a3b8" strokeWidth="2" strokeDasharray="7 9" opacity="0.65" />
          <line x1={HALL_X + 27} y1={hallTop + hallHeight / 2 + 62} x2={HALL_X + 27} y2={hallBottom - 14} stroke="#94a3b8" strokeWidth="2" strokeDasharray="7 9" opacity="0.65" />
          <text
            x={HALL_X + 27}
            y={hallTop + hallHeight / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
            fontWeight="900"
            fill="#64748b"
            letterSpacing="3"
            transform={`rotate(-90 ${HALL_X + 27} ${hallTop + hallHeight / 2})`}
          >
            HÀNH LANG
          </text>
          <line x1={HALL_X + 11} y1={hallTop + 14} x2={HALL_X + 11} y2={hallBottom - 14} stroke="#e2e8f0" strokeWidth="1.5" opacity="0.9" />
          <line x1={HALL_X + 43} y1={hallTop + 14} x2={HALL_X + 43} y2={hallBottom - 14} stroke="#e2e8f0" strokeWidth="1.5" opacity="0.9" />

          {leftRooms.map((room, index) => (
            <BlueprintRoomShape
              key={getRoomCode(room)}
              room={room}
              x={LEFT_X}
              y={START_Y + index * (LEFT_ROOM_H + LEFT_GAP)}
              w={LEFT_ROOM_W}
              h={LEFT_ROOM_H}
              orientation="vertical"
              onSelect={onSelect}
              isFirstRoom={index === 0}
              isLastRoom={index === leftRooms.length - 1}
            />
          ))}

          <Stair x={LEFT_X - 8} y={START_Y + TOTAL_LEFT_HEIGHT + 28} />

          {rightRooms.slice(0, 3).map((room, index) => (
            <BlueprintRoomShape
              key={getRoomCode(room)}
              room={room}
              x={RIGHT_X}
              y={START_Y + index * (RIGHT_ROOM_H + RIGHT_GAP)}
              w={RIGHT_ROOM_W}
              h={RIGHT_ROOM_H}
              orientation="horizontal"
              onSelect={onSelect}
              isFirstRoom={index === 0}
              isLastRoom={index === rightRooms.length - 1}
            />
          ))}

          {rightRooms.slice(3).map((room, index) => (
            <BlueprintRoomShape
              key={getRoomCode(room)}
              room={room}
              x={RIGHT_X}
              y={START_Y + TOTAL_LEFT_HEIGHT + RIGHT_GAP + index * (RIGHT_ROOM_H + RIGHT_GAP)}
              w={RIGHT_ROOM_W}
              h={RIGHT_ROOM_H}
              orientation="horizontal"
              onSelect={onSelect}
              isFirstRoom={false}
              isLastRoom={index === rightRooms.slice(3).length - 1}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

function FloorPlanTabs({ floors, selectedFloor, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-[1.4rem] bg-[#19243a] p-1.5 shadow-inner sm:grid-cols-3 lg:grid-cols-6">
      {floors.map((floor) => {
        const active = floor === selectedFloor;
        const isOverview = floor === BUILDING_OVERVIEW_LABEL;
        return (
          <button
            key={floor}
            type="button"
            onClick={() => onSelect(floor)}
            className={`h-10 min-w-0 rounded-[1rem] px-3 text-xs font-black uppercase tracking-wide transition ${
              active ? "bg-white text-[#172033] shadow" : "text-slate-200 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className="block truncate">{isOverview ? "Sơ đồ nhà trọ" : floor}</span>
          </button>
        );
      })}
    </div>
  );
}

function FloorPlanLegend() {
  return (
    <div className="flex flex-wrap gap-3">
      {Object.entries(FLOOR_PLAN_STATUS_META).map(([key, meta]) => (
        <div key={key} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
          <span className={`h-3 w-3 rounded-full ${meta.dot}`} />
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
      <line x1={x} y1={y} x2={x} y2={y + radius} stroke="#cbd5e1" strokeWidth="1.5" />
      <path d={`M ${x} ${y + radius} A ${radius} ${radius} 0 0 ${sweep} ${arcEndX} ${y}`} fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
    </g>
  );
}

function MiniWindowLine({ x, y, width = 32 }) {
  return <line x1={x} y1={y} x2={x + width} y2={y} stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />;
}

function MiniVerticalWindowLine({ x, y, height = 28 }) {
  return <line x1={x} y1={y} x2={x} y2={y + height} stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />;
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
            stroke="#111827"
            strokeWidth="3.2"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        );
      })}
    </g>
  );
}

function MiniBlueprintRoomShape({ room, x, y, w, h, orientation, onSelect, isFirstRoom, isLastRoom }) {
  const statusKey = getFloorPlanStatus(room);
  const meta = FLOOR_PLAN_STATUS_META[statusKey] ?? FLOOR_PLAN_STATUS_META.OCCUPIED;
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
      className="cursor-pointer transition hover:drop-shadow-md focus:outline-none"
    >
      <rect x={x} y={y} width={w} height={h} fill={meta.fill} stroke="#111827" strokeWidth="2" />
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
          {isFirstRoom && <MiniWindowLine x={x + 12} y={y + 3} width={w - 24} />}
          {isLastRoom && <MiniVerticalWindowLine x={x + 3} y={y + h - 38} height={30} />}
        </>
      ) : (
        <>
          <MiniDoor x={x} y={y + h * 0.42} side="left" radius={13} />
          <MiniVerticalWindowLine x={x + w - 3} y={y + h / 2 - 14} height={28} />
          {isFirstRoom && <MiniWindowLine x={x + w / 2 - 17} y={y + 3} width={34} />}
          {isLastRoom && <MiniWindowLine x={x + w / 2 - 17} y={y + h - 3} width={34} />}
        </>
      )}

      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="900" fill="#111827">
        {getMiniRoomLabel(room)}
      </text>
      <circle cx={x + w - 8} cy={y + 8} r="4.5" fill={meta.stroke} />
    </g>
  );
}

function MiniFloorOverview({ floor, rooms, onSelectRoom, onSelectFloor }) {
  const { leftRooms, rightRooms } = useMemo(() => buildFloorLayoutRooms(rooms), [rooms]);
  const RIGHT_ROOM_H = 58;
  const RIGHT_GAP = 5;
  const LEFT_GAP = 5;
  const LEFT_ROOM_W = 58;
  const LEFT_ROOM_H = (RIGHT_ROOM_H * 3 + RIGHT_GAP * 2 - LEFT_GAP) / 2;
  const TOTAL_LEFT_HEIGHT = LEFT_ROOM_H * Math.max(leftRooms.length, 2) + LEFT_GAP * Math.max(leftRooms.length - 1, 1);
  const RIGHT_ROOM_W = 86;
  const START_Y = 44;
  const LEFT_X = 8;
  const HALL_X = 78;
  const RIGHT_X = 118;
  const rightColumnHeight = rightRooms.length > 0
    ? RIGHT_ROOM_H * rightRooms.length + RIGHT_GAP * Math.max(0, rightRooms.length - 1)
    : 0;
  const contentHeight = Math.max(TOTAL_LEFT_HEIGHT, rightColumnHeight);
  const svgHeight = Math.max(242, START_Y + contentHeight + 84);
  const hallTop = START_Y;
  const hallBottom = START_Y + contentHeight;
  const hallHeight = hallBottom - hallTop;
  const safeFloorId = String(floor).replace(/[^a-zA-Z0-9_-]/g, "") || "floor";
  const hallGradientId = `miniHallGradient-${safeFloorId}`;
  const hallShadowId = `miniHallShadow-${safeFloorId}`;

  return (
    <article className="w-[200px] min-w-[200px]">
      <button
        type="button"
        onClick={() => onSelectFloor(floor)}
        className="mb-4 block w-full rounded-xl text-center transition hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="text-2xl font-black tracking-tight text-black md:text-3xl">{floor}</span>
      </button>

      {rooms.length === 0 ? (
        <div className="flex min-h-[242px] items-center justify-center rounded-2xl bg-slate-100 px-3 text-center text-xs font-bold text-slate-400">
          Chưa có dữ liệu phòng
        </div>
      ) : (
        <svg viewBox={`0 0 210 ${svgHeight}`} className="mx-auto block h-auto w-full">
          <defs>
            <linearGradient id={hallGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f7fbff" />
              <stop offset="100%" stopColor="#e8f0f9" />
            </linearGradient>
            <filter id={hallShadowId} x="-35%" y="-12%" width="170%" height="124%">
              <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#94a3b8" floodOpacity="0.22" />
            </filter>
          </defs>

          <rect x={HALL_X} y={hallTop} width="28" height={hallHeight} rx="12" fill={`url(#${hallGradientId})`} stroke="#cbd5e1" strokeWidth="1.3" filter={`url(#${hallShadowId})`} />
          <line x1={HALL_X + 14} y1={hallTop + 8} x2={HALL_X + 14} y2={hallTop + hallHeight / 2 - 34} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 8" opacity="0.72" />
          <line x1={HALL_X + 14} y1={hallTop + hallHeight / 2 + 34} x2={HALL_X + 14} y2={hallBottom - 8} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 8" opacity="0.72" />
          <text
            x={HALL_X + 14}
            y={hallTop + hallHeight / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8"
            fontWeight="900"
            fill="#64748b"
            letterSpacing="2"
            transform={`rotate(-90 ${HALL_X + 14} ${hallTop + hallHeight / 2})`}
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

          <MiniStair x={LEFT_X - 2} y={START_Y + TOTAL_LEFT_HEIGHT + 16} />

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

function BuildingOverview({ floors, allRooms, onSelectFloor, onSelectRoom }) {
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

  if (floors.length === 0) {
    return (
      <div className="rounded-[2rem] bg-[#e9e9e9] px-6 py-16 text-center text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
        Chưa có dữ liệu tầng.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[2rem] bg-[#e9e9e9] px-4 py-6 ring-1 ring-slate-200 xl:overflow-x-visible">
      <div className="mx-auto grid min-w-[1048px] max-w-[1048px] grid-cols-5 items-start gap-3">
        {floors.map((floor) => (
          <MiniFloorOverview
            key={floor}
            floor={floor}
            rooms={[...(roomsByFloor.get(floor) || [])].sort(sortRoomsByCode)}
            onSelectRoom={onSelectRoom}
            onSelectFloor={onSelectFloor}
          />
        ))}
      </div>
    </div>
  );
}

function FloorPlanPanel({ floors, selectedFloor, rooms, allRooms, onSelectFloor, onSelectRoom }) {
  return (
    <div className="space-y-6 rounded-[2rem] bg-[#f3f5f8] p-5 text-slate-950 shadow-sm md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Sơ đồ tầng</p>
          <h2 className="mt-1 text-3xl font-black text-slate-950">{BUILDING_OVERVIEW_LABEL}</h2>
        </div>
        <FloorPlanLegend />
      </div>

      <BuildingOverview floors={floors} allRooms={allRooms} onSelectFloor={onSelectFloor} onSelectRoom={onSelectRoom} />
    </div>
  );
}

function RoomListingCard({ room, isSelected, onSelect, multiSelect, onToggleBatch, priority = false }) {
  const selectable = room.status === "available";
  return (
    <button
      type="button"
      onClick={() => {
        if (multiSelect && selectable) {
          onToggleBatch(room);
        } else {
          onSelect(room);
        }
      }}
      className={`group w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900 text-left shadow-lg shadow-black/15 transition hover:-translate-y-1 hover:border-white/20 ${isSelected ? "ring-2 ring-white" : ""}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-950">
        <Image
          src={room.image}
          alt={`Ảnh phòng ${room.id}`}
          fill
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 350px"
          className="object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />
        <span
          className={`absolute left-4 top-4 rounded-md border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-widest shadow-lg shadow-black/20 ${publicStatusClass(room.status)
            }`}
        >
          {guestStatusCopy(room.status)}
        </span>
        {multiSelect && (
          <span
            className={`absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg border text-sm font-black ${
              isSelected
                ? "border-emerald-300 bg-emerald-400 text-slate-950"
                : selectable
                  ? "border-white/50 bg-slate-950/70 text-white"
                  : "border-white/10 bg-slate-950/60 text-slate-600"
            }`}
          >
            {isSelected ? "✓" : ""}
          </span>
        )}
      </div>

      <div className="bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{room.floor}</p>
            <h3 className="mt-1 text-xl font-bold text-white">{room.id}</h3>
          </div>
          <p className={`text-right text-sm font-extrabold sm:text-base ${room.status === "available" ? "text-emerald-400" : "text-amber-400"}`}>
            {room.priceLabel}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-200">
          <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">{room.area}m²</span>
          <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">{room.feature}</span>
        </div>

        <div className="mt-5 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
          <>
            {multiSelect ? (selectable ? "Chọn phòng" : "Không thể chọn") : "Xem chi tiết"}
            <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
          </>
        </div>
      </div>
    </button>
  );
}

function RoomDetail({ room, onClose }) {
  const [activeImage, setActiveImage] = useState(room.images?.[0] ?? room.image ?? ROOM_PLACEHOLDER_IMAGE);
  const galleryImages = room.images?.length ? room.images : [room.image || ROOM_PLACEHOLDER_IMAGE];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#1e2746]/95 shadow-2xl">
      <div className="relative h-56 shrink-0 overflow-hidden bg-slate-900">
        <Image
          src={activeImage || ROOM_PLACEHOLDER_IMAGE}
          alt={`Ảnh phòng ${room.id}`}
          fill
          sizes="(max-width: 1024px) 100vw, 420px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chi tiết phòng"
          className="absolute right-4 top-4 rounded-full bg-black/40 p-2.5 text-white backdrop-blur transition hover:bg-black/60"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Phòng {room.id}</h2>
            <p className="mt-1 text-xs font-medium text-white/70">
              {room.floor} · {room.area}m² · {room.maxPeople} người
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-white">{room.priceLabel}</p>
            <p className="text-xs text-white/60">VND/tháng</p>
          </div>
        </div>
      </div>

      {/* Bọc class động theo từng trạng thái */}
      <div className={`border-b px-5 py-3 ${room.status === "available" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-100"
        }`}>
        <span className={`inline-flex items-center gap-2 text-sm font-bold ${room.status === "available" ? "text-emerald-700" : "text-slate-700"
          }`}>
          <span className={`h-2 w-2 rounded-full ${room.status === "available" ? "bg-emerald-500" : "bg-slate-400"
            }`} />
          {room.status === "available" ? "Còn trống - sẵn sàng vào ở" : "Đã thuê - không còn trống"}
        </span>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto bg-white p-5 text-[#091426]">
        <div className="mb-5 grid grid-cols-4 gap-2">
          {galleryImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveImage(image)}
              className={`relative aspect-[4/3] overflow-hidden rounded-xl border transition ${activeImage === image ? "border-[#091426] ring-2 ring-[#091426]/10" : "border-slate-200"
                }`}
              aria-label={`Xem ảnh phòng ${index + 1}`}
            >
              <Image src={image} alt={`Ảnh ${index + 1} phòng ${room.id}`} fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>

        <p className="text-sm leading-6 text-slate-500">{room.description}</p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-[14px] bg-slate-50 p-4 text-center">
            <Maximize2 className="mx-auto mb-2 h-5 w-5 text-blue-500" />
            <p className="font-bold">{room.area}m²</p>
            <p className="text-xs text-slate-400">Diện tích</p>
          </div>
          <div className="rounded-[14px] bg-slate-50 p-4 text-center">
            <Users className="mx-auto mb-2 h-5 w-5 text-blue-500" />
            <p className="font-bold">{room.maxPeople}</p>
            <p className="text-xs text-slate-400">Tối đa</p>
          </div>
          <div className="rounded-[14px] bg-slate-50 p-4 text-center">
            <Building2 className="mx-auto mb-2 h-5 w-5 text-blue-500" />
            <p className="font-bold">T{room.floorNumber}</p>
            <p className="text-xs text-slate-400">Tầng</p>
          </div>
        </div>

        <div className="mt-6 rounded-[14px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Chỉ số gần nhất</h3>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white p-3">
              <p className="text-xs font-semibold text-slate-400">Điện cũ</p>
              <p className="mt-1 text-lg font-bold text-[#091426]">{room.lastMeterReading.electric} kWh</p>
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="text-xs font-semibold text-slate-400">Nước cũ</p>
              <p className="mt-1 text-lg font-bold text-[#091426]">{room.lastMeterReading.water} m³</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Lần nhập gần nhất: {room.lastMeterReading.recordedAt}</p>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-bold text-slate-700">Tiện ích trong phòng</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {room.amenities.map((amenity, index) => (
              <div key={`${amenity}-${index}`} className="flex items-center gap-2 rounded-[14px] bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                {amenity}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-[14px] border border-blue-100 bg-blue-50 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-blue-800">Tiện ích tòa nhà</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {room.buildingFacilities.map((facility, index) => (
              <span key={`${facility}-${index}`} className="text-xs text-blue-700">
                {facility}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white p-4">
        <Link
          href={getRoomDetailHref(room)}
          className="flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-[14px] bg-[#232946] px-4 py-3 text-center text-sm font-bold leading-tight text-white shadow-[0_10px_24px_rgba(35,41,70,0.22)] transition hover:bg-[#091426] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#232946]/25 sm:gap-3 sm:px-5 sm:text-base"
        >
          <span>Xem chi tiết phòng</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      </div>
    </div>
  );
}

export default function RoomsClient({ depositSuccess = false, requestedRoomId = "" }) {
  const allFloorsLabel = "Tất cả";
  const router = useRouter();
  const [viewMode, setViewMode] = useState("Listing");
  const [activeFloorFilter, setActiveFloorFilter] = useState(allFloorsLabel);
  const [activeFloorPlan, setActiveFloorPlan] = useState(BUILDING_OVERVIEW_LABEL);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState([]);

  const [apiRooms, setApiRooms] = useState([]);
  const [catalogFloors, setCatalogFloors] = useState([]);
  const [property, setProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const loadPublicRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);
      const catalog = await fetchPublicRoomCatalog();
      setProperty(catalog.property);
      setCatalogFloors(catalog.floors);
      setApiRooms(catalog.rooms);
      setActiveFloorPlan((current) => (
        current === BUILDING_OVERVIEW_LABEL || catalog.floors.some((floor) => floor.name === current)
          ? current
          : BUILDING_OVERVIEW_LABEL
      ));
      setIsSuccess(true);
    } catch {
      setIsError(true);
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPublicRooms();
  }, [loadPublicRooms]);

  const visibleRooms = useMemo(() => {
    return apiRooms.map((apiRoom) => normalizeApiRoom(apiRoom));
  }, [apiRooms]);

  const dynamicFloors = useMemo(() => {
    const uniqueFloors = catalogFloors.map((floor) => floor.name).filter(Boolean);
    return [allFloorsLabel, ...uniqueFloors];
  }, [catalogFloors, allFloorsLabel]);

  const floorsForPlan = useMemo(() => catalogFloors.map((floor) => floor.name).filter(Boolean), [catalogFloors]);

  const filteredRooms = useMemo(() => {
    return visibleRooms.filter((room) => {
      if (activeFloorFilter !== allFloorsLabel && room.floor !== activeFloorFilter) return false;
      if (availableOnly && !isVacantOrSoonVacant(room)) return false;
      if (searchQuery && !room.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [activeFloorFilter, allFloorsLabel, availableOnly, searchQuery, visibleRooms]);

  const currentFloorRooms = useMemo(
    () => visibleRooms.filter((room) => room.floor === activeFloorPlan),
    [activeFloorPlan, visibleRooms],
  );
  const openRoom = (room) => {
    router.push(getRoomDetailHref(room));
  };
  const toggleBatchRoom = (room) => {
    if (room.status !== "available") return;
    setSelectedRooms((current) => (
      current.some((item) => item.roomId === room.roomId)
        ? current.filter((item) => item.roomId !== room.roomId)
        : [...current, room]
    ));
  };
  const startBatchDeposit = () => {
    if (selectedRooms.length < 2) return;
    const roomIds = selectedRooms.map((room) => room.roomId).join(",");
    window.sessionStorage.setItem(
      "hdbhms_batch_selected_rooms",
      JSON.stringify(selectedRooms.map((room) => ({
        roomId: room.roomId,
        roomCode: room.roomCode,
      }))),
    );
    router.push(`/rooms/deposit-batch?roomIds=${encodeURIComponent(roomIds)}`);
  };

  return (
    <div className="min-h-screen bg-[#091426] px-4 pb-8 pt-8 text-white sm:px-6 sm:pb-12 sm:pt-28 lg:px-8">
      {isError && (
        <div className="mx-auto mb-6 max-w-xl rounded-[1.5rem] border border-rose-300/20 bg-rose-400/10 px-6 py-8 text-center">
          <p className="text-sm font-semibold text-rose-100">Không tải được dữ liệu phòng</p>
          <button
            type="button"
            onClick={loadPublicRooms}
            className="mt-5 h-11 rounded-xl bg-white px-5 text-sm font-bold text-[#091426] transition hover:bg-slate-100"
          >
            Thử lại
          </button>
        </div>
      )}
      {isLoading && <div className="py-10 text-center">Đang tải danh sách phòng...</div>}
      {isSuccess && (
        <>
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <div className="mb-3 flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-slate-400">
                  <Home className="h-4 w-4" />
                  {property?.name || "Hải Đăng House"}
                </div>
                <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
                  Xem phòng trống và chọn phòng đặt cọc
                </h1>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setMultiSelect((current) => !current);
                    setViewMode("Listing");
                    setAvailableOnly(true);
                  }}
                  className={`flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition ${
                    multiSelect
                      ? "bg-emerald-400 text-slate-950"
                      : "border border-white/10 bg-[#1e2746] text-white hover:bg-white/10"
                  }`}
                >
                  <Layers3 className="h-4 w-4" />
                  {multiSelect ? "Đang chọn nhiều phòng" : "Chọn nhiều phòng"}
                </button>
                <div className="flex h-11 rounded-2xl border border-white/5 bg-[#1e2746] p-1">
                  {[
                    { key: "Listing", label: "Danh sách", icon: LayoutGrid },
                    { key: "Floor Plan", label: "Sơ đồ tầng", icon: MapIcon },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setViewMode(item.key);
                        }}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition sm:flex-none ${viewMode === item.key ? "bg-white text-[#1a223d]" : "text-slate-400 hover:text-white"
                          }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {viewMode === "Listing" && (
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Tìm mã phòng..."
                    className="h-11 w-full rounded-2xl border border-white/10 bg-[#1e2746] pl-11 pr-4 text-sm font-medium text-white outline-none transition focus:border-white/30"
                  />
                </div>
                )}
              </div>
            </div>

            {viewMode === "Listing" && (
            <div className="mb-8 flex flex-col gap-3 rounded-[1.5rem] border border-white/5 bg-[#1e2746]/50 p-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(viewMode === "Listing" ? dynamicFloors : floorsForPlan).map((floor) => {
                  const isActive = viewMode === "Listing" ? activeFloorFilter === floor : activeFloorPlan === floor;
                  return (
                    <button
                      key={floor}
                      type="button"
                      onClick={() => {
                        viewMode === "Listing" ? setActiveFloorFilter(floor) : setActiveFloorPlan(floor);
                      }}
                      className={`h-10 shrink-0 rounded-2xl px-5 text-xs font-bold uppercase tracking-widest transition ${isActive ? "bg-white text-[#1a223d]" : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                      {floor}
                    </button>
                  );
                })}
              </div>

                <label className="flex h-11 shrink-0 cursor-pointer items-center gap-4 rounded-2xl px-4 transition hover:bg-white/5">
                  <span className="relative flex h-6 items-center">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={availableOnly}
                      onChange={(event) => setAvailableOnly(event.target.checked)}
                    />
                    <span className={`h-6 w-12 rounded-full transition ${availableOnly ? "bg-emerald-500" : "bg-slate-700"}`} />
                    <span
                      className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition ${availableOnly ? "translate-x-6" : ""
                        }`}
                    />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Chỉ hiện phòng trống</span>
                </label>
            </div>
            )}

            {depositSuccess && (
              <div className="mb-8 rounded-[1.25rem] border border-emerald-400/25 bg-emerald-400/10 px-5 py-4 text-sm font-semibold text-emerald-100">
                Yêu cầu đặt phòng {requestedRoomId || ""} đã được gửi thành công. Chủ trọ sẽ kiểm tra và phản hồi theo thông tin liên hệ đã cung cấp.
              </div>
            )}

            <div className="grid gap-8">
              <section>
                {viewMode === "Listing" ? (
                  <div className="mx-auto w-full max-w-6xl">
                    {filteredRooms.length > 0 ? (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
                        {filteredRooms.map((room, index) => (
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
                    ) : (
                      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-5 py-10 text-center">
                        {visibleRooms.length === 0 && (
                          <p className="text-sm font-semibold text-slate-300">Chưa có dữ liệu phòng</p>
                        )}
                        {visibleRooms.length > 0 && (
                          <p className="text-sm font-semibold text-slate-300">Không có phòng phù hợp với bộ lọc hiện tại.</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <FloorPlanPanel
                    floors={floorsForPlan}
                    selectedFloor={activeFloorPlan}
                    rooms={currentFloorRooms}
                    allRooms={visibleRooms}
                    onSelectFloor={setActiveFloorPlan}
                    onSelectRoom={openRoom}
                  />
                )}
              </section>
            </div>
          </div>
          {multiSelect && (
            <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-4xl rounded-2xl border border-emerald-300/30 bg-[#111c31]/95 p-4 shadow-2xl backdrop-blur sm:bottom-6 sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-black text-white">
                  <ShoppingCart className="h-4 w-4 text-emerald-400" />
                  {selectedRooms.length} phòng đã chọn
                </div>
                <p className="mt-1 truncate text-xs text-slate-300">
                  {selectedRooms.length
                    ? selectedRooms.map((room) => room.roomCode).join(", ")
                    : "Chọn ít nhất 2 phòng đang trống"}
                </p>
                <p className="mt-1 text-xs font-bold text-emerald-300">
                  Tổng tiền cọc: {(selectedRooms.length * 2000).toLocaleString("vi-VN")} ₫
                </p>
              </div>
              <div className="mt-3 flex gap-2 sm:mt-0">
                <button
                  type="button"
                  onClick={() => setSelectedRooms([])}
                  className="h-11 rounded-xl border border-white/15 px-4 text-sm font-bold text-white hover:bg-white/10"
                >
                  Xóa chọn
                </button>
                <button
                  type="button"
                  disabled={selectedRooms.length < 2}
                  onClick={startBatchDeposit}
                  className="h-11 rounded-xl bg-emerald-400 px-5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Đặt cọc các phòng đã chọn
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
