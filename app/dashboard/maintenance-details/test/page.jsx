"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  BadgeInfo,
  Camera,
  CheckCircle2,
  Clock3,
  FileVideo,
  ImageIcon,
  MapPin,
  Printer,
  Upload,
  Wrench,
  Star,
  ChevronRight,
} from "lucide-react";

const timelineBase = [
  {
    label: "Đã báo hỏng",
    time: "24/10, 09:15 AM",
    actor: "Khách thuê: Trần Thị B",
  },
  {
    label: "Đang xử lý",
    time: "24/10, 10:45 AM",
    actor: "Thợ: Nguyễn Văn A",
  },
  {
    label: "Đã tiếp nhận",
    time: "24/10, 09:40 AM",
    actor: "Quản lý tòa nhà",
  },
  {
    label: "Đã hoàn tất",
    time: "24/10, 02:10 PM",
    actor: "Chờ khách xác nhận",
  },
];

const beforeAssets = [
  {
    kind: "image",
    label: "Ảnh phòng",
    src: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
  },
  {
    kind: "image",
    label: "Tủ điện",
    src: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80",
  },
  {
    kind: "file",
    label: "Video_Minh_Chung.mp4",
  },
];

const repairItems = [
  { name: "Chân LED 12W", quantity: 1, price: 12000 },
  { name: "Dây đồng (m)", quantity: 2, price: 15000 },
];

function moneyFormat(value) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-[#d9e1ef] dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-[0_1px_2px_rgba(9,20,38,0.06)] ${className}`}
    >
      {children}
    </section>
  );
}

