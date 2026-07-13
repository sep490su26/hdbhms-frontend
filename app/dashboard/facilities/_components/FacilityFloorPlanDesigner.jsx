"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Rnd } from "react-rnd";
import { ArrowLeft, Check, DoorOpen, Eye, Layers3, LoaderCircle, Move, Plus, Redo2, RotateCw, Save, Trash2, Undo2, WandSparkles, X, ZoomIn, ZoomOut } from "lucide-react";
import {
  BLUEPRINT_RESIZE_ENABLE,
  BLUEPRINT_RESIZE_HANDLE_STYLES,
  FloorPlanItem,
  FloorPlanSvgDefs,
  nextOrientationFor,
  normalizeOrientation,
} from "./FloorPlanItem";
import { alignRoomItems } from "./floorPlanAlign";
import { createFloor, createRoom, deleteFloor as deleteFloorRequest, deleteRoom as deleteRoomRequest } from "@/services/floorRoomService";
import { fetchFloorPlanDesignerData } from "@/services/floorPlanDesignerService";
import { fetchAdminFloorPlan, saveAdminFloorPlan } from "@/services/floorPlanService";

const GRID = 20;
const CANVAS_WIDTH = 2400;
const CANVAS_HEIGHT = 1600;
const HISTORY_LIMIT = 50;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.25;
const ZOOM_STEP = 0.15;
const LEFT_COL_X = 240;
const LEFT_ROOM_W = 100;
const LEFT_ROOM_H = 120;
const LEFT_GAP = 8;
const CORRIDOR_X = 360;
const CORRIDOR_W = 50;
const RIGHT_COL_X = 430;
const RIGHT_ROOM_W = 150;
const RIGHT_ROOM_H = 80;
const RIGHT_GAP = 8;
const START_Y = 60;
const CENTERED_LAYOUT_MIN_X = LEFT_COL_X;
const CENTERED_LAYOUT_TOLERANCE_X = 20;
const CENTERED_LAYOUT_TOLERANCE_Y = GRID;
const DEFAULT_ROOM_AREA_SQM = 25;
const AREA_SCALE = Math.sqrt((RIGHT_ROOM_W * RIGHT_ROOM_H) / DEFAULT_ROOM_AREA_SQM);
const MIN_ROOM_SIZE = 60;
const MAX_ROOM_SIZE = 400;
const BLOCK_TYPES = {
  STAIR: { label: "Cầu thang", width: 80, height: 80 },
  CORRIDOR: { label: "Hành lang", width: 50, height: 200 },
  PARKING: { label: "Nhà để xe", width: 160, height: 120 },
  LAUNDRY: { label: "Giặt phơi", width: 120, height: 100 },
};

function areaFromSize(width, height) {
  const area = (Number(width) / AREA_SCALE) * (Number(height) / AREA_SCALE);
  return Number.isFinite(area) ? Number(area.toFixed(1)) : DEFAULT_ROOM_AREA_SQM;
}

function roomPriceValue(room) {
  const parsed = Number(valueOf(room, "listedPrice", "listed_price", "price"));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function parseMoneyValue(value) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  if (!digits) return 0;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampRoomSize(size) {
  return {
    width: Math.min(MAX_ROOM_SIZE, Math.max(MIN_ROOM_SIZE, size.width)),
    height: Math.min(MAX_ROOM_SIZE, Math.max(MIN_ROOM_SIZE, size.height)),
  };
}

function computeSizeFromArea(areaSqm, orientation, currentWidth, currentHeight) {
  const vertical = orientation === "north" || orientation === "south";
  const currentRatio = Number(currentWidth) > 0 && Number(currentHeight) > 0
    ? Number(currentWidth) / Number(currentHeight)
    : null;
  const targetRatio = currentRatio ?? (vertical ? 0.75 / 1.25 : 1.25 / 0.75);
  const hMeters = Math.sqrt(areaSqm / targetRatio);
  const wMeters = areaSqm / hMeters;
  return clampRoomSize({
    width: Math.round(wMeters * AREA_SCALE),
    height: Math.round(hMeters * AREA_SCALE),
  });
}

function featurePosition(feature, room) {
  const offset = Math.min(0.96, Math.max(0.04, Number(feature.offset) || 0.5));
  if (feature.wall === "top") return { left: offset * room.width - 7, top: -7 };
  if (feature.wall === "bottom") return { left: offset * room.width - 7, top: room.height - 7 };
  if (feature.wall === "right") return { left: room.width - 7, top: offset * room.height - 7 };
  return { left: -7, top: offset * room.height - 7 };
}

function sortRoomsByOrder(rooms) {
  return [...rooms].sort((a, b) =>
    (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
  );
}

function roomBox(room, index) {
  const area = Number(room.areaM2 ?? 0);
  const width = Math.max(120, Math.min(220, Math.round(Math.sqrt(Math.max(area, 12)) * 22)));
  const height = Math.max(90, Math.round((Math.max(area, 12) * 400) / width));
  const orientation = normalizeOrientation(room.orientation, width, height);
  return {
    ...room,
    x: Number(room.positionX ?? 30 + (index % 5) * 180),
    y: Number(room.positionY ?? 30 + Math.floor(index / 5) * 150),
    width,
    height,
    orientation,
    doors: Array.isArray(room.doors) ? room.doors : [],
    windows: Array.isArray(room.windows) ? room.windows : [],
    areaSqm: area || areaFromSize(width, height),
  };
}

function haiDangDefaultRoomSize(index) {
  return index < 2
    ? { width: LEFT_ROOM_W, height: LEFT_ROOM_H }
    : { width: RIGHT_ROOM_W, height: RIGHT_ROOM_H };
}

function createHaiDangDefaultBlocks(rooms, floorId) {
  const leftTotalH = LEFT_ROOM_H * Math.min(2, rooms.length) + LEFT_GAP;
  const rightCount = Math.max(0, rooms.length - 2);
  const rightTotalH = rightCount > 0 ? RIGHT_ROOM_H * rightCount + RIGHT_GAP * Math.max(0, rightCount - 1) : 0;
  const corridorH = Math.max(leftTotalH, rightTotalH, 200);
  return [
    { id: "corridor-default-" + floorId, type: "CORRIDOR", x: CORRIDOR_X, y: START_Y, width: CORRIDOR_W, height: corridorH },
    { id: "stair-default-" + floorId, type: "STAIR", x: LEFT_COL_X, y: START_Y + leftTotalH + 28, width: 80, height: 80 },
  ];
}

function valueOf(source, ...keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) return source[key];
  }
  return undefined;
}

function metadataOf(item) {
  const metadata = valueOf(item, "metadata", "metadataJson");
  return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
}

function blockIdFromSavedItem(item, index) {
  return `block-${valueOf(item, "id") ?? valueOf(item, "type", "itemType") ?? index}`;
}

