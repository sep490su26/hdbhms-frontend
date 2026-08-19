"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  CalendarRange,
  Eye,
  Loader2,
  RotateCcw,
  Search,
  SendToBack,
} from "lucide-react";

import DateInput from "@/components/DateInput";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate as formatDisplayDate } from "@/lib/dateFormat";
import { paginateItems } from "@/lib/pageResponse";
import { fetchManagementRoomCatalog } from "@/services/managementRoomsService";
import { fetchRoomTransferHistory } from "@/services/roomTransferService";

function emptyFilters() {
  return {
    floorId: "",
    roomId: "",
    fromDate: "",
    toDate: "",
  };
}

function initialsOf(name) {
  const words = String(name || "KH")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return (
    words
      .slice(-2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "KH"
  );
}

function valueOf(item, ...keys) {
  for (const key of keys) {
    if (
      item?.[key] !== undefined &&
      item?.[key] !== null &&
      item?.[key] !== ""
    ) {
      return item[key];
    }
  }
  return "";
}

function joinObjectValues(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.values(value).filter(Boolean).join(", ");
}

function formatRoomLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "Phòng --";
  return text.toLowerCase().startsWith("phòng") ? text : `Phòng ${text}`;
}

function normalizeFloorLabel(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.toLowerCase().startsWith("tầng") ? text : `Tầng ${text}`;
}

function deriveFloorIdFromRoomCode(roomCode) {
  const match = String(roomCode || "").match(/\d/);
  return match?.[0] || "";
}

function transferTenantName(transfer) {
  return (
    valueOf(
      transfer,
      "tenantName",
      "requesterName",
      "customerName",
      "primaryTenantName",
    ) ||
    joinObjectValues(transfer?.transferringTenantNames) ||
    "Chưa cập nhật"
  );
}

function transferTenantPhone(transfer) {
  return (
    valueOf(
      transfer,
      "tenantPhone",
      "requesterPhone",
      "customerPhone",
      "primaryTenantPhone",
    ) || "Chưa có SĐT"
  );
}

function transferOldRoomCode(transfer) {
  return valueOf(
    transfer,
    "oldRoomCode",
    "oldRoomName",
    "sourceRoomCode",
    "fromRoomCode",
  );
}

function transferTargetRoomCode(transfer) {
  return valueOf(
    transfer,
    "targetRoomCode",
    "targetRoomName",
    "newRoomCode",
    "toRoomCode",
  );
}

function transferDate(transfer) {
  return valueOf(
    transfer,
    "actualTransferDate",
    "executedAt",
    "completedAt",
    "expectedTransferDate",
    "requestedTransferDate",
  );
}

function transferApprover(transfer) {
  return (
    valueOf(transfer, "approvedByName", "approverName", "managerName") ||
    (transfer?.approvedById ? `#${transfer.approvedById}` : "Chưa cập nhật")
  );
}

function transferFloorIds(transfer) {
  const oldFloorId =
    valueOf(transfer, "oldRoomFloorId", "sourceFloorId") ||
    deriveFloorIdFromRoomCode(transferOldRoomCode(transfer));
  const targetFloorId =
    valueOf(transfer, "targetRoomFloorId", "targetFloorId") ||
    deriveFloorIdFromRoomCode(transferTargetRoomCode(transfer));

  return [String(oldFloorId), String(targetFloorId)].filter(Boolean);
}

