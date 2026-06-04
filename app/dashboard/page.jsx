"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CheckCircle2,
  Droplets,
  Eye,
  Flame,
  Gauge,
  UserPlus,
  Wrench,
} from "lucide-react";

const revenueBars = [
  { label: "T8", value: 58 },
  { label: "T9", value: 70 },
  { label: "T10", value: 78 },
  { label: "T11", value: 88 },
  { label: "T12", value: 100 },
  { label: "T1", value: 4 },
];

const activities = [
  {
    icon: CheckCircle2,
    tone: "green",
    title: "Thanh toán tiền phòng thành công: Phòng 302",
    time: "15 phút trước",
  },
  {
    icon: UserPlus,
    tone: "blue",
    title: "Người thuê mới: Trần Văn A đăng ký Phòng 105",
    time: "1 giờ trước",
  },
  {
    icon: Wrench,
    tone: "orange",
    title: "Yêu cầu sửa chữa: Phòng 401 - Hỏng vòi nước",
    time: "3 giờ trước",
  },
];

function SummaryCard({ icon: Icon, label, value, suffix, helper, tone = "blue", badge }) {
  const iconStyles = {
    blue: "bg-[#e7edff] text-[#3e5db7]",
    red: "bg-[#fff0f0] text-[#dc2626]",
    amber: "bg-[#fff3e4] text-[#9f6b20]",
  };

  return (
    <article className="min-h-[142px] rounded-[8px] border border-[#dce2ec] bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-[4px] ${iconStyles[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        {badge}
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.06em] text-[#4b5563]">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className={`text-2xl font-bold tracking-[-0.02em] ${tone === "red" ? "text-[#dc2626]" : "text-[#0f1d33]"}`}>
          {value}
        </p>
        {suffix && <span className="text-sm font-medium text-[#0f1d33]">{suffix}</span>}
      </div>
      {helper && <p className={`mt-3 text-xs ${tone === "red" ? "text-[#dc2626]" : "text-[#4b5563]"}`}>{helper}</p>}
    </article>
  );
}

