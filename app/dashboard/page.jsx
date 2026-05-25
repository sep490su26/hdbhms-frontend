"use client";

import {
  AlertTriangle,
  BadgeDollarSign,
  Check,
  DoorOpen,
  Gauge,
  Map,
  ShieldCheck,
} from "lucide-react";
import {
  allRooms,
  collectionItems,
  depositContracts,
  roles,
} from "../../services/dashboardService";
import { useAuth } from "./_contexts/AuthContext";

const money = new Intl.NumberFormat("vi-VN");

function formatMoney(value) {
  return `${money.format(value)} đ`;
}

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

function FinanceSummary() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {collectionItems.map((item) => (
        <Card key={item.label} className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#45474c]">{item.label}</p>
              <p className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[#091426]">{formatMoney(item.value)}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{item.delta}</span>
          </div>
        </Card>
      ))}
    </section>
  );
}

function FloorOccupancy({ compact = false }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-bold text-[#191c1e]">Tình trạng phòng theo tầng</h2>
        <Map className="h-5 w-5 text-[#505f76]" />
      </div>
      <div className={`mt-6 grid gap-3 ${compact ? "sm:grid-cols-2 xl:grid-cols-5" : "md:grid-cols-5"}`}>
        {[1, 2, 3, 4, 5].map((floor) => {
          const floorRooms = allRooms.filter((room) => room.floorNumber === floor);
          const occupied = floorRooms.filter((room) => room.status === "occupied").length;
          const percent = Math.round((occupied / floorRooms.length) * 100);

          return (
            <div key={floor} className="rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] p-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-[#091426]">Tầng {floor}</p>
                <p className="text-xs font-bold text-[#505f76]">{percent}%</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[#091426]" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-3 text-xs text-[#45474c]">
                {floorRooms.length - occupied} phòng trống / {floorRooms.length} phòng
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const selectedRole = roles.find((role) => role.id === user?.role) || roles[0];
  const deposits = depositContracts;

  const occupiedRooms = allRooms.filter((room) => room.status === "occupied").length;
  const availableRooms = allRooms.filter((room) => room.status === "available").length;
  const pendingDeposits = deposits.filter((deposit) => deposit.status === "pending").length;
  const riskyDeposits = deposits.filter((deposit) => ["overdue", "cancelled", "forfeited"].includes(deposit.status)).length;
  const monthlyRevenue = allRooms
    .filter((room) => room.status === "occupied")
    .reduce((total, room) => total + room.price, 0);

  return (
    <>
      <PageHeader
        title="Dashboard quản lý nhà trọ"
        description={selectedRole.description}
        actionLabel="Tạo phiếu xử lý"
        actionIcon={ShieldCheck}
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Gauge}
          label="Công suất thuê"
          value={`${Math.round((occupiedRooms / allRooms.length) * 100)}%`}
          subtext={`${occupiedRooms}/${allRooms.length} phòng đang thuê`}
        />
        <KpiCard
          icon={DoorOpen}
          label="Phòng còn trống"
          value={availableRooms}
          subtext="Có thể tạo hợp đồng cọc"
          tone="emerald"
        />
        <KpiCard
          icon={BadgeDollarSign}
          label="Cọc chờ duyệt"
          value={pendingDeposits}
          subtext="Cần kế toán đối soát"
          tone="amber"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Hồ sơ rủi ro"
          value={riskyDeposits}
          subtext="Quá hạn, hủy hoặc mất cọc"
          tone="rose"
        />
      </section>
      <FinanceSummary />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <FloorOccupancy compact />
        <Card className="p-6">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#45474c]">Doanh thu dự kiến</p>
          <p className="mt-3 text-3xl font-bold text-[#091426]">{formatMoney(monthlyRevenue)}</p>
          <p className="mt-4 text-sm leading-6 text-[#45474c]">
            Tính từ các phòng đang ở, giúp chủ trọ kiểm tra nhanh hiệu suất khai thác.
          </p>
        </Card>
      </section>
    </>
  );
}
