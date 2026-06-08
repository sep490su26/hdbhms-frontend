import React from "react";
import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t border-[#3c4554] bg-[#1d293a] px-6 py-16 text-white sm:px-8 lg:px-12">
            <div className="grid gap-12 md:grid-cols-3">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight">Hải Đăng Building</h2>
                    <p className="mt-12 max-w-sm text-lg leading-8 text-slate-100">
                        Hệ thống phòng trọ Hải Đăng tiện nghi, an toàn và phù hợp cho sinh viên, người đi làm tại Hòa Lạc.
                    </p>
                </div>

                <div>
                    <h3 className="text-2xl font-extrabold tracking-tight">Liên Kết Nhanh</h3>
                    <nav className="mt-8 grid gap-4 text-lg font-bold text-slate-100">
                        <Link href="/" className="transition hover:text-white/80">
                            Trang Chủ
                        </Link>
                        <Link href="/rooms" className="transition hover:text-white/80">
                            Tầng & Phòng
                        </Link>
                        <Link href="/rules" className="transition hover:text-white/80">
                            Nội Quy
                        </Link>
                    </nav>
                </div>

                <div>
                    <h3 className="text-2xl font-extrabold tracking-tight">Liên Hệ</h3>
                    <div className="mt-8 space-y-5 text-lg leading-8 text-slate-100">
                        <p>
                            <span className="font-extrabold">Hotline:</span> 0914.339.682; 0846.557.999
                        </p>
                        <p>
                            <span className="font-extrabold">Địa Chỉ:</span> Số 70A1, Thôn 4, xã Thạch Hoà, Thạch Thất, Hà Nội
                        </p>
                        <p>
                            <span className="font-extrabold">Giờ Làm:</span> 24/7 (Tất cả các ngày)
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}