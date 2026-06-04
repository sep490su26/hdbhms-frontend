"use client";

import { useState } from "react";
import {
  Download,
  Info,
  Landmark,
  Save,
  Sparkles,
} from "lucide-react";

const historyRows = [
  {
    effectiveDate: "01/10/2023",
    electric: "3.500",
    water: "25.000",
    service: "150.000",
    updater: "Trần Văn A",
    initials: "TV",
    tone: "blue",
  },
  {
    effectiveDate: "01/01/2023",
    electric: "3.200",
    water: "22.000",
    service: "120.000",
    updater: "Lê Hoàng",
    initials: "LH",
    tone: "indigo",
  },
  {
    effectiveDate: "01/06/2022",
    electric: "3.000",
    water: "20.000",
    service: "100.000",
    updater: "HS thnng",
    initials: "Admin",
    tone: "orange",
  },
];

function PriceInput({ label, value, unit, helper, onChange }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[#0f1d33]">{label}</span>
      <span className="flex h-11 items-center overflow-hidden rounded-[4px] border border-[#7f8794] bg-white focus-within:border-[#0f1d33] focus-within:ring-2 focus-within:ring-[#0f1d33]/10">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-base font-medium text-[#0f1d33] outline-none"
        />
        <span className="shrink-0 px-4 text-base font-medium text-[#303846]">{unit}</span>
      </span>
      {helper && <span className="text-xs text-[#6b7280]">{helper}</span>}
    </label>
  );
}

function UserBadge({ initials, tone }) {
  const styles = {
    blue: "bg-[#dfeaff] text-[#3156b6]",
    indigo: "bg-[#e8e7ff] text-[#4f46e5]",
    orange: "bg-[#ffe6cc] text-[#9a5a00]",
  };

  return (
    <span className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold ${styles[tone]}`}>
      {initials}
    </span>
  );
}

export default function SettingsPage() {
  const [electricPrice, setElectricPrice] = useState("3.500");
  const [waterPrice, setWaterPrice] = useState("20.000");
  const [serviceFee, setServiceFee] = useState("50.000");
  const [discountThreshold, setDiscountThreshold] = useState("100.000");

  return (
    <div className="grid gap-5 text-[#0f1d33]">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.02em] text-[#0f1d33]">
            Cấu hình Đơn giá & Phí
          </h1>
          <p className="mt-2 text-sm text-[#4b5563]">
            Nhà trọ Hải Đăng 1 • Cập nhật lần cuối: 15/09/2023
          </p>
        </div>

        <div className="flex min-h-[58px] items-center gap-4 rounded-[4px] border-l-4 border-[#3156b6] bg-[#dce8ff] px-5 py-4 text-[#3156b6]">
          <Info className="h-5 w-5 shrink-0" />
          <p className="text-sm font-bold leading-6">
            Giá mới sẽ áp dụng từ chu kỳ thanh toán tiếp theo (Tháng 11/2023).
          </p>
        </div>
      </section>

      <section className="rounded-[8px] border border-[#bfc7d5] bg-white p-7 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-2">
          <Landmark className="h-6 w-6 text-[#0f1d33]" />
          <h2 className="text-2xl font-bold tracking-[-0.01em] text-[#0f1d33]">Cấu hình Đơn giá</h2>
        </div>

        <div className="mt-7 border-t border-[#bfc7d5] pt-7">
          <div className="grid gap-7 lg:grid-cols-3">
            <PriceInput
              label="Giá Điện"
              value={electricPrice}
              unit="đ/kWh"
              helper="Giá nhà nước hiện tại: ~1.700đ - 3.000đ"
              onChange={setElectricPrice}
            />
            <PriceInput
              label="Giá Nước"
              value={waterPrice}
              unit="đ/m³"
              onChange={setWaterPrice}
            />
            <PriceInput
              label="Phí Dịch vụ"
              value={serviceFee}
              unit="đ/phòng/tháng"
              onChange={setServiceFee}
            />
          </div>

          <div className="mt-7 rounded-[4px] border border-dashed border-[#6b7280] bg-[#eef5ff] p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#3156b6]" />
              <h3 className="text-sm font-bold uppercase tracking-[0.04em] text-[#0f1d33]">
                Chính sách ưu đãi
              </h3>
            </div>
            <div className="mt-4 max-w-[380px]">
              <PriceInput
                label=""
                value={discountThreshold}
                unit="đ"
                helper="Miễn phí dịch vụ nếu tiền điện sử dụng thấp hơn mức này."
                onChange={setDiscountThreshold}
              />
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-[#bfc7d5] pt-7 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="h-12 rounded-[4px] border border-[#7f8794] bg-white px-8 text-base font-medium text-[#0f1d33] transition hover:bg-[#f4f7fb]"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[4px] bg-black px-8 text-base font-medium text-white transition hover:bg-[#172235]"
            >
              <Save className="h-5 w-5" />
              Lưu thay đổi
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[8px] border border-[#bfc7d5] bg-white shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-4 px-7 py-6">
          <h2 className="text-2xl font-bold tracking-[-0.01em] text-[#0f1d33]">Lịch sử điều chỉnh</h2>
          <button
            type="button"
            className="inline-flex items-center gap-2 text-base font-medium text-[#0f1d33] transition hover:text-[#3156b6]"
          >
            <Download className="h-4 w-4" />
            Xuất file
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[#eaf0fb] text-sm font-medium text-[#4b5563]">
              <tr>
                <th className="px-7 py-4">Ngày áp dụng</th>
                <th className="px-7 py-4">Điện (đ/kWh)</th>
                <th className="px-7 py-4">Nước (đ/m³)</th>
                <th className="px-7 py-4">Dịch vụ</th>
                <th className="px-7 py-4">Người cập nhật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d7deea]">
              {historyRows.map((row) => (
                <tr key={row.effectiveDate} className="bg-white">
                  <td className="px-7 py-5 text-base font-bold text-[#0f1d33]">{row.effectiveDate}</td>
                  <td className="px-7 py-5 text-base font-medium text-[#0f1d33]">{row.electric}</td>
                  <td className="px-7 py-5 text-base font-medium text-[#0f1d33]">{row.water}</td>
                  <td className="px-7 py-5 text-base font-medium text-[#0f1d33]">{row.service}</td>
                  <td className="px-7 py-5">
                    <div className="flex items-center gap-3">
                      <UserBadge initials={row.initials} tone={row.tone} />
                      <span className="text-base font-medium text-[#0f1d33]">{row.updater}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
