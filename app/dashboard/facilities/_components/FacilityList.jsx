"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BedDouble,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  DoorOpen,
  Eye,
  Gauge,
  LayoutGrid,
  Layers3,
  MapPin,
  Pencil,
  MoreVertical,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FACILITY_STATUS,
  facilityStatusOptions,
} from "@/services/facilityService";

const statusMeta = {
  [FACILITY_STATUS.DRAFT]: {
    label: "Bản nháp",
    badge:
      "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 ring-slate-200 dark:ring-white/10",
    dot: "bg-slate-400",
  },
  [FACILITY_STATUS.ACTIVE]: {
    label: "Đang hoạt động",
    badge:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
  [FACILITY_STATUS.TEMPORARILY_CLOSED]: {
    label: "Tạm ngừng",
    badge:
      "bg-amber-50 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300 ring-amber-200 dark:ring-yellow-500/20",
    dot: "bg-amber-500",
  },
  [FACILITY_STATUS.PERMANENTLY_CLOSED]: {
    label: "Ngừng hoạt động",
    badge:
      "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-200 dark:ring-rose-500/20",
    dot: "bg-rose-500",
  },
};

function getFacilityCounts(facility) {
  const rooms = facility.floors.flatMap((floor) => floor.rooms);

  return {
    floors: facility.floors.length,
    rooms: rooms.length,
    occupied: rooms.filter((room) => room.status === "OCCUPIED").length,
  };
}

function StatusBadge({ status }) {
  const meta = statusMeta[status] || statusMeta[FACILITY_STATUS.ACTIVE];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${meta.badge}`}
    >
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

const facilityActionItemClass =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-300";

function FacilityActionsMenu({
  facility,
  showMeterReadingsAction,
  onEdit,
  onUtilitySettings,
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#cbd3df] text-slate-600 transition hover:border-[#1e40af] hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
          aria-label={`Tùy chọn ${facility.name}`}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-72 max-w-[calc(100vw-1rem)] rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)] dark:border-white/10 dark:bg-[#0f172a]"
      >
        <DropdownMenuItem
          asChild
          className="rounded-lg p-0 focus:bg-transparent"
        >
          <Link
            href={getFacilityRoomsHref(facility)}
            className={facilityActionItemClass}
          >
            <Eye className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            Xem chi tiết
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="rounded-lg p-0 focus:bg-transparent"
        >
          <button
            type="button"
            onClick={() => onEdit(facility)}
            className={facilityActionItemClass}
          >
            <Pencil className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            Chỉnh sửa
          </button>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="rounded-lg p-0 focus:bg-transparent"
        >
          <Link
            href={`/dashboard/facilities/${facility.id}/floor-plan-designer`}
            className={facilityActionItemClass}
          >
            <LayoutGrid className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            Sơ đồ tầng
          </Link>
        </DropdownMenuItem>
        {showMeterReadingsAction ? (
          <DropdownMenuItem
            asChild
            className="rounded-lg p-0 focus:bg-transparent"
          >
            <Link
              href={getFacilityMeterReadingsHref(facility)}
              className={facilityActionItemClass}
            >
              <Gauge className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              Điện nước
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          asChild
          className="rounded-lg p-0 focus:bg-transparent"
        >
          <Link
            href={`/dashboard/rules?propertyId=${encodeURIComponent(String(facility.id))}`}
            className={facilityActionItemClass}
          >
            <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            Quản lý nội quy
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="rounded-lg p-0 focus:bg-transparent"
        >
          <button
            type="button"
            onClick={() => onUtilitySettings(facility)}
            className={facilityActionItemClass}
          >
            <CircleDollarSign className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            Giá điện nước
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getFacilityRoomsHref(facility) {
  const params = new URLSearchParams({
    from: "facilities",
    propertyId: String(facility.id),
  });

  if (facility.name) params.set("facilityName", facility.name);

  return `/dashboard/rooms?${params.toString()}`;
}

function getFacilityMeterReadingsHref(facility) {
  const params = new URLSearchParams({
    from: "facilities",
    propertyId: String(facility.id),
  });

  return `/dashboard/meter-readings?${params.toString()}`;
}

function FacilityTree({ facility }) {
  if (facility.floors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#cbd3df] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 text-center text-sm text-slate-500 dark:text-slate-400">
        Cơ sở mới chưa có dữ liệu tầng và phòng.
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {facility.floors.map((floor) => {
        const occupied = floor.rooms.filter(
          (room) => room.status === "OCCUPIED",
        ).length;

        return (
          <article
            key={floor.id}
            className="rounded-xl border border-[#dbe1ea] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300">
                  <Layers3 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {floor.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {occupied}/{floor.rooms.length} phòng đang thuê
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[#f2f4f6] dark:bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                {floor.rooms.length} phòng
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {floor.rooms.map((room) => (
                <span
                  key={room.id}
                  title={
                    room.status === "OCCUPIED"
                      ? "Đang thuê"
                      : room.status === "DRAFT"
                        ? "Bản nháp"
                        : "Phòng trống"
                  }
                  className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                    room.status === "OCCUPIED"
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300"
                      : room.status === "DRAFT"
                        ? "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                        : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {room.name.replace("Phòng ", "")}
                </span>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MobileFacilityCard({
  facility,
  expanded,
  onToggle,
  onEdit,
  onStatusChange,
  onUtilitySettings,
  showMeterReadingsAction,
}) {
  const counts = getFacilityCounts(facility);

  return (
    <article className="overflow-hidden rounded-2xl border border-[#dbe1ea] dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300">
            <Building2 className="h-5 w-5" />
          </span>
          <StatusBadge status={facility.status} />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
          {facility.name}
        </h3>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
          {facility.code}
        </p>
        <p className="mt-3 flex items-start gap-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          {facility.address}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["Tầng", counts.floors],
            ["Phòng", counts.rooms],
            ["Đang thuê", counts.occupied],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg bg-[#f7f9fb] dark:bg-white/5 px-2 py-2.5 text-center"
            >
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {value}
              </p>
              <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                {label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <FacilityActionsMenu
            facility={facility}
            showMeterReadingsAction={showMeterReadingsAction}
            onEdit={onEdit}
            onUtilitySettings={onUtilitySettings}
          />
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] text-xs font-bold text-white"
          >
            {expanded ? "Thu gọn" : "Xem tầng"}
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[#e2e8f0] dark:border-white/10 bg-[#f7f9fb] dark:bg-white/5 p-4">
          <FacilityTree facility={facility} />
        </div>
      )}
    </article>
  );
}

export function FacilityList({
  facilities,
  showMeterReadingsAction = false,
  onEdit,
  onStatusChange,
  onUtilitySettings,
}) {
  const [expandedIds, setExpandedIds] = useState(
    () => new Set([facilities[0]?.id].filter(Boolean).map(String)),
  );

  const visibleIds = useMemo(
    () => new Set(facilities.map((facility) => String(facility.id))),
    [facilities],
  );
  const activeExpandedIds = useMemo(() => {
    const firstFacilityId = facilities[0]?.id;
    if (!firstFacilityId) return new Set();
    if (expandedIds.size === 0) return expandedIds;
    if ([...expandedIds].some((id) => visibleIds.has(id))) return expandedIds;
    return new Set([String(firstFacilityId)]);
  }, [expandedIds, facilities, visibleIds]);

  const toggleFacility = (id) => {
    const targetId = String(id);
    setExpandedIds((current) => {
      const currentVisible = [...current].some((itemId) =>
        visibleIds.has(itemId),
      )
        ? current
        : activeExpandedIds;
      const next = new Set(currentVisible);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
  };

  if (facilities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#cbd3df] dark:border-white/10 bg-white dark:bg-[#0f172a] p-10 text-center">
        <Building2 className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-500" />
        <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
          Không tìm thấy cơ sở
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Thử thay đổi từ khóa hoặc bộ lọc trạng thái.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:hidden">
        {facilities.map((facility) => (
          <MobileFacilityCard
            key={facility.id}
            facility={facility}
            expanded={activeExpandedIds.has(String(facility.id))}
            onToggle={() => toggleFacility(facility.id)}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
            onUtilitySettings={onUtilitySettings}
            showMeterReadingsAction={showMeterReadingsAction}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[#dbe1ea] dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-[0_1px_2px_rgba(9,20,38,0.06)] md:block">
        <div className="overflow-x-auto">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[40px_minmax(260px,1.2fr)_minmax(240px,1.4fr)_88px_88px_150px_72px] gap-4 bg-[#f2f4f6] px-4 py-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#647089] dark:bg-white/5">
              <span aria-label="Mở rộng" />
              <span>Tên cơ sở</span>
              <span>Địa chỉ</span>
              <span className="text-center">Số tầng</span>
              <span className="text-center">Số phòng</span>
              <span>Trạng thái</span>
              <span className="text-right">Thao tác</span>
            </div>
            <Accordion
              type="multiple"
              value={[...activeExpandedIds]}
              onValueChange={(values) => setExpandedIds(new Set(values))}
              className="min-w-[1080px]"
            >
              {facilities.map((facility) => {
                const counts = getFacilityCounts(facility);

                return (
                  <AccordionItem
                    key={facility.id}
                    value={String(facility.id)}
                    className="border-t border-[#e2e8f0] dark:border-white/10"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_72px] items-center transition hover:bg-[#fbfcfd] dark:hover:bg-white/5">
                      <AccordionTrigger className="rounded-none px-4 py-4 hover:no-underline [&>[data-slot=accordion-trigger-icon]]:hidden">
                        <div className="grid flex-1 grid-cols-[40px_minmax(260px,1.2fr)_minmax(240px,1.4fr)_88px_88px_150px] items-center gap-4">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition group-aria-expanded/accordion-trigger:bg-[#eef3fb] group-aria-expanded/accordion-trigger:text-[#1e40af] dark:text-slate-300 dark:group-aria-expanded/accordion-trigger:bg-white/10">
                            <ChevronRight className="h-4 w-4 group-aria-expanded/accordion-trigger:hidden" />
                            <ChevronDown className="hidden h-4 w-4 group-aria-expanded/accordion-trigger:block" />
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                              <Building2 className="h-5 w-5" />
                            </span>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">
                                {facility.name}
                              </p>
                              <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                                {facility.code}
                              </p>
                            </div>
                          </div>
                          <div className="max-w-64 text-sm leading-5 text-slate-600 dark:text-slate-300">
                            {facility.address}
                          </div>
                          <div className="text-center font-bold text-slate-900 dark:text-white">
                            {counts.floors}
                          </div>
                          <div className="text-center font-bold text-slate-900 dark:text-white">
                            {counts.rooms}
                          </div>
                          <div>
                            <StatusBadge status={facility.status} />
                          </div>
                        </div>
                      </AccordionTrigger>
                      <div className="flex justify-end px-4 py-4">
                        <FacilityActionsMenu
                          facility={facility}
                          showMeterReadingsAction={showMeterReadingsAction}
                          onEdit={onEdit}
                          onUtilitySettings={onUtilitySettings}
                        />
                      </div>
                    </div>
                    <AccordionContent className="border-t border-[#e2e8f0] bg-[#f7f9fb] px-6 py-5 dark:border-white/10 dark:bg-white/5">
                      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-2">
                          <Layers3 className="h-4 w-4" />
                          {counts.floors} tầng
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <DoorOpen className="h-4 w-4" />
                          {counts.rooms} phòng
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <BedDouble className="h-4 w-4" />
                          {counts.occupied} phòng đang thuê
                        </span>
                      </div>
                      <FacilityTree facility={facility} />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </div>
      </div>
    </>
  );
}
