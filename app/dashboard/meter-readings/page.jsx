"use client";

import { Gauge } from "lucide-react";

export default function MeterReadingsPage() {
  return (
    <div className="grid gap-6 text-[#0f1d33]">
      <section>
        <h1 className="text-2xl font-bold tracking-[-0.01em]">Nhập số điện nước</h1>
        <p className="mt-2 text-sm leading-6 text-[#45474c]">
          Ghi nhận chỉ số điện, nước theo phòng từ dữ liệu hệ thống.
        </p>
      </section>

      <section className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-[#e2e8f0] bg-white px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3fb] text-[#3156b6]">
          <Gauge className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-lg font-bold">Chưa có API quản trị chỉ số điện nước</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#6b7280]">
          Dữ liệu phòng và chỉ số mẫu đã được gỡ. Màn hình sẽ hiển thị dữ liệu khi backend cung cấp endpoint đọc và lưu chỉ số.
        </p>
      </section>
    </div>
  );
}
