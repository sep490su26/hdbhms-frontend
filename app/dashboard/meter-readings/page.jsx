"use client";

import { CalendarClock, Check, ClipboardCheck, Gauge } from "lucide-react";
import { allRooms } from "@/services/dashboardService";

function PageHeader({ title, description, actionLabel, actionIcon: ActionIcon = Check, onAction }) {
  return (
    <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.01em] text-[#191c1e]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#45474c]">{description}</p>
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-5 text-sm font-bold text-white hover:bg-[#16253a]"
        >
          <ActionIcon className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </section>
  );
}

function KpiCard({ icon: Icon, label, value, subtext, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <article className="flex min-h-[104px] items-center gap-4 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold uppercase tracking-[0.06em] text-[#45474c]">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#191c1e]">{value}</p>
        {subtext && <p className="mt-1 truncate text-xs text-[#6b7280]">{subtext}</p>}
      </div>
    </article>
  );
}

function Card({ children, className = "" }) {
  return (
    <section className={`rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] ${className}`}>
      {children}
    </section>
  );
}

export default function MeterReadingsPage() {
  const editableRooms = allRooms.slice(0, 6);

  return (
    <>
      <PageHeader
        title="Nhập số điện nước"
        description="Quản lý và Chủ trọ được nhập chỉ số điện nước thủ công theo từng phòng. Dữ liệu này dùng để đối soát hóa đơn cuối kỳ."
        actionLabel="Lưu chỉ số"
        actionIcon={Check}
      />
      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard icon={Gauge} label="Phòng cần nhập" value={editableRooms.length} />
        <KpiCard icon={CalendarClock} label="Kỳ ghi chỉ số" value="05/2026" tone="amber" />
        <KpiCard icon={ClipboardCheck} label="Đã rà soát" value="4/6" tone="emerald" />
      </section>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] p-5">
          <h2 className="font-bold text-[#091426]">Bảng nhập chỉ số thủ công</h2>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Manager/Admin</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-bold uppercase tracking-[0.06em] text-[#505f76]">
              <tr>
                <th className="px-5 py-4">Phòng</th>
                <th className="px-5 py-4">Tầng</th>
                <th className="px-5 py-4">Điện kỳ trước</th>
                <th className="px-5 py-4">Điện kỳ này</th>
                <th className="px-5 py-4">Nước kỳ trước</th>
                <th className="px-5 py-4">Nước kỳ này</th>
                <th className="px-5 py-4">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {editableRooms.map((room, index) => (
                <tr key={room.id} className="border-t border-[#e2e8f0]">
                  <td className="px-5 py-4 font-bold text-[#091426]">{room.id}</td>
                  <td className="px-5 py-4 text-[#45474c]">{room.floor}</td>
                  <td className="px-5 py-4 text-[#45474c]">{1200 + index * 18}</td>
                  <td className="px-5 py-4">
                    <input
                      className="h-10 w-28 rounded-lg border border-[#c5c6cd] px-3 text-sm font-semibold text-[#091426] outline-none focus:border-[#091426]"
                      defaultValue={1236 + index * 18}
                    />
                  </td>
                  <td className="px-5 py-4 text-[#45474c]">{80 + index * 3}</td>
                  <td className="px-5 py-4">
                    <input
                      className="h-10 w-28 rounded-lg border border-[#c5c6cd] px-3 text-sm font-semibold text-[#091426] outline-none focus:border-[#091426]"
                      defaultValue={86 + index * 3}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <input
                      className="h-10 w-full min-w-44 rounded-lg border border-[#c5c6cd] px-3 text-sm text-[#091426] outline-none focus:border-[#091426]"
                      placeholder="Nhập ghi chú"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
