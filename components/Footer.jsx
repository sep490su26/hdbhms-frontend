import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#091426] border-t border-white/5 pt-16 pb-8">
      <div className="w-full px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
          {/* Logo Column */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="font-bold text-xl text-white flex items-center gap-2 mb-4"
            >
              <div className="w-8 h-8 bg-white rounded-md"></div>
              Hải Đăng
            </Link>
            <p className="text-sm text-slate-400 max-w-xs">
              Hệ thống quản lý phòng trọ hiện đại, an toàn và tiện lợi.
            </p>
          </div>

          {/* Khám phá */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Khám phá
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/rooms"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Phòng trọ
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Liên hệ
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link
                  href="/details"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Chi tiết
                </Link>
              </li>
            </ul>
          </div>

          {/* Hỗ trợ */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Hỗ trợ
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/faq"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Câu hỏi
                </Link>
              </li>
              <li>
                <Link
                  href="/guide"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Hướng dẫn
                </Link>
              </li>
              <li>
                <Link
                  href="/policy"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Chính sách
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Điều khoản
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Bảo mật
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-400">
            © 2026 Hải Đăng Boarding House Management
          </p>
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <Link
              href="/privacy"
              className="text-sm text-slate-400 hover:text-white underline transition-colors"
            >
              Chính sách bảo mật
            </Link>
            <Link
              href="/terms"
              className="text-sm text-slate-400 hover:text-white underline transition-colors"
            >
              Điều khoản dịch vụ
            </Link>
            <button className="text-sm text-slate-400 hover:text-white underline transition-colors">
              Cài đặt cookie
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
