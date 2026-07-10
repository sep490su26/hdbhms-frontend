"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Droplets,
  HandCoins,
  Home,
  UserPlus,
  Wrench,
  Zap,
} from "lucide-react";

const revenueBars = [
  { label: "T8", value: 58 },
  { label: "T9", value: 70 },
  { label: "T10", value: 78 },
  { label: "T11", value: 88 },
  { label: "T12", value: 100 },
  { label: "T1", value: 7 },
];

const activities = [
  {
    icon: CheckCircle2,
    title: "Thanh toán tiền phòng thành công: Phòng 302",
    time: "15 phút trước",
    tone: "success",
  },
  {
    icon: UserPlus,
    title: "Người thuê mới: Trần Văn A đăng ký Phòng 105",
    time: "1 giờ trước",
    tone: "info",
  },
  {
    icon: Wrench,
    title: "Yêu cầu sửa chữa: Phòng 401 - Hỏng vòi nước",
    time: "3 giờ trước",
    tone: "warning",
  },
];

const expiringTenants = ["NH", "LT", "VA"];

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  note,
  badge,
  badgeTone = "green",
  accent = "blue",
}) {
  const accentClasses = {
    blue: "bg-[#eef3ff] text-[#4360b6]",
    red: "bg-[#fff1f1] text-[#df2727]",
    amber: "bg-[#fff4e8] text-[#8f5b22]",
  };

  const badgeClasses = {
    green: "bg-[#e8fbef] text-[#14934a]",
    red: "bg-[#ffe5e5] text-[#d72222]",
  };

  return (
    <article className="rounded-lg border border-[#dfe5f0] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded ${accentClasses[accent]}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        {badge && (
          <span
            className={`rounded px-2.5 py-1 text-xs font-bold ${badgeClasses[badgeTone]}`}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="mt-5 text-xs font-bold uppercase text-[#526070]">{label}</p>
      <div className="mt-2 flex items-baseline gap-1.5 text-[#102039]">
        <span className="text-2xl font-extrabold leading-none">{value}</span>
        {suffix && <span className="text-sm font-semibold">{suffix}</span>}
      </div>
      {note && <p className="mt-3 text-xs font-semibold text-[#d71920]">{note}</p>}
    </article>
  );
}

function SegmentControl() {
  return (
    <div className="inline-grid h-9 grid-cols-3 rounded bg-[#eef3fb] p-1 text-xs font-bold text-[#4b5563]">
      <button className="rounded bg-white px-5 text-[#4360b6] shadow-sm" type="button">
        Tháng
      </button>
      <button className="rounded px-5" type="button">
        Quý
      </button>
      <button className="rounded px-5" type="button">
        Năm
      </button>
    </div>
  );
}

