import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#091426] border-t border-white/5 pt-12 pb-8">
      <div className="w-full px-6 sm:px-8 lg:px-12 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 mb-16">
          {/* Cột 1: Giới thiệu Building */}
          <div className="flex flex-col gap-6">
            <h2 className="text-xl font-bold text-white">Hải Đăng Building</h2>
            <p className="text-base text-slate-200 leading-relaxed pr-4">
              Hệ thống phòng trọ Hải Đăng tiện nghi, an toàn và phù hợp cho sinh
              viên, người đi làm tại Hòa Lạc.
            </p>
          </div>

          {/* Cột 2: Liên Kết Nhanh */}
          <div className="flex flex-col gap-6">
            <h2 className="text-xl font-bold text-white">Liên Kết Nhanh</h2>
            <ul className="flex flex-col gap-5">
              <li>
                <Link
                  href="/"
                  className="text-base font-semibold text-white hover:text-blue-400 transition-colors"
                >
                  Trang Chủ
                </Link>
              </li>
              <li>
                <Link
                  href="/rooms"
                  className="text-base font-semibold text-white hover:text-blue-400 transition-colors"
                >
                  Tầng & Phòng
                </Link>
              </li>
              <li>
                <Link
                  href="/rules"
                  className="text-base font-semibold text-white hover:text-blue-400 transition-colors"
                >
                  Nội Quy
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 3: Liên Hệ */}
          <div className="flex flex-col gap-6">
            <h2 className="text-xl font-bold text-white">Liên Hệ</h2>
            <ul className="flex flex-col gap-5 text-base text-slate-200">
              <li>
                <span className="font-bold text-white">Hotline:</span>{" "}
                0914.339.682; 0846.557.999
              </li>
              <li className="leading-relaxed">
                <span className="font-bold text-white">Địa Chỉ:</span> Số 70A1,
                Thôn 4, xã Thạch Hoà, Thạch Thất, Hà Nội
              </li>
              <li>
                <span className="font-bold text-white">Giờ Làm:</span> 24/7 (Tất
                cả các ngày)
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar (Giữ lại để đảm bảo chuẩn UX/UI của Footer) */}
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-400">
            © 2026 Hải Đăng Building. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <Link
              href="/privacy"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Chính sách bảo mật
            </Link>
            <Link
              href="/terms"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Nội quy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
