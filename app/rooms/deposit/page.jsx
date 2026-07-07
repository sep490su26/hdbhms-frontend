import { Suspense } from "react";
import { DepositClient } from "./DepositClient";

function DepositLoading() {
  return (
    <div className="min-h-screen bg-[#fbf8fa] px-4 pb-20 pt-8 text-[#091426] sm:px-6 lg:px-12">
      <div className="mx-auto max-w-2xl rounded-xl border border-[#c5c6cd] bg-white p-8 text-center shadow-[0_4px_10px_rgba(9,20,38,0.04)]">
        <h1 className="text-2xl font-bold">Đang tải phòng</h1>
        <p className="mt-3 text-sm leading-6 text-[#45474c]">
          Hệ thống đang tải thông tin phòng từ đường dẫn đặt cọc.
        </p>
      </div>
    </div>
  );
}

export default function DepositPage() {
  return (
    <Suspense fallback={<DepositLoading />}>
      <DepositClient />
    </Suspense>
  );
}