function RevenueChart() {
  return (
    <section className="rounded-[8px] border border-[#dce2ec] bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-[#0f1d33]">Biểu đồ doanh thu</h2>
        <div className="flex rounded-[4px] bg-[#e8eefb] p-1">
          {["Tháng", "Quý", "Năm"].map((item, index) => (
            <button
              key={item}
              type="button"
              className={`h-8 min-w-16 rounded-[4px] px-4 text-xs font-bold ${
                index === 0 ? "bg-white text-[#3e5db7] shadow-sm" : "text-[#4b5563]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 flex h-[250px] items-end justify-between gap-5 px-2">
        {revenueBars.map((bar, index) => (
          <div key={bar.label} className="flex h-full flex-1 flex-col items-center justify-end gap-3">
            <div
              className={`w-full max-w-[58px] rounded-t-[2px] ${index === 5 ? "border border-dashed border-[#9fb1d4] bg-[#f8fbff]" : index === 4 ? "bg-[#435eac]" : "bg-[#6379bf]"}`}
              style={{ height: `${bar.value}%` }}
            />
            <span className="text-xs font-medium text-[#4b5563]">{bar.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function OccupancyCard() {
  return (
    <section className="rounded-[8px] border border-[#dce2ec] bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <h2 className="text-xl font-bold text-[#0f1d33]">Tỷ lệ lấp đầy</h2>
      <div className="mt-9 flex justify-center">
        <div
          className="grid h-52 w-52 place-items-center rounded-full"
          style={{ background: "conic-gradient(#435eac 0deg 331deg, #edf1f8 331deg 360deg)" }}
        >
          <div className="grid h-40 w-40 place-items-center rounded-full bg-white text-center">
            <div>
              <p className="text-4xl font-bold text-[#0f1d33]">92%</p>
              <p className="mt-1 text-sm font-medium text-[#4b5563]">Tháng hiện tại</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-2 text-[#0f1d33]">
            <span className="h-3 w-3 rounded-full bg-[#435eac]" />
            Đã thuê (46 phòng)
          </span>
          <span className="font-bold text-[#0f1d33]">92%</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-2 text-[#0f1d33]">
            <span className="h-3 w-3 rounded-full bg-[#c5161d]" />
            Phòng trống (4 phòng)
          </span>
          <span className="font-bold text-[#c5161d]">8%</span>
        </div>
      </div>
    </section>
  );
}

function ActivityIcon({ tone, icon: Icon }) {
  const styles = {
    green: "bg-[#dff8e9] text-[#12a451]",
    blue: "bg-[#dceaff] text-[#3156b6]",
    orange: "bg-[#fff0df] text-[#f97316]",
  };

  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${styles[tone]}`}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

function RecentActivities() {
  return (
    <section className="rounded-[8px] border border-[#dce2ec] bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-[#0f1d33]">Hoạt động gần đây</h2>
        <button type="button" className="text-xs font-bold text-[#3156b6]">
          Xem tất cả
        </button>
      </div>
      <div className="mt-8 grid gap-7">
        {activities.map((activity) => (
          <div key={activity.title} className="flex items-start gap-4">
            <ActivityIcon tone={activity.tone} icon={activity.icon} />
            <div>
              <p className="text-sm font-medium leading-5 text-[#0f1d33]">{activity.title}</p>
              <p className="mt-1 text-xs text-[#4b5563]">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UtilityCard({ type, value, delta, icon: Icon }) {
  const isElectric = type === "electric";

  return (
    <article className={`relative min-h-[106px] overflow-hidden rounded-[8px] p-6 text-white ${isElectric ? "bg-[#0f1d33]" : "bg-[#435eac]"}`}>
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-white/70">
        {isElectric ? "Tiêu thụ điện" : "Tiêu thụ nước"}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-3 text-xs text-white/70">{delta}</p>
      <Icon className="absolute -bottom-3 -right-3 h-20 w-20 text-white/10" />
    </article>
  );
}

function ContractExpiryCard() {
  return (
    <section className="rounded-[8px] border border-[#dce2ec] bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#4b5563]">Sắp hết hạn hợp đồng</p>
          <p className="mt-2 text-xl font-bold text-[#0f1d33]">12 Người thuê</p>
          <button type="button" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#3156b6]">
            Xem danh sách <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex -space-x-2">
          {[
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80",
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80",
          ].map((src) => (
            <span
              key={src}
              className="h-9 w-9 rounded-full border-2 border-white bg-cover bg-center"
              style={{ backgroundImage: `url('${src}')` }}
            />
          ))}
          <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#e8eefb] text-xs font-bold text-[#3156b6]">
            +10
          </span>
        </div>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <div className="grid gap-7 text-[#0f1d33]">
      <section>
        <h1 className="text-3xl font-bold tracking-[-0.02em] text-[#0f1d33]">Dashboard tổng quan</h1>
        <p className="mt-2 text-sm text-[#4b5563]">Thống kê hoạt động của Nhà trọ Hải Đăng</p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Banknote}
          label="Doanh thu tháng"
          value="125,000,000"
          suffix="VND"
          tone="blue"
          badge={<span className="text-xs font-bold text-[#12a451]">↗ +12%</span>}
        />
        <SummaryCard
          icon={Building2}
          label="Tỷ lệ lấp đầy"
          value="92%"
          tone="blue"
          badge={null}
        />
        <SummaryCard
          icon={Eye}
          label="Phòng trống"
          value="4"
          suffix="Phòng"
          helper="Đang xử lý dọn dẹp: 2"
          tone="red"
          badge={<span className="rounded-[3px] bg-[#ffe4e4] px-3 py-1 text-xs font-bold text-[#dc2626]">Cần chú ý</span>}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Tổng công nợ"
          value="15,400,000"
          suffix="VND"
          helper="Dự kiến thu hồi trong 3 ngày"
          tone="amber"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <RevenueChart />
        <OccupancyCard />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <RecentActivities />
        <div className="grid gap-6">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
            <UtilityCard type="electric" value="1,420 kWh" delta="+5% so với tháng trước" icon={Flame} />
            <UtilityCard type="water" value="85 m³" delta="-2% so với tháng trước" icon={Droplets} />
          </div>
          <ContractExpiryCard />
        </div>
      </section>
    </div>
  );
}