function layoutFromSavedItems(floor, savedItems) {
  const roomById = new Map((floor.rooms ?? []).map((room) => [String(room.id), room]));
  const rooms = [];
  const blocks = [];

  savedItems.forEach((item, index) => {
    const itemType = String(valueOf(item, "type", "itemType") ?? "").toUpperCase();
    const metadata = metadataOf(item);
    const width = Number(valueOf(item, "width")) || RIGHT_ROOM_W;
    const height = Number(valueOf(item, "height")) || RIGHT_ROOM_H;
    const base = {
      x: Number(valueOf(item, "positionX", "x")) || 0,
      y: Number(valueOf(item, "positionY", "y")) || 0,
      width,
      height,
      orientation: normalizeOrientation(metadata.orientation, width, height),
      sortOrder: Number(metadata.sortOrder ?? valueOf(item, "sortOrder") ?? index),
    };

    if (itemType === "ROOM") {
      const room = roomById.get(String(valueOf(item, "roomId")));
      if (!room) return;
      rooms.push({
        ...room,
        ...base,
        doors: Array.isArray(metadata.doors) ? metadata.doors : [],
        windows: Array.isArray(metadata.windows) ? metadata.windows : [],
        areaSqm: Number(metadata.areaSqm ?? valueOf(item, "area")) || areaFromSize(width, height),
        listedPrice: Number(metadata.listedPrice ?? room.listedPrice ?? room.listed_price) || 0,
      });
      return;
    }

    blocks.push({
      ...base,
      id: blockIdFromSavedItem(item, index),
      persistedId: valueOf(item, "id"),
      type: itemType || "UTILITY",
      label: metadata.label ?? valueOf(item, "label") ?? BLOCK_TYPES[itemType]?.label ?? itemType,
    });
  });

  return { rooms, blocks };
}

function floorPlanItemsFromState(rooms, blocks) {
  const roomItems = rooms.map((room, index) => ({
    type: "ROOM",
    roomId: room.id,
    positionX: Math.round(Number(room.x) || 0),
    positionY: Math.round(Number(room.y) || 0),
    width: Math.round(Number(room.width) || RIGHT_ROOM_W),
    height: Math.round(Number(room.height) || RIGHT_ROOM_H),
    metadata: {
      label: room.roomCode ?? room.name ?? "",
      rotation: 0,
      sortOrder: index,
      orientation: normalizeOrientation(room.orientation, room.width, room.height),
      areaSqm: areaFromSize(room.width, room.height),
      listedPrice: roomPriceValue(room),
      doors: Array.isArray(room.doors) ? room.doors : [],
      windows: Array.isArray(room.windows) ? room.windows : [],
    },
  }));

  const blockItems = blocks.map((block, index) => ({
    type: block.type,
    positionX: Math.round(Number(block.x) || 0),
    positionY: Math.round(Number(block.y) || 0),
    width: Math.round(Number(block.width) || BLOCK_TYPES[block.type]?.width || 80),
    height: Math.round(Number(block.height) || BLOCK_TYPES[block.type]?.height || 80),
    metadata: {
      label: block.label ?? BLOCK_TYPES[block.type]?.label ?? block.type,
      rotation: 0,
      sortOrder: roomItems.length + index,
      orientation: normalizeOrientation(block.orientation, block.width, block.height),
    },
  }));

  return [...roomItems, ...blockItems];
}

function numberFromCode(code) {
  const digits = String(code ?? "").match(/\d+/g)?.join("");
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

function floorNumber(floor) {
  const explicit = Number(floor?.sortOrder);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const fromName = numberFromCode(floor?.name);
  return fromName || 1;
}

function nextRoomCode(floor, rooms) {
  const existingNumbers = new Set(
    rooms
      .map((room) => numberFromCode(room.roomCode ?? room.name))
      .filter((value) => value > 0),
  );
  const baseNumber = floorNumber(floor) * 100;
  let candidate = baseNumber + 1;
  while (existingNumbers.has(candidate)) candidate += 1;
  return String(candidate);
}

function nextFloorNumber(floors) {
  const existingNumbers = new Set((floors ?? []).map(floorNumber).filter((value) => value > 0));
  let candidate = 1;
  while (existingNumbers.has(candidate)) candidate += 1;
  return candidate;
}

function nextRoomPosition(rooms) {
  if (!rooms.length) return { x: LEFT_COL_X, y: START_Y };
  const maxBottom = rooms.reduce((max, room) => {
    const y = Number(room.y ?? 0);
    const height = Number(room.height ?? RIGHT_ROOM_H);
    return Math.max(max, y + height);
  }, START_Y);

  return {
    x: RIGHT_COL_X,
    y: Math.ceil((maxBottom + RIGHT_GAP) / GRID) * GRID,
  };
}

function normalizeLayoutPosition(rooms, blocks) {
  const items = [...rooms, ...blocks];
  if (!items.length) return { rooms, blocks };

  const minX = Math.min(...items.map((item) => Number(item.x ?? 0)).filter(Number.isFinite));
  const minY = Math.min(...items.map((item) => Number(item.y ?? 0)).filter(Number.isFinite));
  const deltaX = Number.isFinite(minX) && minX < CENTERED_LAYOUT_MIN_X - CENTERED_LAYOUT_TOLERANCE_X
    ? CENTERED_LAYOUT_MIN_X - minX
    : 0;
  const deltaY = Number.isFinite(minY) && minY < START_Y - CENTERED_LAYOUT_TOLERANCE_Y
    ? START_Y - minY
    : 0;

  if (!deltaX && !deltaY) {
    return { rooms, blocks };
  }

  const shift = (item) => ({
    ...item,
    x: Math.round((Number(item.x ?? 0) + deltaX) / GRID) * GRID,
    y: Math.round((Number(item.y ?? 0) + deltaY) / GRID) * GRID,
  });
  return {
    rooms: rooms.map(shift),
    blocks: blocks.map(shift),
  };
}

function cloneRoomLayout(room) {
  return {
    ...room,
    doors: Array.isArray(room.doors) ? room.doors.map((door) => ({ ...door })) : [],
    windows: Array.isArray(room.windows) ? room.windows.map((window) => ({ ...window })) : [],
  };
}

function cloneBlockLayout(block) {
  return { ...block };
}

function layoutSnapshot(floorId, rooms, blocks) {
  return {
    floorId: String(floorId || ""),
    rooms: (rooms ?? []).map(cloneRoomLayout),
    blocks: (blocks ?? []).map(cloneBlockLayout),
  };
}

function sameSnapshot(left, right) {
  if (!left || !right) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

function clampZoom(value) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value) || 1));
}

