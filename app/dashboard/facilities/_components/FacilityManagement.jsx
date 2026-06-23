"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BedDouble,
  Building2,
  CheckCircle2,
  CircleAlert,
  Layers3,
  Plus,
  Search,
  ServerCrash,
  X,
} from "lucide-react";
import { FacilityFormDialog } from "./FacilityFormDialog";
import { FacilityList } from "./FacilityList";
import { FacilityStatusDialog } from "./FacilityStatusDialog";
import { useFacilityManagement } from "../_hooks/useFacilityManagement";
import { facilityStatusOptions } from "../_data/mockFacilities";
import { FacilityFloorPlanDesigner } from "./FacilityFloorPlanDesigner";

const statCards = [
  {
    key: "totalFacilities",
    label: "Tổng cơ sở",
    icon: Building2,
    tone: "bg-blue-100 text-blue-700",
  },
  {
    key: "activeFacilities",
    label: "Đang hoạt động",
    icon: CheckCircle2,
    tone: "bg-emerald-100 text-emerald-700",
  },
  {
    key: "totalRooms",
    label: "Tổng số phòng",
    icon: BedDouble,
    tone: "bg-purple-100 text-purple-700",
  },
  {
    key: "vacancyRate",
    label: "Tỷ lệ trống",
    icon: BarChart3,
    tone: "bg-orange-100 text-orange-700",
    suffix: "%",
  },
];

function ToastViewport({ toasts, onDismiss }) {
  return (
    <div
      className="fixed bottom-4 right-4 z-[70] grid w-[min(420px,calc(100vw-2rem))] gap-3"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => {
        const isError = toast.tone === "error";
        const Icon = isError ? CircleAlert : CheckCircle2;

        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl ${
              isError
                ? "border-rose-200 bg-rose-700 text-white"
                : "border-emerald-200 bg-emerald-700 text-white"
            }`}
            role={isError ? "alert" : "status"}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <p className="flex-1 text-sm font-bold">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label="Đóng thông báo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function FacilityManagement() {
  const facility = useFacilityManagement();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [designerFacility, setDesignerFacility] = useState(null);

  const visibleFacilities = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");

    return facility.facilities.filter((item) => {
      const matchesStatus =
        statusFilter === "ALL" || item.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        [item.name, item.code, item.address].some((value) =>
          value.toLocaleLowerCase("vi").includes(normalizedQuery),
        );

      return matchesStatus && matchesQuery;
    });
  }, [facility.facilities, query, statusFilter]);

  return (
    <>
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>

          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-[#091426]">
            Quản lý cơ sở
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#505f76]">
            Theo dõi cấu trúc cơ sở, tầng và phòng; cập nhật trạng thái vận hành
            với kiểm soát hợp đồng và công nợ.
          </p>
        </div>
        <button
          type="button"
          onClick={facility.openCreateForm}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#16253a] hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          Thêm cơ sở mới
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon, tone, suffix = "" }) => (
          <article
            key={key}
            className="flex min-h-28 items-center gap-4 rounded-2xl border border-[#dbe1ea] bg-white p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)] sm:p-5"
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${tone}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#647089] sm:text-xs">
                {label}
              </p>
              <p className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#091426] sm:text-3xl">
                {facility.stats[key]}
                {suffix}
              </p>
              {key === "totalFacilities" && (
                <p className="mt-0.5 text-[11px] text-[#8490a3]">
                  {facility.stats.totalFloors} tầng đang quản lý
                </p>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-[#dbe1ea] bg-white p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8490a3]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên, mã hoặc địa chỉ cơ sở..."
              className="h-10 w-full rounded-lg border border-[#cbd3df] bg-[#f8fafc] pl-10 pr-4 text-sm font-medium text-[#091426] outline-none transition focus:border-[#091426] focus:bg-white focus:ring-2 focus:ring-[#091426]/10"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-lg border border-[#cbd3df] bg-white px-3 text-sm font-bold text-[#243047] outline-none focus:border-[#091426] focus:ring-2 focus:ring-[#091426]/10"
            aria-label="Lọc trạng thái cơ sở"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {facilityStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

        </div>

      </section>

      <FacilityList
        facilities={visibleFacilities}
        onEdit={facility.openEditForm}
        onStatusChange={facility.requestStatusChange}
        onOpenDesigner={(item) => setDesignerFacility(item)}
      />
      <FacilityFormDialog
        formState={facility.formState}
        onClose={facility.closeForm}
        onChange={facility.updateFormValue}
        onSubmit={facility.submitForm}
      />
      <FacilityStatusDialog
        flow={facility.statusFlow}
        isSubmitting={facility.isStatusSubmitting}
        onAcknowledgedChange={facility.setStatusAcknowledged}
        onClose={facility.closeStatusFlow}
        onConfirm={facility.confirmStatusChange}
      />
      <ToastViewport
        toasts={facility.toasts}
        onDismiss={facility.dismissToast}
      />
      {designerFacility && (
  <FacilityFloorPlanDesigner
    facility={designerFacility}
    onClose={() => setDesignerFacility(null)}
    onSave={(updatedFloors) => {
      facility.updateFacilityFloors(designerFacility.id, updatedFloors); // call APi after
      setDesignerFacility(null);
      facility.pushToast("Đã lưu sơ đồ tầng thành công");
    }}
  />
)}
    </>
  );
}
