"use client";

import { Settings } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default function SettingsPage() {
  return (
    <div className="grid gap-6 text-slate-900 dark:text-white">
      <DashboardPageHeader
        title="Cấu hình hệ thống"
        description="Quản lý đơn giá điện, nước và phí dịch vụ từ dữ liệu hệ thống."
      />

      <section className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3fb] text-[#3156b6]">
          <Settings className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-lg font-bold">Chưa có API cấu hình đơn giá</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Đơn giá và lịch sử điều chỉnh mẫu đã được gỡ. Chức năng lưu sẽ được
          bật khi backend cung cấp endpoint đọc và cập nhật cấu hình.
        </p>
      </section>
    </div>
  );
}