function RevenueChart() {
  return (
    <section className="rounded-lg border border-[#dfe5f0] bg-white p-6 shadow-sm lg:col-span-2">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-[#102039]">Biểu đồ doanh thu</h2>
        <SegmentControl />
      </div>
      <div className="flex h-[285px] items-end gap-8 border-b border-[#e5ebf4] px-2 sm:gap-12">
        {revenueBars.map((item, index) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
            <div className="flex h-[230px] w-full max-w-[56px] items-end">
              <div
                className={`w-full rounded-t ${
                  index === 4 ? "bg-[#425db3]" : "bg-[#647bc0]"
                } ${index === 5 ? "border border-dashed border-[#b9c5dc] bg-[#f4f7fc]" : ""}`}
                style={{ height: `${item.value}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-[#4c596c]">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function OccupancyChart() {
  return (
    <section className="rounded-lg border border-[#dfe5f0] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-extrabold text-[#102039]">Tỷ lệ lấp đầy</h2>
      <div className="mt-8 flex justify-center">
        <div className="grid h-48 w-48 place-items-center rounded-full bg-[conic-gradient(#425db3_0_92%,#eef2fa_92%_100%)]">
          <div className="grid h-36 w-36 place-items-center rounded-full bg-white text-center">
            <div>
              <p className="text-4xl font-extrabold text-[#102039]">92%</p>
              <p className="mt-1 text-sm font-semibold text-[#4b5563]">
                Tháng hiện tại
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8 space-y-3 text-sm font-semibold">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-[#334155]">
            <i className="h-3 w-3 rounded-full bg-[#425db3]" />
            Đã thuê (46 phòng)
          </span>
          <span className="text-[#102039]">92%</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-[#334155]">
            <i className="h-3 w-3 rounded-full bg-[#c5161d]" />
            Phòng trống (4 phòng)
          </span>
          <span className="text-[#c5161d]">8%</span>
        </div>
      </div>
    </section>
  );
}

function ActivityFeed() {
  const toneClasses = {
    success: "bg-[#dcfce7] text-[#16a34a]",
    info: "bg-[#dbeafe] text-[#315ac8]",
    warning: "bg-[#ffedd5] text-[#ef5f1b]",
  };

  return (
    <section className="rounded-lg border border-[#dfe5f0] bg-white p-6 shadow-sm">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold text-[#102039]">Hoạt động gần đây</h2>
        <Link href="/dashboard/requests" className="text-sm font-bold text-[#315ac8]">
          Xem tất cả
        </Link>
      </div>
      <div className="space-y-7">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.title} className="flex items-center gap-4">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClasses[activity.tone]}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#253146]">
                  {activity.title}
                </p>
                <p className="mt-1 text-xs font-medium text-[#6b7280]">
                  {activity.time}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function UtilityCard({ icon: Icon, label, value, note, dark = false }) {
  return (
    <article
      className={`relative overflow-hidden rounded-lg p-6 shadow-sm ${
        dark ? "bg-[#102039] text-white" : "bg-[#425db3] text-white"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-white/55">{label}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold">{value}</span>
      </div>
      <p className="mt-5 text-xs font-medium text-white/70">{note}</p>
      <Icon className="absolute -bottom-3 -right-3 h-20 w-20 text-white/10" />
    </article>
  );
}

function ExpiringContractCard() {
  return (
    <section className="rounded-lg border border-[#dfe5f0] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-[#6b7280]">
            Sắp hết hạn hợp đồng
          </p>
          <p className="mt-2 text-2xl font-extrabold text-[#102039]">12 Người thuê</p>
          <Link
            href="/dashboard/tenants"
            className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#315ac8]"
          >
            Xem danh sách <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex -space-x-3">
          {expiringTenants.map((initials) => (
            <span
              key={initials}
              className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-[#dbe7ff] text-xs font-extrabold text-[#315ac8]"
            >
              {initials}
            </span>
          ))}
          <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-[#e9eef9] text-xs font-bold text-[#42526b]">
            +10
          </span>
        </div>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <div className="w-full min-w-0 bg-[#f6f8fd] text-[#102039]">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-normal">
          Dashboard tổng quan
        </h1>
        <p className="mt-1 text-sm font-medium text-[#5c6878]">
          Thống kê hoạt động của Nhà trọ Hải Đăng
        </p>
      </header>

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={HandCoins}
          label="Doanh thu tháng"
          value="125,000,000"
          suffix="VND"
          badge="+12%"
        />
        <StatCard
          icon={Building2}
          label="Tỷ lệ lấp đầy"
          value="92%"
          badge=""
        />
        <StatCard
          icon={DoorOpenIcon}
          label="Phòng trống"
          value="4"
          suffix="Phòng"
          note="Đang xử lý dọn dẹp: 2"
          badge="Cần chú ý"
          badgeTone="red"
          accent="red"
        />
        <StatCard
          icon={AlertTriangle}
          label="Tổng công nợ"
          value="15,400,000"
          suffix="VND"
          note="Dự kiến thu hồi trong 3 ngày"
          accent="amber"
        />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <RevenueChart />
        <OccupancyChart />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ActivityFeed />
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <UtilityCard
              icon={Zap}
              label="Tiêu thụ điện"
              value="1,420 kWh"
              note="+5% so với tháng trước"
              dark
            />
            <UtilityCard
              icon={Droplets}
              label="Tiêu thụ nước"
              value="85 m³"
              note="-2% so với tháng trước"
            />
          </div>
          <ExpiringContractCard />
        </div>
      </section>
    </div>
  );
}

function DoorOpenIcon(props) {
  return <Home {...props} />;
}