function PreviewPanel({ rooms, blocks, onClose }) {
  return (
    <div data-editor-ui="true" className="absolute inset-6 z-40 overflow-auto rounded-3xl border bg-[#e9e9e9] p-6 shadow-2xl">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white dark:bg-[#0f172a] p-2 shadow"><X className="h-4 w-4" /></button>
      <h2 className="mb-4 text-lg font-black text-slate-950">Xem trước sơ đồ</h2>
      <div className="relative min-h-[720px] min-w-[1100px] rounded-2xl bg-white/50">
        {blocks.map((block) => (
          <div key={block.id} className="group absolute" style={{ left: block.x, top: block.y, width: block.width, height: block.height }}>
            <FloorPlanItem item={{ ...block, label: BLOCK_TYPES[block.type]?.label }} />
          </div>
        ))}
        {rooms.map((room) => (
          <div key={room.id} className="group absolute" style={{ left: room.x, top: room.y, width: room.width, height: room.height }}>
            <FloorPlanItem item={{ ...room, type: "ROOM" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolbarButton({ children, onClick, title, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      title={title}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      disabled={disabled}
      className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-black text-white transition disabled:opacity-50 ${
        danger ? "hover:bg-rose-500/80" : "hover:bg-white/15"
      }`}
    >
      {children}
    </button>
  );
}

function FloatingToolbar({
  item,
  isRoom,
  placementMode,
  areaInputValue,
  priceInputValue,
  onAreaInputChange,
  onPriceInputChange,
  onAreaSubmit,
  onPriceSubmit,
  onRotate,
  onStartPlacement,
  onFinishPlacement,
  onCancelPlacement,
  onDelete,
}) {
  const type = String(item?.type ?? "ROOM").toUpperCase();
  const canRotate = isRoom || type === "CORRIDOR" || type === "STAIR";

  return (
    <div
      className="absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-[calc(100%+8px)] items-center gap-1 overflow-x-auto whitespace-nowrap rounded-[10px] bg-slate-950/90 px-2 py-1 text-white shadow-xl"
      style={{ maxWidth: "calc(100vw - 2rem)" }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {placementMode ? (
        <>
          <ToolbarButton onClick={onFinishPlacement} title="Xong">
            <Check className="h-4 w-4" /> Xong đặt {placementMode === "door" ? "cửa" : "cửa sổ"}
          </ToolbarButton>
          <ToolbarButton onClick={onCancelPlacement} title="Hủy" danger>
            <X className="h-4 w-4" /> Hủy
          </ToolbarButton>
        </>
      ) : (
        <>
          <ToolbarButton onClick={onRotate} title="Xoay" disabled={!canRotate}>
            <RotateCw className="h-4 w-4" /> Xoay
          </ToolbarButton>
          {isRoom && (
            <>
              <ToolbarButton onClick={() => onStartPlacement("door")} title="Thêm cửa">
                <DoorOpen className="h-4 w-4" /> + Cửa
              </ToolbarButton>
              <ToolbarButton onClick={() => onStartPlacement("window")} title="Thêm cửa sổ">
                <Plus className="h-4 w-4" /> Cửa sổ
              </ToolbarButton>
              <span className="mx-1 h-5 w-px bg-white/25" />
              <form
                className="flex items-center gap-1"
                onSubmit={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onAreaSubmit();
                }}
              >
                <input
                  type="number"
                  min="4"
                  max="200"
                  step="0.1"
                  value={areaInputValue}
                  onChange={(event) => onAreaInputChange(event.target.value)}
                  className="h-8 w-14 rounded-md border border-white/20 bg-white/95 px-2 text-xs font-black text-slate-950 outline-none"
                />
                <span className="text-xs font-bold">m²</span>
                <button type="submit" className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/15" title="Áp dụng">
                  <Check className="h-4 w-4" />
                </button>
              </form>
              <form
                className="flex items-center gap-1"
                onSubmit={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onPriceSubmit();
                }}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceInputValue}
                  onChange={(event) => onPriceInputChange(event.target.value)}
                  placeholder="Giá thuê"
                  className="h-8 w-36 rounded-md border border-white/20 bg-white/95 px-2 text-xs font-semibold text-slate-950 outline-none"
                />
                <span className="text-xs font-bold">VNĐ/tháng</span>
                <button type="submit" className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/15" title="Áp dụng giá thuê">
                  <Check className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
          <span className="mx-1 h-5 w-px bg-white/25" />
          <ToolbarButton onClick={onDelete} title="Xóa" danger>
            <Trash2 className="h-4 w-4" />
          </ToolbarButton>
        </>
      )}
    </div>
  );
}

function RoomPlacementZones({ mode, onPlace }) {
  const label = mode === "door" ? "Đặt cửa" : "Đặt cửa sổ";
  const baseClass = "absolute z-20 bg-blue-500/0 transition hover:bg-blue-500/10";
  const edgeClass = "after:absolute after:bg-blue-600 after:opacity-0 after:transition hover:after:opacity-100";

  return (
    <>
      <button type="button" aria-label={`${label} cạnh trên`} onClick={(event) => onPlace(event, "top")} className={`${baseClass} ${edgeClass} inset-x-0 top-0 h-4 after:inset-x-0 after:top-0 after:h-[3px]`} />
      <button type="button" aria-label={`${label} cạnh dưới`} onClick={(event) => onPlace(event, "bottom")} className={`${baseClass} ${edgeClass} inset-x-0 bottom-0 h-4 after:inset-x-0 after:bottom-0 after:h-[3px]`} />
      <button type="button" aria-label={`${label} cạnh trái`} onClick={(event) => onPlace(event, "left")} className={`${baseClass} ${edgeClass} inset-y-0 left-0 w-4 after:inset-y-0 after:left-0 after:w-[3px]`} />
      <button type="button" aria-label={`${label} cạnh phải`} onClick={(event) => onPlace(event, "right")} className={`${baseClass} ${edgeClass} inset-y-0 right-0 w-4 after:inset-y-0 after:right-0 after:w-[3px]`} />
    </>
  );
}

function OpeningDeleteButtons({ room, onRemove }) {
  const openings = [
    ...(room.doors ?? []).map((item) => ({ ...item, key: "doors" })),
    ...(room.windows ?? []).map((item) => ({ ...item, key: "windows" })),
  ];

  return openings.map((opening) => {
    const position = featurePosition(opening, room);
    return (
      <button
        key={`${opening.key}-${opening.id}`}
        type="button"
        aria-label="Xóa cửa"
        onClick={(event) => {
          event.stopPropagation();
          onRemove(room.id, opening.key, opening.id);
        }}
        className="absolute z-30 hidden h-4 w-4 place-items-center rounded-full bg-rose-600 text-[10px] font-black text-white shadow group-hover:grid"
        style={position}
      >
        ×
      </button>
    );
  });
}

export function FacilityFloorPlanDesigner({ propertyId }) {
  const router = useRouter();
  const canvasViewportRef = useRef(null);
  const panStartRef = useRef(null);
  const hasPannedRef = useRef(false);
  const openingSequenceRef = useRef(0);
  const undoLayoutRef = useRef(null);
  const redoLayoutRef = useRef(null);
  const IS_HAI_DANG_1 = String(propertyId) === "1";
  const [data, setData] = useState(null);
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [layouts, setLayouts] = useState({});
  const [blocksByFloor, setBlocksByFloor] = useState({});
  const [canvasView, setCanvasView] = useState({ x: 80, y: 60, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [history, setHistory] = useState({ past: [], future: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingFloor, setAddingFloor] = useState(false);
  const [deletingFloor, setDeletingFloor] = useState(false);
  const [addingRoom, setAddingRoom] = useState(false);
  const [resettingLayout, setResettingLayout] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [placementMode, setPlacementMode] = useState(null);
  const [placementTargetId, setPlacementTargetId] = useState(null);
  const [areaInputValue, setAreaInputValue] = useState("");
  const [priceInputValue, setPriceInputValue] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [floorDeleteConfirmOpen, setFloorDeleteConfirmOpen] = useState(false);

  const applyLayout = (rooms, floorId, { forceDefault = false } = {}) => {
    const sorted = sortRoomsByOrder(rooms);
    const hasSavedPositions = !forceDefault && sorted.some((room) => Number(room.positionX ?? 0) > 0);
    if (hasSavedPositions || !IS_HAI_DANG_1) {
      return sorted.map((room, index) => {
        const boxed = roomBox(room, index);
        const sized = IS_HAI_DANG_1
          ? {
            ...boxed,
            ...haiDangDefaultRoomSize(index),
            areaM2: DEFAULT_ROOM_AREA_SQM,
                       areaSqm: DEFAULT_ROOM_AREA_SQM,
          }
          : boxed;
        return sized;
      });
    }

    return sorted.map((room, index) => {
      const size = haiDangDefaultRoomSize(index);
      if (index < 2) {
        return { ...room, x: LEFT_COL_X, y: START_Y + index * (LEFT_ROOM_H + LEFT_GAP), ...size };
      }
      const rightIndex = index - 2;
      return { ...room, x: RIGHT_COL_X, y: START_Y + rightIndex * (RIGHT_ROOM_H + RIGHT_GAP), ...size };
    }).map((room) => {
      const normalized = {
        ...room,
        orientation: normalizeOrientation(room.orientation, room.width, room.height),
        doors: Array.isArray(room.doors) ? room.doors : [],
        windows: Array.isArray(room.windows) ? room.windows : [],
        areaM2: DEFAULT_ROOM_AREA_SQM,
               areaSqm: DEFAULT_ROOM_AREA_SQM,
      };
      return normalized;
    });
  };

  const defaultBlocksFor = (rooms, floorId) => IS_HAI_DANG_1 ? createHaiDangDefaultBlocks(rooms, floorId) : [];

  const resetCurrentLayout = async () => {
    const floor = data?.floors?.find((item) => String(item.id) === String(selectedFloorId));
    if (!floor || !IS_HAI_DANG_1) return;
    setNotice("");
    setError("");
    const defaultRooms = applyLayout(floor.rooms, selectedFloorId, { forceDefault: true });
    const defaultBlocks = defaultBlocksFor(defaultRooms, selectedFloorId);
    const { rooms: nextRooms, blocks: nextBlocks } = normalizeLayoutPosition(defaultRooms, defaultBlocks);
    recordHistory();
    setLayouts((current) => ({ ...current, [selectedFloorId]: nextRooms }));
    setBlocksByFloor((current) => ({ ...current, [selectedFloorId]: nextBlocks }));
    setSelectedItemId("");
    setPlacementMode(null);
    setPlacementTargetId(null);
    setAreaInputValue("");
    setPriceInputValue("");
    setResettingLayout(true);
    setHasUnsavedChanges(true);
    try {
      const response = await saveAdminFloorPlan(propertyId, selectedFloorId, floorPlanItemsFromState(nextRooms, nextBlocks));
      const rawSavedLayout = layoutFromSavedItems(floor, response.items ?? response?.data?.items ?? []);
      const savedLayout = normalizeLayoutPosition(rawSavedLayout.rooms, rawSavedLayout.blocks);
      setLayouts((current) => ({ ...current, [selectedFloorId]: savedLayout.rooms.length ? savedLayout.rooms : nextRooms }));
      setBlocksByFloor((current) => ({ ...current, [selectedFloorId]: savedLayout.blocks.length ? savedLayout.blocks : nextBlocks }));
      setHasUnsavedChanges(false);
      setNotice("Đã đặt lại và lưu bố cục mặc định.");
    } catch (resetError) {
      setError(resetError?.message || "Đã đặt lại trên màn hình, nhưng chưa lưu được bố cục.");
    } finally {
      setResettingLayout(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchFloorPlanDesignerData(propertyId)
      .then(async (result) => {
        if (!active) return;
        const savedLayouts = await Promise.all(result.floors.map(async (floor) => {
          const floorId = String(floor.id);
          const floorPlan = await fetchAdminFloorPlan(propertyId, floorId);
          const savedItems = floorPlan.items ?? [];
          if (savedItems.length) {
            const rawSavedLayout = layoutFromSavedItems(floor, savedItems);
            const savedLayout = normalizeLayoutPosition(rawSavedLayout.rooms, rawSavedLayout.blocks);
            return [floorId, savedLayout.rooms, savedLayout.blocks];
          }
          const defaultRooms = applyLayout(floor.rooms, floorId);
          const defaultBlocks = defaultBlocksFor(defaultRooms, floorId);
          const { rooms, blocks } = normalizeLayoutPosition(defaultRooms, defaultBlocks);
          return [floorId, rooms, blocks];
        }));
        if (!active) return;
        setData(result);
        const firstFloor = result.floors[0];
        setSelectedFloorId(firstFloor ? String(firstFloor.id) : "");
        setLayouts(Object.fromEntries(savedLayouts.map(([floorId, rooms]) => [floorId, rooms])));
        setBlocksByFloor(Object.fromEntries(savedLayouts.map(([floorId, _, blocks]) => [floorId, blocks])));
        setHasUnsavedChanges(false);
        setHistory({ past: [], future: [] });
      })
      .catch((loadError) => active && setError(loadError?.message || "Không thể tải sơ đồ tầng."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, reloadKey]);

  const currentRooms = useMemo(() => layouts[selectedFloorId] || [], [layouts, selectedFloorId]);
  const currentBlocks = useMemo(() => blocksByFloor[selectedFloorId] || [], [blocksByFloor, selectedFloorId]);
  const selectedFloor = useMemo(
    () => data?.floors?.find((floor) => String(floor.id) === String(selectedFloorId)) ?? null,
    [data?.floors, selectedFloorId],
  );
  const selectedRoom = useMemo(
    () => currentRooms.find((room) => String(room.id) === String(selectedItemId)) ?? null,
    [currentRooms, selectedItemId],
  );
  const selectedBlock = useMemo(
    () => currentBlocks.find((block) => String(block.id) === String(selectedItemId)) ?? null,
    [currentBlocks, selectedItemId],
  );
  const placementActive = placementMode && placementTargetId;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const recordHistory = (rooms = currentRooms, blocks = currentBlocks) => {
    if (!selectedFloorId) return;
    const snapshot = layoutSnapshot(selectedFloorId, rooms, blocks);
    setHistory((current) => {
      const last = current.past[current.past.length - 1];
      if (sameSnapshot(last, snapshot)) return current;
      return {
        past: [...current.past.slice(-(HISTORY_LIMIT - 1)), snapshot],
        future: [],
      };
    });
  };

  const clearSelection = () => {
    setSelectedItemId("");
    setPlacementMode(null);
    setPlacementTargetId(null);
    setAreaInputValue("");
    setPriceInputValue("");
  };

  const syncSelectionAfterRestore = (snapshot) => {
    const item =
      snapshot.rooms.find((room) => String(room.id) === String(selectedItemId)) ??
      snapshot.blocks.find((block) => String(block.id) === String(selectedItemId));

    if (!item) {
      clearSelection();
      return;
    }

    if (snapshot.rooms.some((room) => String(room.id) === String(item.id))) {
      setAreaInputValue(areaFromSize(item.width, item.height));
      setPriceInputValue(roomPriceValue(item) ? String(roomPriceValue(item)) : "");
      return;
    }

    setAreaInputValue("");
    setPriceInputValue("");
  };

  const restoreSnapshot = (snapshot) => {
    setSelectedFloorId(snapshot.floorId);
    setLayouts((current) => ({ ...current, [snapshot.floorId]: snapshot.rooms.map(cloneRoomLayout) }));
    setBlocksByFloor((current) => ({ ...current, [snapshot.floorId]: snapshot.blocks.map(cloneBlockLayout) }));
    syncSelectionAfterRestore(snapshot);
    setPlacementMode(null);
    setPlacementTargetId(null);
    setHasUnsavedChanges(true);
    setNotice("");
    setError("");
  };

  const undoLayout = () => {
    if (!canUndo) return;
    const previous = history.past[history.past.length - 1];
    const current = layoutSnapshot(selectedFloorId, currentRooms, currentBlocks);
    restoreSnapshot(previous);
    setHistory({
      past: history.past.slice(0, -1),
      future: [current, ...history.future].slice(0, HISTORY_LIMIT),
    });
  };

  const redoLayout = () => {
    if (!canRedo) return;
    const next = history.future[0];
    const current = layoutSnapshot(selectedFloorId, currentRooms, currentBlocks);
    restoreSnapshot(next);
    setHistory({
      past: [...history.past, current].slice(-HISTORY_LIMIT),
      future: history.future.slice(1),
    });
  };

  useEffect(() => {
    undoLayoutRef.current = undoLayout;
    redoLayoutRef.current = redoLayout;
  });

  const zoomCanvas = (nextZoom, anchorClientX, anchorClientY) => {
    const viewport = canvasViewportRef.current;
    setCanvasView((current) => {
      const zoom = clampZoom(nextZoom);
      if (!viewport || zoom === current.zoom) return { ...current, zoom };
      const rect = viewport.getBoundingClientRect();
      const anchorX = Number.isFinite(anchorClientX) ? anchorClientX : rect.left + rect.width / 2;
      const anchorY = Number.isFinite(anchorClientY) ? anchorClientY : rect.top + rect.height / 2;
      const localX = anchorX - rect.left;
      const localY = anchorY - rect.top;
      const worldX = (localX - current.x) / current.zoom;
      const worldY = (localY - current.y) / current.zoom;
      return {
        x: localX - worldX * zoom,
        y: localY - worldY * zoom,
        zoom,
      };
    });
  };

  const resetCanvasView = () => {
    setCanvasView({ x: 80, y: 60, zoom: 1 });
  };

  const shouldIgnoreCanvasGesture = (target) =>
    Boolean(target?.closest?.("button,input,textarea,select,[data-floor-item='true'],[data-editor-ui='true']"));

  const handleCanvasPointerDown = (event) => {
    if (event.button !== 0 && event.button !== 1) return;
    if (shouldIgnoreCanvasGesture(event.target)) return;
    event.preventDefault();
    hasPannedRef.current = false;
    panStartRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      view: canvasView,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsPanning(true);
  };

  const handleCanvasPointerMove = (event) => {
    const panStart = panStartRef.current;
    if (!panStart) return;
    const deltaX = event.clientX - panStart.clientX;
    const deltaY = event.clientY - panStart.clientY;
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      panStart.moved = true;
      hasPannedRef.current = true;
    }
    setCanvasView({
      ...panStart.view,
      x: panStart.view.x + deltaX,
      y: panStart.view.y + deltaY,
    });
  };

  const handleCanvasPointerUp = (event) => {
    if (!panStartRef.current) return;
    if (event.currentTarget.hasPointerCapture?.(panStartRef.current.pointerId)) {
      event.currentTarget.releasePointerCapture(panStartRef.current.pointerId);
    }
    panStartRef.current = null;
    setIsPanning(false);
  };

  const handleCanvasWheel = (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    zoomCanvas(canvasView.zoom + direction * ZOOM_STEP, event.clientX, event.clientY);
  };

  const updatePosition = (roomId, position) => {
    const nextRooms = currentRooms.map((room) => room.id === roomId ? { ...room, ...position } : room);
    if (sameSnapshot(layoutSnapshot(selectedFloorId, currentRooms, currentBlocks), layoutSnapshot(selectedFloorId, nextRooms, currentBlocks))) return;
    recordHistory();
    setLayouts((current) => ({ ...current, [selectedFloorId]: nextRooms }));
    setHasUnsavedChanges(true);
  };

  const updateRoom = (roomId, patch) => {
    const nextRooms = currentRooms.map((room) =>
      String(room.id) === String(roomId) ? { ...room, ...patch } : room
    );
    if (sameSnapshot(layoutSnapshot(selectedFloorId, currentRooms, currentBlocks), layoutSnapshot(selectedFloorId, nextRooms, currentBlocks))) return;
    recordHistory();
    setLayouts((current) => ({
      ...current,
      [selectedFloorId]: nextRooms,
    }));
    setHasUnsavedChanges(true);
  };

  const selectItem = (item) => {
    setSelectedItemId(item.id);
    setPlacementMode(null);
    setPlacementTargetId(null);
    if (String(item.type ?? "ROOM").toUpperCase() === "ROOM") {
      setAreaInputValue(areaFromSize(item.width, item.height));
      setPriceInputValue(roomPriceValue(item) ? String(roomPriceValue(item)) : "");
    } else {
      setAreaInputValue("");
      setPriceInputValue("");
    }
  };

  const changeFloor = (floorId) => {
    setSelectedFloorId(floorId);
    setSelectedItemId("");
    setPlacementMode(null);
    setPlacementTargetId(null);
    setAreaInputValue("");
    setPriceInputValue("");
    setFloorDeleteConfirmOpen(false);
    setHistory({ past: [], future: [] });
    resetCanvasView();
  };

  const addFloor = async () => {
    const floors = data?.floors ?? [];
    const nextOrder = nextFloorNumber(floors);
    const floorCode = `F${nextOrder}`;
    const floorName = `Tầng ${nextOrder}`;

    setAddingFloor(true);
    setError("");
    setNotice("");
    try {
      const createdFloor = await createFloor({
        propertyId,
        floorCode,
        name: floorName,
        sortOrder: nextOrder,
      });
      const nextFloor = { ...createdFloor, rooms: [] };
      const nextFloorId = String(createdFloor.id);

      setData((current) => ({
        ...current,
        floors: [...(current?.floors ?? []), nextFloor].sort((left, right) => floorNumber(left) - floorNumber(right)),
      }));
      setLayouts((current) => ({ ...current, [nextFloorId]: [] }));
      setBlocksByFloor((current) => ({ ...current, [nextFloorId]: defaultBlocksFor([], nextFloorId) }));
      setSelectedFloorId(nextFloorId);
      setSelectedItemId("");
      setPlacementMode(null);
      setPlacementTargetId(null);
      setAreaInputValue("");
      setPriceInputValue("");
      setHasUnsavedChanges(false);
      setHistory({ past: [], future: [] });
      resetCanvasView();
      setNotice(`Đã thêm ${nextFloor.name ?? floorName}.`);
    } catch (createError) {
      setError(createError?.message || "Không thể thêm tầng mới.");
    } finally {
      setAddingFloor(false);
    }
  };

  const requestDeleteCurrentFloor = () => {
    if (!selectedFloor) return;
    setNotice("");
    setError("");
    if ((data?.floors ?? []).length <= 1) {
      setError("Cần giữ lại ít nhất một tầng cho cơ sở này.");
      return;
    }
    setFloorDeleteConfirmOpen(true);
  };

  const deleteCurrentFloor = async () => {
    if (!selectedFloor) return;
    const floors = data?.floors ?? [];
    const currentIndex = floors.findIndex((floor) => String(floor.id) === String(selectedFloorId));
    const fallbackFloor = floors[currentIndex + 1] ?? floors[currentIndex - 1] ?? null;

    setDeletingFloor(true);
    setNotice("");
    setError("");
    try {
      await deleteFloorRequest(selectedFloorId);
      setData((current) => ({
        ...current,
        floors: (current?.floors ?? []).filter((floor) => String(floor.id) !== String(selectedFloorId)),
      }));
      setLayouts((current) => {
        const next = { ...current };
        delete next[selectedFloorId];
        return next;
      });
      setBlocksByFloor((current) => {
        const next = { ...current };
        delete next[selectedFloorId];
        return next;
      });
      setSelectedFloorId(fallbackFloor ? String(fallbackFloor.id) : "");
      setSelectedItemId("");
      setPlacementMode(null);
      setPlacementTargetId(null);
      setAreaInputValue("");
      setPriceInputValue("");
      setHasUnsavedChanges(false);
      setFloorDeleteConfirmOpen(false);
      setHistory({ past: [], future: [] });
      resetCanvasView();
      setNotice(`Đã xóa ${selectedFloor.name}.`);
    } catch (deleteError) {
      setError(deleteError?.message || "Không thể xóa tầng.");
    } finally {
      setDeletingFloor(false);
    }
  };

  const updateBlock = (blockId, patch) => {
    const nextBlocks = currentBlocks.map((block) => block.id === blockId ? { ...block, ...patch } : block);
    if (sameSnapshot(layoutSnapshot(selectedFloorId, currentRooms, currentBlocks), layoutSnapshot(selectedFloorId, currentRooms, nextBlocks))) return;
    recordHistory();
    setBlocksByFloor((current) => ({ ...current, [selectedFloorId]: nextBlocks }));
    setHasUnsavedChanges(true);
  };

  const updateBlockLive = (blockId, patch) => {
    setBlocksByFloor((current) => ({
      ...current,
      [selectedFloorId]: (current[selectedFloorId] ?? []).map((block) =>
        String(block.id) === String(blockId) ? { ...block, ...patch } : block
      ),
    }));
    setHasUnsavedChanges(true);
  };

  useEffect(() => {
    if (!placementMode) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setPlacementMode(null);
        setPlacementTargetId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [placementMode]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.target?.closest?.("input,textarea,select,[contenteditable='true']")) return;

      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undoLayoutRef.current?.();
        return;
      }
      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redoLayoutRef.current?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const rotateSelectedItem = () => {
    if (selectedRoom) {
      const orientation = nextOrientationFor("ROOM", selectedRoom.orientation);
      const nextSize = clampRoomSize({ width: selectedRoom.height, height: selectedRoom.width });
      updateRoom(selectedRoom.id, {
        orientation,
        ...nextSize,
        areaSqm: areaFromSize(nextSize.width, nextSize.height),
      });
      setAreaInputValue(areaFromSize(nextSize.width, nextSize.height));
      return;
    }
    if (!selectedBlock || selectedBlock.type === "PARKING" || selectedBlock.type === "LAUNDRY") return;
    updateBlock(selectedBlock.id, { orientation: nextOrientationFor(selectedBlock.type, selectedBlock.orientation) });
  };

  const startPlacement = (mode) => {
    if (!selectedRoom) return;
    setPlacementMode(mode);
    setPlacementTargetId(selectedRoom.id);
  };

  const finishPlacement = () => {
    setPlacementMode(null);
    setPlacementTargetId(null);
  };

  const placeOpening = (event, wall) => {
    if (!placementMode || !selectedRoom) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const rawOffset = wall === "top" || wall === "bottom"
      ? (event.clientX - rect.left) / rect.width
      : (event.clientY - rect.top) / rect.height;
    const offset = Math.min(0.96, Math.max(0.04, Number(rawOffset.toFixed(3))));
    const key = placementMode === "door" ? "doors" : "windows";
    openingSequenceRef.current += 1;
    const nextFeature = { id: `${placementMode}-${selectedRoom.id}-${openingSequenceRef.current}`, wall, offset };
    updateRoom(selectedRoom.id, { [key]: [...(selectedRoom[key] ?? []), nextFeature] });
  };

  const removeOpening = (roomId, key, openingId) => {
    const room = currentRooms.find((item) => String(item.id) === String(roomId));
    if (!room) return;
    updateRoom(roomId, { [key]: (room[key] ?? []).filter((item) => item.id !== openingId) });
  };

  const applyArea = () => {
    if (!selectedRoom) return;
    const parsed = Number(areaInputValue);
    if (!Number.isFinite(parsed)) return;
    const areaSqm = Math.min(200, Math.max(4, parsed));
    const nextSize = computeSizeFromArea(
      areaSqm,
      normalizeOrientation(selectedRoom.orientation, selectedRoom.width, selectedRoom.height),
      selectedRoom.width,
      selectedRoom.height,
    );
    const actualArea = areaFromSize(nextSize.width, nextSize.height);
    updateRoom(selectedRoom.id, { ...nextSize, areaSqm: actualArea, areaM2: actualArea });
    setAreaInputValue(actualArea);
  };

  const applyRoomPrice = () => {
    if (!selectedRoom) return;
    const price = parseMoneyValue(priceInputValue);
    updateRoom(selectedRoom.id, { listedPrice: price });
    setPriceInputValue(price ? String(price) : "");
    setNotice("Đã cập nhật giá thuê phòng. Bấm Lưu sơ đồ để lưu thay đổi.");
  };

  const removeSelectedItem = async () => {
    if (selectedRoom) {
      setError("");
      setNotice("");
      try {
        await deleteRoomRequest(selectedRoom.id);
        setData((current) => ({
          ...current,
          floors: (current?.floors ?? []).map((floor) =>
            String(floor.id) === String(selectedFloorId)
              ? { ...floor, rooms: (floor.rooms ?? []).filter((room) => String(room.id) !== String(selectedRoom.id)) }
              : floor
          ),
        }));
        setLayouts((current) => ({
          ...current,
          [selectedFloorId]: (current[selectedFloorId] ?? []).filter((room) => String(room.id) !== String(selectedRoom.id)),
        }));
        setHasUnsavedChanges(true);
        setSelectedItemId("");
        setPlacementMode(null);
        setPlacementTargetId(null);
        setAreaInputValue("");
        setPriceInputValue("");
        setHistory({ past: [], future: [] });
        setNotice(`Đã xóa phòng ${selectedRoom.roomCode ?? selectedRoom.room_code ?? selectedRoom.name}.`);
      } catch (deleteError) {
        setError(deleteError?.message || "Không thể xóa phòng.");
      }
      return;
    }
    if (selectedBlock) removeBlock(selectedBlock.id);
  };

  const addRoom = async () => {
    const floor = data?.floors?.find((item) => String(item.id) === String(selectedFloorId));
    if (!floor) {
      setError("Vui lòng chọn tầng trước khi thêm phòng.");
      return;
    }

    const roomCode = nextRoomCode(floor, currentRooms);
    const position = nextRoomPosition(currentRooms);
    const sortOrder = Math.max(0, ...currentRooms.map((room) => Number(room.sortOrder ?? 0))) + 1;

    setAddingRoom(true);
    setError("");
    setNotice("");
    try {
      const createdRoom = await createRoom({
        propertyId,
        floorId: floor.id,
        roomCode,
        name: roomCode,
        areaM2: DEFAULT_ROOM_AREA_SQM,
        listedPrice: 0,
        maxOccupants: 2,
        sortOrder,
      });
      const placedRoom = {
        ...createdRoom,
        x: position.x,
        y: position.y,
        width: RIGHT_ROOM_W,
        height: RIGHT_ROOM_H,
        orientation: normalizeOrientation(null, RIGHT_ROOM_W, RIGHT_ROOM_H),
        doors: [],
        windows: [],
        areaM2: DEFAULT_ROOM_AREA_SQM,
               areaSqm: DEFAULT_ROOM_AREA_SQM,
      };

      setData((current) => ({
        ...current,
        floors: current.floors.map((item) =>
          String(item.id) === String(selectedFloorId)
            ? { ...item, rooms: [...(item.rooms ?? []), createdRoom] }
            : item
        ),
      }));
      setLayouts((current) => ({
        ...current,
        [selectedFloorId]: [...(current[selectedFloorId] ?? []), placedRoom],
      }));
      setHasUnsavedChanges(true);
      setSelectedItemId(createdRoom.id);
      setAreaInputValue(areaFromSize(placedRoom.width, placedRoom.height));
      setPriceInputValue("");
      setHistory({ past: [], future: [] });
      setNotice(`Đã thêm phòng ${placedRoom.roomCode ?? placedRoom.room_code ?? roomCode}.`);
    } catch (createError) {
      setError(createError?.message || "Không thể thêm phòng mới.");
    } finally {
      setAddingRoom(false);
    }
  };

  const addBlock = (type) => {
    const meta = BLOCK_TYPES[type];
    const count = Object.values(blocksByFloor).flat().filter((block) => block.type === type).length + 1;
    const id = `${type.toLowerCase()}-${count}`;
    recordHistory();
    setBlocksByFloor((current) => ({ ...current, [selectedFloorId]: [...currentBlocks, { id, type, x: LEFT_COL_X, y: START_Y, width: meta.width, height: meta.height, orientation: "north" }] }));
    setHasUnsavedChanges(true);
  };

  const removeBlock = (blockId) => {
    recordHistory();
    setBlocksByFloor((current) => ({ ...current, [selectedFloorId]: currentBlocks.filter((block) => block.id !== blockId) }));
    setSelectedItemId((current) => current === blockId ? "" : current);
    setHasUnsavedChanges(true);
  };

  const alignCurrentRooms = () => {
    if (!selectedFloorId || !currentRooms.length) return;
    const alignedRooms = alignRoomItems(currentRooms, { gridSize: GRID, assumeAllRooms: true });
    if (sameSnapshot(layoutSnapshot(selectedFloorId, currentRooms, currentBlocks), layoutSnapshot(selectedFloorId, alignedRooms, currentBlocks))) return;
    recordHistory();
    setLayouts((current) => ({ ...current, [selectedFloorId]: alignedRooms }));
    setSelectedItemId("");
    setPlacementMode(null);
    setPlacementTargetId(null);
    setAreaInputValue("");
    setPriceInputValue("");
    setError("");
    setNotice("Đã căn thẳng các phòng. Bấm Lưu sơ đồ để lưu thay đổi.");
    setHasUnsavedChanges(true);
  };

  const save = async () => {
    const floor = data?.floors?.find((item) => String(item.id) === String(selectedFloorId));
    if (!floor) return;
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await saveAdminFloorPlan(
        propertyId,
        selectedFloorId,
        floorPlanItemsFromState(currentRooms, currentBlocks),
      );
      const rawSavedLayout = layoutFromSavedItems(floor, response.items ?? []);
      const savedLayout = normalizeLayoutPosition(rawSavedLayout.rooms, rawSavedLayout.blocks);
      if (savedLayout.rooms.length || savedLayout.blocks.length) {
        setLayouts((current) => ({ ...current, [selectedFloorId]: savedLayout.rooms }));
        setBlocksByFloor((current) => ({ ...current, [selectedFloorId]: savedLayout.blocks }));
      }
      setHasUnsavedChanges(false);
      setNotice("Đã lưu sơ đồ tầng.");
    } catch (saveError) {
      setError(saveError?.message || "Không thể lưu sơ đồ tầng.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="h-7 w-7 animate-spin" /></div>;
  if (error && !data) return <div className="grid min-h-[60vh] place-items-center text-center"><div><p className="font-bold text-rose-700 dark:text-rose-300">{error}</p><button onClick={() => { setLoading(true); setError(""); setReloadKey((v) => v + 1); }} className="mt-4 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-4 py-2 text-sm font-bold text-white">Thử lại</button></div></div>;

  return (
    <section className="fixed inset-0 z-50 flex flex-col bg-[#f8fafc] dark:bg-white/5">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b bg-white dark:bg-[#0f172a] px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => router.push("/dashboard/facilities")} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Quay lại"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0">
            <p className="text-xs text-slate-500">Cơ sở vật chất / {data?.property?.name} / Thiết kế sơ đồ tầng</p>
            <h1 className="truncate text-lg font-bold">Thiết kế sơ đồ tầng: {data?.property?.name}</h1>
            <p className="text-xs text-slate-500">Kéo thả để định vị phòng và khối tiện ích.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && <span className="text-xs font-bold text-amber-600 dark:text-yellow-300">Có thay đổi chưa lưu</span>}
          <button type="button" onClick={() => setPreviewOpen((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-bold"><Eye className="h-4 w-4" />Xem trước sơ đồ</button>
          <button
            type="button"
            onClick={alignCurrentRooms}
            disabled={!selectedFloorId || !currentRooms.length || Boolean(placementActive)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-4 text-sm font-bold text-emerald-800 dark:text-emerald-300 transition hover:bg-emerald-100 dark:hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            title="Căn thẳng phòng"
          >
            <WandSparkles className="h-4 w-4" />
            Căn thẳng phòng
          </button>
          <button type="button" onClick={save} disabled={saving || !selectedFloorId || (!currentRooms.length && !currentBlocks.length)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-4 text-sm font-bold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Lưu sơ đồ</button>
        </div>
      </header>

      {(notice || error) && <div className={`px-6 py-2 text-sm font-bold ${error ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>{error || notice}</div>}

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 shrink-0 flex-col gap-5 border-r bg-white dark:bg-[#0f172a] p-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">Chọn tầng thiết kế</span>
              <button
                type="button"
                onClick={addFloor}
                disabled={addingFloor}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-300 disabled:opacity-50"
              >
                {addingFloor && <LoaderCircle className="h-3 w-3 animate-spin" />}
                + Thêm tầng
              </button>
            </div>
            {data?.floors?.length ? (
              <div className="relative mt-2">
                <Layers3 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <select value={selectedFloorId} onChange={(event) => changeFloor(event.target.value)} className="h-10 w-full rounded-lg border bg-white dark:bg-[#0f172a] pl-9 pr-3 text-sm font-bold">
                  {data.floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={requestDeleteCurrentFloor}
                  disabled={deletingFloor || !selectedFloorId}
                  className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-xs font-bold text-rose-700 dark:text-rose-300 transition hover:bg-rose-100 dark:hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingFloor ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Xóa tầng hiện tại
                </button>
                {(data?.floors?.length ?? 0) <= 1 && (
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">
                    Cần giữ lại ít nhất một tầng.
                  </p>
                )}
                {IS_HAI_DANG_1 && (
                  <button
                    type="button"
                    onClick={resetCurrentLayout}
                    disabled={resettingLayout}
                    className="mt-1 inline-flex w-full items-center justify-center gap-1 text-center text-xs font-bold text-slate-400 underline hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
                  >
                    {resettingLayout && <LoaderCircle className="h-3 w-3 animate-spin" />}
                    ↺ Đặt lại bố cục
                  </button>
                )}
              </div>
            ) : <p className="mt-3 rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">Cơ sở chưa có tầng.</p>}
          </div>
          <button type="button" onClick={addRoom} disabled={!selectedFloorId || addingRoom} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-bold disabled:opacity-50">
            {addingRoom ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Thêm ô phòng mới
          </button>

          <div>
            <p className="mb-3 text-xs font-bold uppercase text-slate-500">Thêm khối tiện ích</p>
            <div className="grid gap-2">
              {Object.entries(BLOCK_TYPES).map(([type, meta]) => (
                <button key={type} type="button" onClick={() => addBlock(type)} disabled={!selectedFloorId} className="flex h-10 items-center justify-between rounded-lg border px-3 text-sm font-bold disabled:opacity-50">
                  <span>{meta.label}</span><Plus className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <p className="mb-3 text-xs font-bold uppercase text-slate-500">Danh sách phòng ({currentRooms.length})</p>
            <div className="grid gap-2">
              {currentRooms.map((room) => <div key={room.id} className="rounded-lg border bg-slate-50 p-3"><p className="text-sm font-bold">{room.roomCode ?? room.name}</p><p className="text-xs text-slate-500">{areaFromSize(room.width, room.height)} m²</p></div>)}
            </div>
          </div>
        </aside>

        <main
          ref={canvasViewportRef}
          className={`relative flex-1 overflow-hidden bg-[#f1f5f9] dark:bg-white/5 touch-none ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerUp}
          onWheel={handleCanvasWheel}
          onClick={(event) => {
            if (hasPannedRef.current) {
              hasPannedRef.current = false;
              return;
            }
            if (shouldIgnoreCanvasGesture(event.target)) return;
            if (placementActive) finishPlacement();
            clearSelection();
          }}
        >
          <div
            data-editor-ui="true"
            className="absolute right-4 top-4 z-50 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-xl shadow-slate-200/70 backdrop-blur dark:border-white/10 dark:bg-[#0f172a]/95 dark:shadow-black/20"
          >
            <button
              type="button"
              aria-label="Hoàn tác"
              title="Hoàn tác"
              onClick={undoLayout}
              disabled={!canUndo}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Làm lại"
              title="Làm lại"
              onClick={redoLayout}
              disabled={!canRedo}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />
            <button
              type="button"
              aria-label="Thu nhỏ"
              title="Thu nhỏ"
              onClick={() => zoomCanvas(canvasView.zoom - ZOOM_STEP)}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-12 text-center text-xs font-black text-slate-600 dark:text-slate-300">
              {Math.round(canvasView.zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label="Phóng to"
              title="Phóng to"
              onClick={() => zoomCanvas(canvasView.zoom + ZOOM_STEP)}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Đặt lại góc nhìn"
              title="Đặt lại góc nhìn"
              onClick={resetCanvasView}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <Move className="h-4 w-4" />
            </button>
          </div>
          {placementActive && (
            <div data-editor-ui="true" className="absolute left-1/2 top-4 z-50 w-fit -translate-x-1/2 rounded-full bg-slate-950/90 px-4 py-2 text-sm font-bold text-white shadow-xl">
              Bấm vào tường phòng để đặt {placementMode === "door" ? "cửa" : "cửa sổ"}. Nhấn ESC để hủy.
            </div>
          )}
          {previewOpen && <PreviewPanel rooms={currentRooms} blocks={currentBlocks} onClose={() => setPreviewOpen(false)} />}
          <div
            className="absolute left-0 top-0"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `translate(${canvasView.x}px, ${canvasView.y}px) scale(${canvasView.zoom})`,
              transformOrigin: "0 0",
              backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
              backgroundSize: `${GRID}px ${GRID}px`,
            }}
          >
            <FloorPlanSvgDefs />
            {currentBlocks.map((block) => (
              <Rnd
                key={block.id}
                data-floor-item="true"
                bounds="parent"
                scale={canvasView.zoom}
                dragGrid={[GRID, GRID]}
                disableDragging={Boolean(placementActive)}
                size={{ width: block.width, height: block.height }}
                position={{ x: block.x, y: block.y }}
                enableResizing={selectedItemId === block.id ? BLUEPRINT_RESIZE_ENABLE : false}
                lockAspectRatio={block.type === "STAIR"}
                resizeHandleStyles={selectedItemId === block.id ? BLUEPRINT_RESIZE_HANDLE_STYLES : undefined}
                onClick={() => selectItem(block)}
                onDragStop={(_, position) => updateBlock(block.id, { x: position.x, y: position.y })}
                onResizeStart={() => recordHistory()}
                onResize={(_, __, ref, ___, position) => updateBlockLive(block.id, { width: ref.offsetWidth, height: ref.offsetHeight, ...position })}
                onResizeStop={(_, __, ref, ___, position) => updateBlockLive(block.id, { width: ref.offsetWidth, height: ref.offsetHeight, ...position })}
                className="group relative cursor-grab select-none active:cursor-grabbing"
              >
                <div data-floor-item="true" className="relative h-full w-full">
                  {selectedItemId === block.id && (
                    <FloatingToolbar
                      item={block}
                      isRoom={false}
                      placementMode={null}
                      onRotate={rotateSelectedItem}
                      onDelete={removeSelectedItem}
                    />
                  )}
                  <button type="button" onClick={(event) => { event.stopPropagation(); removeBlock(block.id); }} className="absolute right-1 top-1 z-20 grid h-4 w-4 place-items-center rounded-full bg-slate-200 text-[10px] text-slate-700 hover:bg-rose-200"><X className="h-3 w-3" /></button>
                  <FloorPlanItem item={{ ...block, label: BLOCK_TYPES[block.type]?.label }} selected={selectedItemId === block.id} />
                </div>
              </Rnd>
            ))}
            {currentRooms.map((room) => (
              <Rnd
                key={room.id}
                data-floor-item="true"
                bounds="parent"
                scale={canvasView.zoom}
                dragGrid={[GRID, GRID]}
                disableDragging={Boolean(placementActive)}
                enableResizing={false}
                size={{ width: room.width, height: room.height }}
                position={{ x: room.x, y: room.y }}
                onClick={() => selectItem({ ...room, type: "ROOM" })}
                onDragStop={(_, position) => updatePosition(room.id, { x: position.x, y: position.y })}
                className="group cursor-grab select-none active:cursor-grabbing"
              >
                <div data-floor-item="true" className="relative h-full w-full">
                  {selectedItemId === room.id && (
                    <FloatingToolbar
                      item={{ ...room, type: "ROOM" }}
                      isRoom
                      placementMode={placementTargetId === room.id ? placementMode : null}
                      areaInputValue={areaInputValue}
                      priceInputValue={priceInputValue}
                      onAreaInputChange={setAreaInputValue}
                      onPriceInputChange={setPriceInputValue}
                      onAreaSubmit={applyArea}
                      onPriceSubmit={applyRoomPrice}
                      onRotate={rotateSelectedItem}
                      onStartPlacement={startPlacement}
                      onFinishPlacement={finishPlacement}
                      onCancelPlacement={finishPlacement}
                      onDelete={removeSelectedItem}
                    />
                  )}
                  <FloorPlanItem item={{ ...room, type: "ROOM" }} selected={selectedItemId === room.id} />
                  {selectedItemId === room.id && <OpeningDeleteButtons room={room} onRemove={removeOpening} />}
                  {placementTargetId === room.id && placementMode && <RoomPlacementZones mode={placementMode} onPlace={placeOpening} />}
                </div>
              </Rnd>
            ))}
          </div>
          {!currentRooms.length && !currentBlocks.length && <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-semibold text-slate-500">Tầng này chưa có phòng.</div>}
        </main>
      </div>

      {floorDeleteConfirmOpen && selectedFloor && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-white dark:bg-[#0f172a] p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-slate-950">Bạn có muốn xóa tầng hiện tại không?</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {selectedFloor.name} sẽ được xóa khỏi sơ đồ. Các phòng thuộc tầng này cũng sẽ không còn hiển thị trong danh sách phòng.
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">
              Hành động này không ảnh hưởng đến các tầng khác.
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFloorDeleteConfirmOpen(false)}
                disabled={deletingFloor}
                className="inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Không
              </button>
              <button
                type="button"
                onClick={deleteCurrentFloor}
                disabled={deletingFloor}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deletingFloor && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Có
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
