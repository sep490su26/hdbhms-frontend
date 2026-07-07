"use client";

const STATUS_META = {
  VACANT: { fill: "#ecfdf5", stroke: "#10b981" },
  HOLDING: { fill: "#ecfdf5", stroke: "#10b981" },
  RESERVED: { fill: "#ecfdf5", stroke: "#10b981" },
  OCCUPIED: { fill: "#ecfdf5", stroke: "#10b981" },
  MAINTENANCE: { fill: "#ecfdf5", stroke: "#10b981" },
  EXPIRED: { fill: "#ecfdf5", stroke: "#10b981" },
};

export const ORIENTATIONS = ["north", "east", "south", "west"];

export const BLUEPRINT_RESIZE_ENABLE = {
  top: false,
  right: true,
  bottom: true,
  left: false,
  topRight: false,
  bottomRight: true,
  bottomLeft: false,
  topLeft: false,
};

const resizeHandleBase = {
  width: 12,
  height: 12,
  background: "#2563eb",
  border: "2px solid #fff",
  borderRadius: 3,
  boxSizing: "border-box",
  zIndex: 25,
};

export const BLUEPRINT_RESIZE_HANDLE_STYLES = {
  right: { ...resizeHandleBase, right: -6, top: "50%", marginTop: -6, cursor: "ew-resize" },
  bottom: { ...resizeHandleBase, bottom: -6, left: "50%", marginLeft: -6, cursor: "ns-resize" },
  bottomRight: { ...resizeHandleBase, right: -6, bottom: -6, cursor: "nwse-resize" },
};

export function normalizeOrientation(value, width = 0, height = 0) {
  if (ORIENTATIONS.includes(value)) return value;
  if (value === "vertical") return "north";
  if (value === "horizontal") return "east";
  return width > height ? "east" : "north";
}

export function nextOrientationFor(type, orientation) {
  const normalized = normalizeOrientation(orientation);
  if (type === "CORRIDOR") return normalized === "east" ? "north" : "east";
  const index = ORIENTATIONS.indexOf(normalized);
  return ORIENTATIONS[(index + 1) % ORIENTATIONS.length];
}

export function FloorPlanSvgDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="pointer-events-none absolute">
      <defs>
        <linearGradient id="hallGradientVertical" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#dbe3ee" />
        </linearGradient>
        <linearGradient id="hallGradientHorizontal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#dbe3ee" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function normalizeStatus(status) {
  const value = String(status ?? "").trim().toUpperCase();
  if (value === "AVAILABLE") return "VACANT";
  if (value === "ON_HOLD") return "HOLDING";
  if (value === "DEPOSITED") return "RESERVED";
  if (value === "SOON_VACANT") return "EXPIRED";
  return value || "VACANT";
}