function transferRoomIds(transfer) {
  return [
    valueOf(
      transfer,
      "oldRoomId",
      "sourceRoomId",
      "oldRoomCode",
      "oldRoomName",
    ),
    valueOf(
      transfer,
      "targetRoomId",
      "newRoomId",
      "targetRoomCode",
      "targetRoomName",
    ),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function normalizeCatalogRoom(room) {
  const roomCode = valueOf(room, "roomCode", "room_code", "code", "name");
  const floorId =
    valueOf(room, "floorId", "floor_id") ||
    valueOf(room?.floor, "id") ||
    deriveFloorIdFromRoomCode(roomCode);
  const floorLabel =
    valueOf(room, "floorName", "floor_name", "floor") ||
    valueOf(room?.floor, "name") ||
    normalizeFloorLabel(floorId);

  return {
    id: String(valueOf(room, "roomId", "id", "room_id") || roomCode),
    code: String(roomCode || ""),
    label: formatRoomLabel(roomCode),
    floorId: String(floorId || ""),
    floorLabel: normalizeFloorLabel(floorLabel || floorId),
  };
}

function uniqueBy(items = [], key) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  return items.filter((item) => {
    if (!item) return false;
    const value = key(item);
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function hasFilters(filters) {
  return Boolean(
    filters.floorId || filters.roomId || filters.fromDate || filters.toDate,
  );
}

function SelectField({ label, value, onChange, children, disabled = false }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-all duration-200 ease-out focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:disabled:bg-white/5"
      >
        {children}
      </select>
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">
      {label}
      <DateInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/15 dark:border-white/10 dark:bg-[#0f172a] dark:text-white"
      />
    </label>
  );
}

function TransferRoute({ transfer }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <Badge
        variant="outline"
        className="h-8 max-w-full rounded-full border-blue-200 bg-blue-50 px-2.5 text-[11px] font-black text-[#1d4ed8] dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
      >
        {formatRoomLabel(transferOldRoomCode(transfer))}
      </Badge>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-slate-400"
        aria-hidden="true"
      />
      <Badge
        variant="outline"
        className="h-8 max-w-full rounded-full border-emerald-200 bg-emerald-50 px-2.5 text-[11px] font-black text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
      >
        {formatRoomLabel(transferTargetRoomCode(transfer))}
      </Badge>
    </div>
  );
}

function TransferReasonDialog({ reason }) {
  const text = reason || "Chưa cập nhật";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 max-w-full items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-[#f8fafc] hover:text-[#1e40af] focus:outline-none focus:ring-2 focus:ring-[#1e40af]/20 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-200 dark:hover:bg-white/5"
        >
          <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
            Lý do chuyển phòng
          </DialogTitle>
          <DialogDescription className="sr-only">
            Nội dung đầy đủ của lý do chuyển phòng.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 text-sm font-semibold leading-6 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
          {text}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#1e40af] px-5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]"
            >
              Đóng
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferRow({ transfer }) {
  const tenantName = transferTenantName(transfer);
  const tenantPhone = transferTenantPhone(transfer);

  return (
    <TableRow className="border-[#e2e8f0] hover:bg-[#f8fafc] dark:border-white/10 dark:hover:bg-white/5">
      <TableCell className="whitespace-normal px-3 py-5 sm:px-4 lg:px-5">
        <div className="min-w-0">
          <p className="truncate font-black text-slate-900 dark:text-white">
            {tenantName}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
            {tenantPhone}
          </p>
        </div>
      </TableCell>
      <TableCell className="whitespace-normal px-3 py-5 sm:px-4 lg:px-5">
        <TransferRoute transfer={transfer} />
      </TableCell>
      <TableCell className="whitespace-normal px-3 py-5 text-sm font-bold text-slate-700 dark:text-slate-200 sm:px-4 lg:px-5">
        {formatDisplayDate(transferDate(transfer), "Chưa cập nhật")}
      </TableCell>
      <TableCell className="whitespace-normal px-3 py-5 text-sm font-bold text-slate-700 dark:text-slate-200 sm:px-4 lg:px-5">
        <span className="block truncate">{transferApprover(transfer)}</span>
      </TableCell>
      <TableCell className="whitespace-normal px-3 py-5 sm:px-4 lg:px-5">
        <TransferReasonDialog reason={transfer.reason} />
      </TableCell>
    </TableRow>
  );
}

export default function RoomTransferHistoryPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [query, setQuery] = useState(emptyFilters);
  const [rooms, setRooms] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

const catalogRooms = useMemo(() => {
  if (!Array.isArray(rooms)) return [];
  return rooms
    .map(normalizeCatalogRoom)
    .filter((room) => room && room.code)
    .sort((left, right) => (left?.label || "").localeCompare(right?.label || "", "vi"));
}, [rooms]);

const floorOptions = useMemo(() => {
  if (!Array.isArray(catalogRooms) || catalogRooms.length === 0) return [];
  
  const mapped = catalogRooms
    .filter(Boolean)
    .map((room) => ({
      id: room.floorId,
      label: room.floorLabel || normalizeFloorLabel(room.floorId),
    }))
    .filter((floor) => floor.id);

  return uniqueBy(mapped, (floor) => floor.id).sort((left, right) =>
    (left?.label || "").localeCompare(right?.label || "", "vi")
  );
}, [catalogRooms]);

  const roomOptions = useMemo(() => {
    if (!filters.floorId) return [];
    return catalogRooms.filter((room) => room.floorId === filters.floorId);
  }, [catalogRooms, filters.floorId]);

  const selectedFloorLabel = useMemo(() => {
    return (
      floorOptions.find((floor) => floor.id === filters.floorId)?.label || ""
    );
  }, [filters.floorId, floorOptions]);

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchRoomTransferHistory({ ...query, page, size });
      setTransfers(result.items || []);
      setTotalElements(result.totalElements || 0);
      setTotalPages(result.totalPages || 1);
    } catch (error) {
      console.error("Lỗi tải lịch sử chuyển phòng:", error);
      setTransfers([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, query, size]);

  useEffect(() => {
  fetchManagementRoomCatalog()
    .then((res) => {
      // Đảm bảo luôn lấy đúng mảng kể cả khi API bọc trong data/items/result
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.items)
        ? res.items
        : [];
      setRooms(list);
    })
    .catch(() => setRooms([]));
}, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadTransfers, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadTransfers]);

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "floorId" ? { roomId: "" } : {}),
    }));
  }

  function submitFilters(event) {
    event.preventDefault();
    setPage(1);
    setQuery(filters);
  }

  function resetFilters() {
    const nextFilters = emptyFilters();
    setFilters(nextFilters);
    setQuery(nextFilters);
    setPage(1);
  }

  const emptyMessage = hasFilters(query)
    ? "Không tìm thấy lịch sử chuyển phòng phù hợp."
    : "Chưa có lịch sử chuyển phòng.";

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 text-slate-900 dark:text-white">
      <DashboardPageHeader
        title="Lịch sử chuyển phòng"
        description="Theo dõi và quản lý luân chuyển phòng của khách thuê."
      />

      <form
        onSubmit={submitFilters}
        className="rounded-xl border border-[#e2e8f0] bg-[#f2f4f6] p-4 shadow-[0_1px_2px_rgba(9,20,38,0.04)] dark:border-white/10 dark:bg-white/5"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(170px,0.8fr)_minmax(170px,0.8fr)]">
          <SelectField
            label="Chọn tầng"
            value={filters.floorId}
            onChange={(value) => updateFilter("floorId", value)}
          >
            <option value="">Tất cả các tầng</option>
            {floorOptions.map((floor) => (
              <option key={floor.id} value={floor.id}>
                {floor.label}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Chọn phòng"
            value={filters.roomId}
            onChange={(value) => updateFilter("roomId", value)}
            disabled={!filters.floorId}
          >
            <option value="">
              {filters.floorId
                ? `Phòng của ${selectedFloorLabel || "tầng đã chọn"}`
                : "Chọn tầng"}
            </option>
            {roomOptions.map((room) => (
              <option key={`${room.floorId}-${room.id}`} value={room.id}>
                {room.label}
              </option>
            ))}
          </SelectField>

          <DateField
            label="Từ ngày"
            value={filters.fromDate}
            onChange={(value) => updateFilter("fromDate", value)}
          />

          <DateField
            label="Đến ngày"
            value={filters.toDate}
            onChange={(value) => updateFilter("toDate", value)}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1e40af] px-4 text-sm font-bold text-white transition hover:bg-[#1d4ed8] dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]"
          >
            Lọc
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-[#f8fafc] dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-200 dark:hover:bg-white/5"
          >
            Xóa lọc
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
        {loading ? (
          <div className="flex min-h-72 items-center justify-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải lịch sử chuyển phòng...
          </div>
        ) : transfers.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <SendToBack className="h-10 w-10 text-slate-400 dark:text-slate-500" />
            <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <Table className="w-full table-fixed text-left">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[27%]" />
              <col className="w-[15%]" />
              <col className="w-[20%]" />
              <col className="w-[12%]" />
            </colgroup>
            <TableHeader className="bg-[#f8fafc] text-xs font-black uppercase tracking-[0.05em] text-slate-500 dark:bg-white/5 dark:text-slate-400 [&_tr]:border-[#e2e8f0] dark:[&_tr]:border-white/10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="whitespace-normal px-3 py-4 font-black sm:px-4 lg:px-5">
                  Thông tin khách
                </TableHead>
                <TableHead className="whitespace-normal px-3 py-4 font-black sm:px-4 lg:px-5">
                  Lộ trình chuyển
                </TableHead>
                <TableHead className="whitespace-normal px-3 py-4 font-black sm:px-4 lg:px-5">
                  Tháng chuyển
                </TableHead>
                <TableHead className="whitespace-normal px-3 py-4 font-black sm:px-4 lg:px-5">
                  Người duyệt
                </TableHead>
                <TableHead className="whitespace-normal px-3 py-4 font-black sm:px-4 lg:px-5">
                  Lý do
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer, index) => (
                <TransferRow
                  key={transfer.id || `transfer-${index}`}
                  transfer={transfer}
                />
              ))}
            </TableBody>
          </Table>
        )}

        <DashboardPagination
          page={page}
          size={size}
          totalElements={totalElements}
          totalPages={totalPages}
          itemLabel="lượt chuyển phòng"
          onPageChange={setPage}
          onSizeChange={(nextSize) => {
            setSize(nextSize);
            setPage(1);
          }}
        />
      </section>
    </div>
  );
}