function SectionTitle({ icon: Icon, title, action }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e9efff] text-[#3556a8]">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="rounded-lg bg-[#eef3ff] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function AttachmentTile({ item }) {
  if (item.kind === "file") {
    return (
      <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-[#cbd5e1] dark:border-white/10 bg-[#fafbff] dark:bg-white/5 p-4 text-center">
        <FileVideo className="h-9 w-9 text-slate-500 dark:text-slate-400" />
        <p className="mt-4 max-w-[160px] break-words text-xs font-semibold text-slate-600 dark:text-slate-300">
          {item.label}
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[160px] overflow-hidden rounded-lg border border-[#d9e1ef] dark:border-white/10 bg-[#eef2ff]">
      <Image
        src={item.src}
        alt={item.label}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, 240px"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0f172a]/70 to-transparent px-3 py-3">
        <p className="text-xs font-semibold text-white">{item.label}</p>
      </div>
    </div>
  );
}

function Timeline({ currentIndex }) {
  return (
    <div className="space-y-4">
      {timelineBase.map((step, index) => {
        const active = index === currentIndex;
        const done = index < currentIndex;

        return (
          <div key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${
                  active
                    ? "border-[#93c5fd] bg-[#e0ecff] text-[#1d4ed8]"
                    : done
                      ? "border-[#4ade80] bg-[#dcfce7] text-[#166534]"
                      : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
              </span>
              {index < timelineBase.length - 1 && (
                <span className="mt-2 h-full w-px bg-white/10" />
              )}
            </div>
            <div className="min-w-0 pb-2">
              <p
                className={`text-sm font-bold ${active ? "text-white" : done ? "text-slate-100" : "text-slate-400"}`}
              >
                {step.label}
              </p>
              <p className="mt-1 text-xs text-slate-400">{step.time}</p>
              <p className="mt-1 text-xs text-slate-500">{step.actor}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RatingStars() {
  return (
    <div className="flex gap-1 text-slate-300">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className="h-4 w-4" />
      ))}
    </div>
  );
}

export default function MaintenanceDetailTestPage() {
  const [currentStage, setCurrentStage] = useState(1);
  const [status, setStatus] = useState("Đang xử lý");
  const [notice, setNotice] = useState(
    "Ticket đã được gắn vào luồng test để bạn kiểm tra UI.",
  );

  const summary = useMemo(
    () => ({
      totalCost: repairItems.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      ),
      stageLabel: timelineBase[currentStage]?.label || status,
    }),
    [currentStage, status],
  );

  const progressTone =
    status === "Đã hoàn tất"
      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : "bg-amber-50 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300";

  const advanceProgress = () => {
    setCurrentStage((value) => Math.min(value + 1, timelineBase.length - 1));
    setStatus("Đang xử lý");
    setNotice("Tiến độ vừa được cập nhật trong màn test.");
  };

  const completeTicket = () => {
    setCurrentStage(timelineBase.length - 1);
    setStatus("Đã hoàn tất");
    setNotice("Ticket đã được đánh dấu hoàn tất.");
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] dark:bg-white/5 px-4 py-6 text-slate-900 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard/maintenance"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách bảo trì
          </Link>
          <div className="rounded-full bg-[#1e40af] dark:bg-[#2563eb] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
            Đường dẫn test
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-[#d9e1ef] dark:border-white/10 bg-white dark:bg-[#0f172a] px-4 py-3 shadow-[0_1px_2px_rgba(9,20,38,0.05)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e9efff] text-[#3556a8]">
              <BadgeInfo className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{notice}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Đồng bộ lần cuối 2 phút trước.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <Clock3 className="h-4 w-4" />
            24/10/2023 · 09:15 AM
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-6">
            <section className="flex flex-col gap-4 rounded-xl border border-[#d9e1ef] dark:border-white/10 bg-white dark:bg-[#0f172a] p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)] lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-black tracking-[-0.02em] text-slate-900 dark:text-white">
                    Ticket T-1002
                  </h1>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${progressTone}`}
                  >
                    {status}
                  </span>
                </div>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Clock3 className="h-4 w-4" />
                  Ngày tạo: 24/10/2023 · 09:15 AM
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={advanceProgress}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#c9d4ea] dark:border-white/10 bg-white dark:bg-[#0f172a] px-4 text-sm font-bold text-slate-900 dark:text-white hover:bg-[#f7faff] dark:hover:bg-white/5"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  Cập nhật tiến độ
                </button>
                <button
                  type="button"
                  onClick={completeTicket}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0f172a] px-4 text-sm font-bold text-white hover:bg-[#111827]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Đánh dấu hoàn tất
                </button>
              </div>
            </section>

            <Card className="p-5">
              <SectionTitle icon={BadgeInfo} title="Chi tiết sự cố" />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <StatBlock label="Loại sự cố" value="Điện" />
                <StatBlock label="Vị trí/Phòng" value="P.102 (Tầng 1)" />
              </div>
              <div className="mt-4 rounded-lg bg-[#f8fbff] dark:bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                  Mô tả
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                  Đèn nhấp nháy liên tục ở khu vực phòng khách. Người thuê báo
                  cáo tình trạng này xảy ra thường xuyên khi bật điều hòa. Có
                  thể do lỏng kết nối từ trần hoặc hỏng chấn lưu LED.
                </p>
              </div>
            </Card>

            <Card className="p-5">
              <SectionTitle
                icon={ImageIcon}
                title="Trước khi sửa"
                action={
                  <span className="rounded-full bg-[#e9efff] px-2.5 py-1 text-[11px] font-bold text-[#3556a8]">
                    3 tệp
                  </span>
                }
              />
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {beforeAssets.map((item) => (
                  <AttachmentTile key={item.label} item={item} />
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <SectionTitle icon={Upload} title="Sau khi sửa" />
              <div className="mt-4 rounded-xl border border-dashed border-[#c9d4ea] dark:border-white/10 bg-[#fbfcff] dark:bg-white/5 p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3ff] text-[#3556a8]">
                  <Camera className="h-6 w-6" />
                </div>
                <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                  Chưa có ảnh sau khi sửa chữa
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Thêm ảnh hoàn tất để khách thuê dễ đối chiếu.
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#c9d4ea] dark:border-white/10 bg-white dark:bg-[#0f172a] px-4 py-2 text-sm font-bold text-slate-900 dark:text-white hover:bg-[#f7faff] dark:hover:bg-white/5"
                >
                  <Upload className="h-4 w-4" />
                  Tải lên ảnh hoàn tất
                </button>
              </div>
            </Card>

            <Card className="p-5">
              <SectionTitle icon={Wrench} title="Chi tiết thực hiện" />
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-[#fbfcff] dark:bg-white/5 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                    Thợ sửa
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dbeafe] text-sm font-black text-[#1d4ed8]">
                      NV
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        Nguyễn Văn A
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Thợ điện báo cáo</p>
                    </div>
                  </div>

                  <div className="mt-4 divide-y divide-[#e2e8f0]">
                    {repairItems.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between gap-4 py-2 text-sm"
                      >
                        <span className="text-slate-700 dark:text-slate-200">{item.name}</span>
                        <span className="shrink-0 font-bold text-slate-900 dark:text-white">
                          {item.quantity} x {moneyFormat(item.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-[#eef3ff] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                    Tổng chi phí thực tế
                  </p>
                  <p className="mt-3 text-4xl font-black tracking-[-0.03em] text-[#163fa3]">
                    {moneyFormat(summary.totalCost)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#3556a8]">
                    VND
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <SectionTitle icon={Star} title="Đánh giá của khách" />
              <div className="mt-4 rounded-xl bg-[#f3f6ff] dark:bg-white/5 p-5">
                <div className="flex items-center justify-center">
                  <RatingStars />
                </div>
                <p className="mt-4 text-center text-sm italic leading-6 text-slate-600 dark:text-slate-300">
                  “Khách thuê chưa gửi đánh giá. Yêu cầu đánh giá sẽ được gửi
                  sau khi hoàn tất.”
                </p>
              </div>
            </Card>
          </div>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <Card className="overflow-hidden bg-[#0f172a] text-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
              <div className="border-b border-white/10 px-5 py-4">
                <p className="text-sm font-bold">Tiến độ xử lý</p>
                <p className="mt-1 text-xs text-slate-400">
                  Theo dõi trạng thái ticket theo từng mốc.
                </p>
              </div>

              <div className="px-5 py-5">
                <Timeline currentIndex={currentStage} />
              </div>

              <div className="border-t border-white/10 px-5 py-4">
                <button
                  type="button"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/15"
                >
                  <Printer className="h-4 w-4" />
                  In phiếu sửa chữa
                </button>
              </div>
            </Card>

            <div className="mt-4 grid gap-3 rounded-xl border border-[#d9e1ef] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e9efff] text-[#3556a8]">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Vị trí</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">P.102 - Tầng 1</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e9efff] text-[#3556a8]">
                  <Clock3 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    Mốc hiện tại
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{summary.stageLabel}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
