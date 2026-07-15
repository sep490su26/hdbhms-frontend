import { Suspense } from "react";
import { BatchDepositClient } from "./BatchDepositClient";

function BatchDepositLoading() {
  return (
    <main className="min-h-screen bg-[#f5f3f4] px-4 pb-16 pt-28 text-[#091426] sm:px-6">
      <div className="mx-auto max-w-2xl rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black">Đang tải danh sách phòng</h1>
        <p className="mt-3 text-sm leading-6 text-[#45474c]">
          Hệ thống đang kiểm tra các phòng đã chọn trước khi đặt cọc.
        </p>
      </div>
    </main>
  );
}

export default function BatchDepositPage() {
  return (
    <Suspense fallback={<BatchDepositLoading />}>
      <BatchDepositClient />
    </Suspense>
  );
}
