"use client";

import { Fragment, useState } from "react";
import {
  BedDouble,
  Building2,
  ChevronDown,
  ChevronRight,
  DoorOpen,
  Layers3,
  MapPin,
  Pencil,
  LayoutGrid
} from "lucide-react";
import {
  FACILITY_STATUS,
  facilityStatusOptions,
} from "../_data/mockFacilities";

const statusMeta = {
  [FACILITY_STATUS.ACTIVE]: {
    label: "Đang hoạt động",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  [FACILITY_STATUS.TEMPORARILY_CLOSED]: {
    label: "Tạm ngừng",
    badge: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  [FACILITY_STATUS.PERMANENTLY_CLOSED]: {
    label: "Ngừng hoạt động",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
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

function FacilityTree({ facility }) {
  if (facility.floors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#cbd3df] bg-white p-5 text-center text-sm text-[#6b7280]">
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
            className="rounded-xl border border-[#dbe1ea] bg-white p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Layers3 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#091426]">
                    {floor.name}
                  </p>
                  <p className="text-xs text-[#6b7280]">
                    {occupied}/{floor.rooms.length} phòng đang thuê
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[#f2f4f6] px-2.5 py-1 text-xs font-bold text-[#505f76]">
                {floor.rooms.length} phòng
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {floor.rooms.map((room) => (
                <span
                  key={room.id}
                  title={
                    room.status === "OCCUPIED" ? "Đang thuê" : "Phòng trống"
                  }
                  className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                    room.status === "OCCUPIED"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-emerald-50 text-emerald-700"
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
}) {
  const counts = getFacilityCounts(facility);

  return (
    <article className="overflow-hidden rounded-2xl border border-[#dbe1ea] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Building2 className="h-5 w-5" />
          </span>
          <StatusBadge status={facility.status} />
        </div>
        <h3 className="mt-4 text-base font-bold text-[#091426]">
          {facility.name}
        </h3>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-[#8490a3]">
          {facility.code}
        </p>
        <p className="mt-3 flex items-start gap-2 text-sm leading-5 text-[#505f76]">
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
              className="rounded-lg bg-[#f7f9fb] px-2 py-2.5 text-center"
            >
              <p className="text-lg font-black text-[#091426]">{value}</p>
              <p className="text-[10px] font-bold uppercase text-[#6b7280]">
                {label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2">
         
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onEdit(facility)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#cbd3df] text-xs font-bold text-[#243047]"
            >
              <Pencil className="h-3.5 w-3.5" />
              Chỉnh sửa
            </button>
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#091426] text-xs font-bold text-white"
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
      </div>
      {expanded && (
        <div className="border-t border-[#e2e8f0] bg-[#f7f9fb] p-4">
          <FacilityTree facility={facility} />
        </div>
      )}
    </article>
  );
}

export function FacilityList({
  facilities,
  onEdit,
  onStatusChange,
  onOpenDesigner,
}) {
  const [expandedIds, setExpandedIds] = useState(
    () => new Set([facilities[0]?.id].filter(Boolean)),
  );

  const toggleFacility = (id) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (facilities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#cbd3df] bg-white p-10 text-center">
        <Building2 className="mx-auto h-10 w-10 text-[#9aa3b2]" />
        <h2 className="mt-4 text-base font-bold text-[#091426]">
          Không tìm thấy cơ sở
        </h2>
        <p className="mt-1 text-sm text-[#6b7280]">
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
            expanded={expandedIds.has(facility.id)}
            onToggle={() => toggleFacility(facility.id)}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[#dbe1ea] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead className="bg-[#f2f4f6]">
              <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#647089]">
                <th className="w-12 px-4 py-4" aria-label="Mở rộng" />
                <th className="px-4 py-4">Tên cơ sở</th>
                <th className="px-4 py-4">Địa chỉ</th>
                <th className="px-4 py-4 text-center">Số tầng</th>
                <th className="px-4 py-4 text-center">Số phòng</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-4 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {facilities.map((facility) => {
                const counts = getFacilityCounts(facility);
                const expanded = expandedIds.has(facility.id);

                return (
                  <Fragment key={facility.id}>
                    <tr className="border-t border-[#e2e8f0] transition hover:bg-[#fbfcfd]">
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => toggleFacility(facility.id)}
                          className="rounded-lg p-2 text-[#505f76] hover:bg-[#f2f4f6]"
                          aria-label={
                            expanded
                              ? `Thu gọn ${facility.name}`
                              : `Mở chi tiết ${facility.name}`
                          }
                        >
                          {expanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <Building2 className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="font-bold text-[#091426]">
                              {facility.name}
                            </p>
                            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8490a3]">
                              {facility.code}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-64 px-4 py-4 text-sm leading-5 text-[#505f76]">
                        {facility.address}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-[#091426]">
                        {counts.floors}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-[#091426]">
                        {counts.rooms}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={facility.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                         
                          <button
                            type="button"
                            onClick={() => onEdit(facility)}
                            className="rounded-lg border border-[#cbd3df] p-2 text-[#505f76] transition hover:border-[#091426] hover:text-[#091426]"
                            aria-label={`Chỉnh sửa ${facility.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenDesigner(facility)} // 
                            className="rounded-lg border border-[#cbd3df] p-2 text-[#505f76] transition hover:border-[#091426] hover:text-[#091426]"
                            title="Thiết kế sơ đồ tầng"
                          >
                            <LayoutGrid className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td>
                        
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-t border-[#e2e8f0] bg-[#f7f9fb]">
                        <td colSpan={7} className="px-6 py-5">
                          <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-bold text-[#505f76]">
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
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