function clampDimension(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

function clampOffset(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0.5;
  return Math.min(0.96, Math.max(0.04, parsed));
}

function roomLabel(item) {
  const rawCode = String(item.code ?? item.roomCode ?? item.name ?? "").trim();
  if (!rawCode) return "P";
  return rawCode.toUpperCase().startsWith("P") ? rawCode : `P${rawCode}`;
}

function SelectionOutline({ width, height, rx = 8 }) {
  return (
    <rect
      x="-5"
      y="-5"
      width={width + 10}
      height={height + 10}
      rx={rx}
      fill="none"
      stroke="#2563eb"
      strokeWidth="3"
      strokeDasharray="6 4"
    />
  );
}

function DoorOpening({ wall, offset, width, height, opacity = 1 }) {
  const radius = 20;
  const safeOffset = clampOffset(offset);
  const strokeProps = { stroke: "#cbd5e1", strokeWidth: "1.8", opacity };

  if (wall === "top") {
    const x = safeOffset * width;
    return (
      <>
        <line x1={x} y1="0" x2={x - radius} y2="0" {...strokeProps} />
        <path d={`M ${x - radius} 0 A ${radius} ${radius} 0 0 0 ${x} ${radius}`} fill="none" {...strokeProps} />
      </>
    );
  }
  if (wall === "bottom") {
    const x = safeOffset * width;
    return (
      <>
        <line x1={x} y1={height} x2={x - radius} y2={height} {...strokeProps} />
        <path d={`M ${x - radius} ${height} A ${radius} ${radius} 0 0 1 ${x} ${height - radius}`} fill="none" {...strokeProps} />
      </>
    );
  }
  if (wall === "right") {
    const y = safeOffset * height;
    return (
      <>
        <line x1={width} y1={y} x2={width} y2={y + radius} {...strokeProps} />
        <path d={`M ${width} ${y + radius} A ${radius} ${radius} 0 0 0 ${width - radius} ${y}`} fill="none" {...strokeProps} />
      </>
    );
  }

  const y = safeOffset * height;
  return (
    <>
      <line x1="0" y1={y} x2="0" y2={y + radius} {...strokeProps} />
      <path d={`M 0 ${y + radius} A ${radius} ${radius} 0 0 1 ${radius} ${y}`} fill="none" {...strokeProps} />
    </>
  );
}

function WindowOpening({ wall, offset, width, height, opacity = 1 }) {
  const safeOffset = clampOffset(offset);
  const strokeProps = {
    stroke: "#94a3b8",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    opacity,
  };

  if (wall === "top" || wall === "bottom") {
    const x = safeOffset * width;
    const y = wall === "top" ? 4 : height - 4;
    return <line x1={x - 16} y1={y} x2={x + 16} y2={y} {...strokeProps} />;
  }

  const x = wall === "left" ? 4 : width - 4;
  const y = safeOffset * height;
  return <line x1={x} y1={y - 14} x2={x} y2={y + 14} {...strokeProps} />;
}

function RoomBlueprint({ item, width, height, selected }) {
  const status = normalizeStatus(item.status ?? item.currentStatus ?? item.current_status);
  const meta = STATUS_META[status] ?? STATUS_META.VACANT;
  const doors = Array.isArray(item.doors) ? item.doors : [];
  const windows = Array.isArray(item.windows) ? item.windows : [];

  return (
    <>
      <rect
        className="room-outer transition-[filter] group-hover:drop-shadow-[0_5px_8px_rgba(15,23,42,0.16)]"
        x="0"
        y="0"
        width={width}
        height={height}
        fill={meta.fill}
        stroke="#111827"
        strokeWidth="2"
      />
      <rect
        x="7"
        y="7"
        width={Math.max(0, width - 14)}
        height={Math.max(0, height - 14)}
        fill="none"
        stroke={meta.stroke}
        strokeWidth="1.2"
        strokeDasharray="3 5"
        opacity="0.32"
      />
      {doors.map((door) => (
        <DoorOpening key={door.id} wall={door.wall} offset={door.offset} width={width} height={height} />
      ))}
      {windows.map((window) => (
        <WindowOpening key={window.id} wall={window.wall} offset={window.offset} width={width} height={height} />
      ))}
      <text x={width / 2} y={height / 2 + 5} textAnchor="middle" fontSize="16" fontWeight="900" fill="#111827">
        {roomLabel(item)}
      </text>
      <circle cx={width - 13} cy="13" r="6" fill={meta.stroke} />
      {selected && <SelectionOutline width={width} height={height} />}
    </>
  );
}

function HallwayBlueprint({ item, width, height, selected }) {
  const orientation = normalizeOrientation(item.orientation, width, height);
  const vertical = orientation !== "east" && orientation !== "west";
  const midX = width / 2;
  const midY = height / 2;
  const label = item.label ?? "HÀNH LANG";
  const gradient = vertical ? "hallGradientVertical" : "hallGradientHorizontal";

  return (
    <>
      <rect
        className="hallway-rect transition-[filter] group-hover:drop-shadow-[0_5px_8px_rgba(15,23,42,0.16)]"
        x="0"
        y="0"
        width={width}
        height={height}
        rx={Math.min(18, width / 2, height / 2)}
        fill={`url(#${gradient})`}
        stroke="#cbd5e1"
        strokeWidth="1.8"
      />
      {vertical ? (
        <>
          <line x1={midX} y1="12" x2={midX} y2={Math.max(12, midY - 54)} stroke="#94a3b8" strokeWidth="1.6" strokeDasharray="6 7" opacity="0.7" />
          <line x1={midX} y1={Math.min(height - 12, midY + 54)} x2={midX} y2={height - 12} stroke="#94a3b8" strokeWidth="1.6" strokeDasharray="6 7" opacity="0.7" />
        </>
      ) : (
        <>
          <line x1="12" y1={midY} x2={Math.max(12, midX - 70)} y2={midY} stroke="#94a3b8" strokeWidth="1.6" strokeDasharray="6 7" opacity="0.7" />
          <line x1={Math.min(width - 12, midX + 70)} y1={midY} x2={width - 12} y2={midY} stroke="#94a3b8" strokeWidth="1.6" strokeDasharray="6 7" opacity="0.7" />
        </>
      )}
      <text
        x={midX}
        y={midY}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="13"
        fontWeight="900"
        fill="#64748b"
        letterSpacing="4"
        transform={vertical ? `rotate(-90 ${midX} ${midY})` : undefined}
      >
        {label.toUpperCase()}
      </text>
      {selected && <SelectionOutline width={width} height={height} rx={10} />}
    </>
  );
}

function StairsBlueprint({ item, width, height, selected }) {
  const orientation = normalizeOrientation(item.orientation, width, height);
  const rotation = { north: 0, east: 90, south: 180, west: 270 }[orientation] ?? 0;
  const stepW = width / 8;
  const stepH = height / 8;

  return (
    <>
      <rect
        className="stairs-box transition-[filter] group-hover:drop-shadow-[0_5px_8px_rgba(15,23,42,0.16)]"
        x="0"
        y="0"
        width={width}
        height={height}
        rx={Math.min(14, width / 2, height / 2)}
        fill="#f8fafc"
        stroke="#cbd5e1"
        strokeWidth="1.6"
      />
      <g transform={`rotate(${rotation} ${width / 2} ${height / 2})`}>
        {Array.from({ length: 7 }).map((_, step) => {
          const sx = 16 + step * stepW;
          const sy = height - 18 - step * stepH;
          return (
            <path
              key={step}
              d={`M ${sx} ${sy} H ${sx + stepW} V ${sy - stepH}`}
              fill="none"
              stroke="#111827"
              strokeWidth="4"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          );
        })}
      </g>
      <text x={width / 2} y={height - 8} textAnchor="middle" fontSize="10" fontWeight="900" fill="#334155">
        {(item.label ?? "CẦU THANG").toUpperCase()}
      </text>
      {selected && <SelectionOutline width={width} height={height} rx={10} />}
    </>
  );
}

function LabelBlueprint({ item, width, height, selected }) {
  return (
    <>
      <rect
        className="label-box transition-[filter] group-hover:drop-shadow-[0_5px_8px_rgba(15,23,42,0.16)]"
        x="0"
        y="0"
        width={width}
        height={height}
        rx={Math.min(12, width / 2, height / 2)}
        fill="rgba(255,255,255,.96)"
        stroke="#cbd5e1"
        strokeWidth="1.4"
      />
      <text x={width / 2} y={height / 2 + 4} textAnchor="middle" fontSize="13" fontWeight="900" fill="#334155">
        {(item.label ?? "").toUpperCase()}
      </text>
      {selected && <SelectionOutline width={width} height={height} rx={10} />}
    </>
  );
}

export function FloorPlanItem({ item, selected = false }) {
  const width = clampDimension(item.width ?? item.w, 120);
  const height = clampDimension(item.height ?? item.h, 90);
  const type = String(item.type ?? "ROOM").toUpperCase();

  return (
    <svg
      className="pointer-events-none h-full w-full overflow-visible"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      role="img"
      aria-label={item.label ?? roomLabel(item)}
    >
      {type === "ROOM" && <RoomBlueprint item={item} width={width} height={height} selected={selected} />}
      {type === "CORRIDOR" && <HallwayBlueprint item={item} width={width} height={height} selected={selected} />}
      {type === "STAIR" && <StairsBlueprint item={item} width={width} height={height} selected={selected} />}
      {type !== "ROOM" && type !== "CORRIDOR" && type !== "STAIR" && (
        <LabelBlueprint item={item} width={width} height={height} selected={selected} />
      )}
    </svg>
  );
}
