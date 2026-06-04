"use client";

import { useMemo, useState } from "react";
import {
  Bolt,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Droplet,
  EllipsisVertical,
  Filter,
  Image as ImageIcon,
  TriangleAlert,
  X,
} from "lucide-react";

const initialRooms = [
  {
    id: "P.101",
    tenant: "Lê Văn Tâm",
    oldElectric: "12,450",
    newElectric: "12560",
    electricProof: false,
    oldWater: "452",
    newWater: "460",
    waterProof: true,
    status: "Hoàn tất",
  },
  {
    id: "P.102",
    tenant: "Trần Thị Bình",
    oldElectric: "8,920",
    newElectric: "8910",
    electricError: "Số mới < Số cũ",
    electricProof: false,
    oldWater: "215",
    newWater: "",
    waterProof: false,
    status: "Lỗi chỉ số",
  },
  {
    id: "P.103",
    tenant: "Ngô Gia Tư",
    oldElectric: "15,100",
    newElectric: "",
    electricProof: false,
    oldWater: "328",
    newWater: "",
    waterProof: false,
    status: "Chưa nhập",
  },
  {
    id: "P.105(t)",
    tenant: "Người thuê trống",
    oldElectric: "10,200",
    newElectric: "",
    electricProof: false,
    oldWater: "150",
    newWater: "",
    waterProof: false,
    status: "Chưa nhập",
  },
  {
    id: "P.105(t)",
    tenant: "Người thuê trống",
    oldElectric: "10,200",
    newElectric: "",
    electricProof: false,
    oldWater: "150",
    newWater: "",
    waterProof: false,
    status: "Chưa nhập",
  },
  {
    id: "P.105(t)",
    tenant: "Người thuê trống",
    oldElectric: "10,200",
    newElectric: "",
    electricProof: false,
    oldWater: "150",
    newWater: "",
    waterProof: false,
    status: "Chưa nhập",
  },
  {
    id: "P.105(t)",
    tenant: "Người thuê trống",
    oldElectric: "10,200",
    newElectric: "",
    electricProof: false,
    oldWater: "150",
    newWater: "",
    waterProof: false,
    status: "Chưa nhập",
  },
  {
    id: "P.105(t)",
    tenant: "Người thuê trống",
    oldElectric: "10,200",
    newElectric: "",
    electricProof: false,
    oldWater: "150",
    newWater: "",
    waterProof: false,
    status: "Chưa nhập",
  },
];

