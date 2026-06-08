"use client";

import { FileSpreadsheet } from "lucide-react";

export default function FinancePage() {
  return (
    <div className="grid gap-6 text-[#0f1d33]">
      <section>
        <h1 className="text-2xl font-bold tracking-[-0.01em]">Báo cáo Tài chính</h1>
        <p className="mt-2 text-sm leading-6 text-[#45474c]">
          Theo dõi doanh thu, chi phí vận hành và hóa đơn từ dữ liệu hệ thống.
        </p>
      </section>

      <section className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-[#e2e8f0] bg-white px-6 text-center shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3fb] text-[#3156b6]">
          <FileSpreadsheet className="h-7 w-7" />
        </span>
        <h2 className="mt-5 text-lg font-bold">Chưa có dữ liệu tài chính từ API</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#6b7280]">
          Backend hiện chưa cung cấp endpoint quản trị cho danh sách hóa đơn và báo cáo tài chính. Màn hình không hiển thị dữ liệu mẫu.
        </p>
      </section>
    </div>
  );
}