function MetricCard({ icon: Icon, value, label, tone }) {
  const styles = {
    electric: "bg-[#e8edff] text-[#3156b6]",
    water: "bg-[#e8edff] text-[#3156b6]",
    danger: "bg-[#fff0f0] text-[#e11111]",
    muted: "bg-[#e5e9ef] text-[#172235]",
  };

  return (
    <article className="flex min-h-[112px] flex-col justify-between rounded-[6px] border border-[#cbd3df] bg-[#eef3fb] p-5">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-[4px] ${styles[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className={`text-sm font-bold ${tone === "danger" ? "text-[#e11111]" : "text-[#3156b6]"}`}>
          {value}
        </span>
      </div>
      <p className="text-sm font-medium uppercase tracking-[0.06em] text-[#697386]">{label}</p>
    </article>
  );
}

function ReadingInput({ value, placeholder = "...", error = "", onChange }) {
  return (
    <label className="grid gap-1">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`h-10 w-[96px] rounded-[2px] border bg-white px-3 text-center text-sm font-medium text-[#0f1d33] outline-none focus:ring-2 ${
          error
            ? "border-[#e11111] text-[#e11111] focus:ring-[#e11111]/10"
            : "border-[#cbd3df] focus:border-[#3156b6] focus:ring-[#3156b6]/10"
        }`}
      />
      {error && <span className="w-[96px] rounded-[2px] bg-[#ff2c2c] px-1 py-0.5 text-center text-[9px] font-bold text-white">{error}</span>}
    </label>
  );
}

function ProofButton({ active = false }) {
  if (active) {
    return (
      <button
        type="button"
        aria-label="Xem minh chứng"
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[2px] bg-black text-white"
      >
        <ImageIcon className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label="Tải minh chứng"
      className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-dashed border-[#9aa3b2] bg-white text-[#697386] transition hover:bg-[#eef3fb]"
    >
      <Camera className="h-5 w-5" />
    </button>
  );
}

function StatusBadge({ status }) {
  const styles = {
    "Hoàn tất": "bg-[#d9f8e7] text-[#12a451]",
    "Lỗi chỉ số": "bg-[#ffd9d9] text-[#c5161d]",
    "Chưa nhập": "bg-[#dceaff] text-[#3156b6]",
  };

  return (
    <span className={`inline-flex min-w-[76px] justify-center rounded-[8px] px-3 py-2 text-center text-xs font-medium leading-tight ${styles[status]}`}>
      {status}
    </span>
  );
}

const statusFilters = ["Tất cả", "Hoàn tất", "Lỗi chỉ số", "Chưa nhập"];

function FilterModal({ value, onChange, onClose, onApply }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-[1px]">
      <section className="w-full max-w-[420px] overflow-hidden rounded-lg border border-[#cbd3df] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.25)]">
        <header className="flex items-center justify-between border-b border-[#d7deea] px-5 py-4">
          <h2 className="text-xl font-bold text-[#0f1d33]">Bộ lọc chỉ số</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bộ lọc"
            className="flex h-9 w-9 items-center justify-center rounded-md text-[#4b5563] hover:bg-[#eef3fb]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-3 px-5 py-5">
          <p className="text-sm font-bold text-[#0f1d33]">Trạng thái</p>
          <div className="grid gap-2">
            {statusFilters.map((status) => (
              <label
                key={status}
                className={`flex cursor-pointer items-center justify-between rounded-md border px-4 py-3 text-sm font-bold transition ${
                  value === status
                    ? "border-[#3156b6] bg-[#eef3fb] text-[#3156b6]"
                    : "border-[#d7deea] bg-white text-[#0f1d33] hover:bg-[#f7f9fe]"
                }`}
              >
                <span>{status}</span>
                <input
                  type="radio"
                  name="meter-status-filter"
                  value={status}
                  checked={value === status}
                  onChange={(event) => onChange(event.target.value)}
                  className="h-4 w-4 accent-[#3156b6]"
                />
              </label>
            ))}
          </div>
        </div>

        <footer className="flex justify-end gap-3 bg-[#eef3fb] px-5 py-4">
          <button
            type="button"
            onClick={() => onChange("Tất cả")}
            className="h-10 rounded-md border border-[#cbd3df] bg-white px-4 text-sm font-bold text-[#4b5563] hover:bg-[#f7f9fe]"
          >
            Xóa lọc
          </button>
          <button
            type="button"
            onClick={onApply}
            className="h-10 rounded-md bg-[#3156b6] px-5 text-sm font-bold text-white hover:bg-[#24489f]"
          >
            Áp dụng
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function MeterReadingsPage() {
  const [rows, setRows] = useState(initialRooms);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Tất cả");

  const metrics = useMemo(
    () => ({
      done: rows.filter((row) => row.status === "Hoàn tất").length,
      errors: rows.filter((row) => row.status === "Lỗi chỉ số").length,
      unfinished: rows.filter((row) => row.status === "Chưa nhập").length + 7,
    }),
    [rows],
  );

  const visibleRows = useMemo(() => {
    if (statusFilter === "Tất cả") return rows;
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  function updateValue(index, key, value) {
    setRows((currentRows) =>
      currentRows.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        const nextRow = { ...row, [key]: value };
        const oldElectric = Number(String(nextRow.oldElectric).replace(/,/g, ""));
        const newElectric = Number(nextRow.newElectric);
        const oldWater = Number(String(nextRow.oldWater).replace(/,/g, ""));
        const newWater = Number(nextRow.newWater);

        if (nextRow.newElectric && Number.isFinite(newElectric) && newElectric < oldElectric) {
          nextRow.electricError = "Số mới < Số cũ";
          nextRow.status = "Lỗi chỉ số";
          return nextRow;
        }

        nextRow.electricError = "";
        if (nextRow.newElectric && nextRow.newWater && Number.isFinite(newWater) && newWater >= oldWater) {
          nextRow.status = "Hoàn tất";
        } else {
          nextRow.status = "Chưa nhập";
        }
        return nextRow;
      }),
    );
  }

  return (
    <div className="grid gap-6 pb-20 text-[#0f1d33]">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-[#4b5563]">Nhà trọ Hải Đăng 1 › Ghi chỉ số</p>
          <h1 className="mt-5 text-xl font-medium text-[#0f1d33]">
            Nhập chỉ số điện & nước - Tháng 10/2023
          </h1>
        </div>

        <div className="grid gap-3 lg:min-w-[330px]">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[#0f1d33]">Tiến độ: 12/24 phòng</span>
            <div className="h-2 min-w-[140px] flex-1 overflow-hidden rounded-full bg-[#dceaff]">
              <div className="h-full w-1/2 bg-[#3156b6]" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[4px] border border-[#cbd3df] bg-white px-4 text-sm font-bold text-[#0f1d33] transition hover:bg-[#eef3fb]"
            >
              <Filter className="h-4 w-4" />
              {statusFilter === "Tất cả" ? "Bộ lọc" : `Lọc: ${statusFilter}`}
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[4px] border border-[#cbd3df] bg-white px-4 text-sm font-bold text-[#0f1d33] transition hover:bg-[#eef3fb]"
            >
              <Download className="h-4 w-4" />
              Xuất File
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Bolt} value="+420 kWh" label="Tổng điện tiêu thụ" tone="electric" />
        <MetricCard icon={Droplet} value="+85 m³" label="Tổng nước tiêu thụ" tone="water" />
        <MetricCard icon={TriangleAlert} value={String(metrics.errors).padStart(2, "0")} label="Chỉ số bất thường" tone="danger" />
        <MetricCard icon={Clock} value={metrics.unfinished} label="Chưa hoàn tất" tone="muted" />
      </section>

      <section className="overflow-hidden rounded-[6px] border border-[#bfc9d8] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead>
              <tr className="bg-[#dfeaff] text-xs font-bold uppercase tracking-[0.04em] text-[#3e4b60]">
                <th rowSpan={2} className="w-[190px] px-4 py-4 align-middle">Phòng</th>
                <th colSpan={3} className="border-l border-[#bfc9d8] px-4 py-3 text-center">Chỉ số điện (kWh)</th>
                <th colSpan={3} className="border-l border-[#bfc9d8] px-4 py-3 text-center">Chỉ số nước (m³)</th>
                <th rowSpan={2} className="border-l border-[#bfc9d8] px-4 py-4 text-center align-middle">Trạng thái</th>
                <th rowSpan={2} className="w-12 px-4 py-4 align-middle" />
              </tr>
              <tr className="bg-[#eef3fb] text-xs font-bold text-[#3e4b60]">
                <th className="border-l border-[#bfc9d8] px-4 py-3 text-center">Cũ</th>
                <th className="px-4 py-3 text-center">Mới</th>
                <th className="px-4 py-3 text-center">Minh chứng</th>
                <th className="border-l border-[#bfc9d8] px-4 py-3 text-center">Cũ</th>
                <th className="px-4 py-3 text-center">Mới</th>
                <th className="px-4 py-3 text-center">Minh chứng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d7deea]">
              {visibleRows.map((row) => {
                const index = rows.indexOf(row);
                return (
                <tr key={`${row.id}-${index}`} className="bg-white align-middle">
                  <td className="px-4 py-4">
                    <p className="text-sm font-bold text-[#0f1d33]">{row.id}</p>
                    <p className="mt-0.5 max-w-[100px] text-sm leading-4 text-[#3e4b60]">{row.tenant}</p>
                  </td>
                  <td className="border-l border-[#bfc9d8] px-4 py-4 text-center text-sm font-medium text-[#4b5563]">{row.oldElectric}</td>
                  <td className="px-4 py-4">
                    <ReadingInput
                      value={row.newElectric}
                      placeholder="Nhập số"
                      error={row.electricError}
                      onChange={(value) => updateValue(index, "newElectric", value)}
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <ProofButton active={row.electricProof} />
                  </td>
                  <td className="border-l border-[#bfc9d8] px-4 py-4 text-center text-sm font-medium text-[#4b5563]">{row.oldWater}</td>
                  <td className="px-4 py-4">
                    <ReadingInput
                      value={row.newWater}
                      onChange={(value) => updateValue(index, "newWater", value)}
                    />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <ProofButton active={row.waterProof} />
                  </td>
                  <td className="border-l border-[#bfc9d8] px-4 py-4 text-center">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-4 text-center">
                    <button
                      type="button"
                      aria-label={`Thao tác ${row.id}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[4px] text-[#4b5563] transition hover:bg-[#eef3fb]"
                    >
                      <EllipsisVertical className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              );})}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm font-semibold text-[#697386]">
                    Không có phòng phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#d7deea] bg-white/95 px-4 py-4 shadow-[0_-8px_22px_rgba(15,23,42,0.08)] backdrop-blur lg:left-[280px]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#4b5563]">• Đang lưu tự động...</p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="h-11 rounded-[4px] border border-[#3156b6] bg-white px-7 text-sm font-bold text-[#3156b6] transition hover:bg-[#eef3fb]"
            >
              Lưu tạm
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[4px] bg-[#3156b6] px-7 text-sm font-bold text-white transition hover:bg-[#24489f]"
            >
              Hoàn tất
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {isFilterOpen && (
        <FilterModal
          value={statusFilter}
          onChange={setStatusFilter}
          onClose={() => setIsFilterOpen(false)}
          onApply={() => setIsFilterOpen(false)}
        />
      )}
    </div>
  );
}
