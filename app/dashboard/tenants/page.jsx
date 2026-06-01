"use client";

import {useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

const TENANTS = [
    {
        id: 1,
        initials: "NH",
        color: "bg-indigo-100 text-indigo-700",
        name: "Nguyễn Văn Hưng",
        phone: "0901 234 567",
        email: "vinhung@gmail.com",
        rooms: 102,
        people: 2,
        detail: {
            fullName: "Nguyễn Văn Hoàng",
            dob: "15/05/1992",
            gender: "Nam",
            idNumber: "0123456789001",
            idDate: "24/10/2021",
            idPlace: "Cục CS QLHC",
            address: "123 Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh",
            branch: "Hải Đăng 1",
            roomNumber: "P.102",
            coTenant: "Trần Thị B",
            coTenantYear: "1995",
            coTenantPhone: "0987 654 321",
            vehicle: "Honda Airblade",
            plate: "59-X1123.45",
            vehicleCount: "01",
            contract: "HD-2024-H102",
            contractDuration: "12 tháng",
            contractStart: "01/01/2024",
            contractEnd: "31/12/2024",
            cccdFront: true,
            cccdBack: false,
            hasCCCD: true,
            hasPhoto: true,
            phone: "090 123 4567",
            email: "hoang.nguyen@email.com",
        },
    },
    {
        id: 2,
        initials: "LT",
        color: "bg-teal-100 text-teal-700",
        name: "Lê Thị Thu",
        phone: "0912 333 444",
        email: "thithu@gmail.com",
        rooms: 105,
        people: 1,
        detail: {
            fullName: "Lê Thị Thu",
            dob: "22/08/1995",
            gender: "Nữ",
            idNumber: "0987654321001",
            idDate: "10/06/2020",
            idPlace: "Cục CS QLHC",
            address: "45 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
            branch: "Hải Đăng 1",
            roomNumber: "P.105",
            coTenant: null,
            coTenantYear: null,
            coTenantPhone: null,
            vehicle: "Yamaha Exciter",
            plate: "51-B99876",
            vehicleCount: "01",
            contract: "HD-2024-H105",
            contractDuration: "6 tháng",
            contractStart: "01/03/2024",
            contractEnd: "31/08/2024",
            cccdFront: true,
            cccdBack: true,
            hasCCCD: true,
            hasPhoto: true,
            phone: "0912 333 444",
            email: "thithu@gmail.com",
        },
    },
    {
        id: 3,
        initials: "PM",
        color: "bg-orange-100 text-orange-700",
        name: "Phạm Minh Tuấn",
        phone: "0933 111 222",
        email: "minhtuanpham@gmail.com",
        rooms: 201,
        people: 3,
        detail: {
            fullName: "Phạm Minh Tuấn",
            dob: "05/03/1990",
            gender: "Nam",
            idNumber: "0112233445566",
            idDate: "01/01/2019",
            idPlace: "Cục CS QLHC",
            address: "88 Trần Hưng Đạo, Quận 5, TP. Hồ Chí Minh",
            branch: "Hải Đăng 2",
            roomNumber: "P.201",
            coTenant: "Nguyễn Thị C",
            coTenantYear: "1992",
            coTenantPhone: "0966 778 899",
            vehicle: "Honda Winner",
            plate: "59-AA5678",
            vehicleCount: "01",
            contract: "HD-2024-H201",
            contractDuration: "12 tháng",
            contractStart: "15/02/2024",
            contractEnd: "14/02/2025",
            cccdFront: true,
            cccdBack: true,
            hasCCCD: true,
            hasPhoto: false,
            phone: "0933 111 222",
            email: "minhtuanpham@gmail.com",
        },
    },
];

const FLOORS = [
    {label: "Tầng 2", rooms: ["101", "102", "103", "104"]},
    {label: "Tầng 3", rooms: ["201", "202", "203", "204"]},
    {label: "Tầng 4", rooms: ["301", "302", "303", "304"]},
];

function getPageNumbers(currentPage, totalPages, maxVisible = 5) {
    const pages = [];
    if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        pages.push(1);
        if (start > 2) pages.push("...");
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < totalPages - 1) pages.push("...");
        pages.push(totalPages);
    }
    return pages;
}

function PaginationFooter({
                              startIndex,
                              pageSize,
                              totalItems,
                              currentPage,
                              totalPages,
                              onPageChange,
                              onPageSizeChange,
                          }) {
    const pages = getPageNumbers(currentPage, totalPages);

    return (
        <div
            className="border-t border-gray-100 px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <span className="text-xs text-gray-500 whitespace-nowrap">
        Hiển thị {startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)} trong {totalItems} kết quả
      </span>
            <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(e.target.value)}
                className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
            >
                {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>
                        {size} / trang
                    </option>
                ))}
            </select>
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                    </PaginationItem>
                    {pages.map((page, idx) =>
                        page === "..." ? (
                            <PaginationItem key={`ellipsis-${idx}`}>
                                <span className="px-2 text-gray-400 text-sm">…</span>
                            </PaginationItem>
                        ) : (
                            <PaginationItem key={page}>
                                <PaginationLink
                                    isActive={currentPage === page}
                                    onClick={() => onPageChange(page)}
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        )
                    )}
                    <PaginationItem>
                        <PaginationNext
                            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
}

function SectionTitle({icon, title}) {
    return (
        <div className="flex items-center gap-2 mb-3">
            <div className="text-gray-500">{icon}</div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</span>
        </div>
    );
}

function InfoRow({label, value}) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-gray-400">{label}</span>
            <span className="text-sm text-gray-800 font-medium">{value || "—"}</span>
        </div>
    );
}


function DetailModal({tenant, open, onOpenChange}) {
    if (!tenant) return null;
    const d = tenant.detail;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger>
            </DialogTrigger>
            <DialogContent
                className="max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-y-auto p-0 gap-0 overflow-hidden flex flex-col [&>button.absolute]:hidden">
                {/* Modal header */}
                <DialogHeader className="px-5 py-4 bg-white border-b border-gray-200 rounded-t-2xl sticky top-0 z-10">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor"
                                     viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                            </div>
                            <DialogTitle className="text-lg font-semibold text-gray-800">Chi tiết hồ sơ khách
                                thuê</DialogTitle>
                        </div>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </DialogHeader>
                <DialogDescription className="sr-only">
                    Thông tin chi tiết về khách thuê {d.fullName}, bao gồm hồ sơ cá nhân, hợp đồng thuê, và thông tin
                    liên lạc.
                </DialogDescription>
                {/* Body – responsive grid: 1 col on mobile, 3 cols on lg+ */}
                <div
                    className="flex-1 overflow-y-auto px-2 py-2
            [&::-webkit-scrollbar]:w-1.5
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-gray-300
            [&::-webkit-scrollbar-track]:bg-gray-100"
                >
                    <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* LEFT: full width on mobile, 2/3 on desktop */}
                        <div className="lg:col-span-2 space-y-4">
                            {/* Thông tin cá nhân */}
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <SectionTitle
                                    icon={
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                    }
                                    title="Thông tin cá nhân"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                    <InfoRow label="Họ và tên" value={d.fullName}/>
                                    <InfoRow label="Ngày sinh" value={d.dob}/>
                                    <InfoRow label="Giới tính" value={d.gender}/>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                    <InfoRow label="Số CCCD/CMND" value={d.idNumber}/>
                                    <InfoRow label="Ngày cấp" value={d.idDate}/>
                                    <InfoRow label="Nơi cấp" value={d.idPlace}/>
                                </div>
                                <InfoRow label="Địa chỉ thường trú" value={d.address}/>
                            </div>

                            {/* Nơi cư trú */}
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <SectionTitle
                                    icon={
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                                        </svg>
                                    }
                                    title="Nơi cư trú"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <InfoRow label="Tên cơ sở" value={d.branch}/>
                                    <InfoRow label="Số phòng" value={d.roomNumber}/>
                                </div>
                            </div>

                            {/* Thông tin bạn cùng phòng */}
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <SectionTitle
                                    icon={
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        </svg>
                                    }
                                    title="Thông tin bạn cùng phòng"
                                />
                                {d.coTenant ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <InfoRow label="Họ và tên" value={d.coTenant}/>
                                        <InfoRow label="Năm sinh" value={d.coTenantYear}/>
                                        <InfoRow label="Số điện thoại" value={d.coTenantPhone}/>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">Không có bạn cùng phòng.</p>
                                )}
                            </div>

                            {/* Thông tin xe */}
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <SectionTitle
                                    icon={
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M8 16l-1.447-.724A1 1 0 016 14.382V11a5 5 0 0110 0v3.382a1 1 0 01-.553.894L14 16m-6 0h6m-6 0l-1 3h8l-1-3"/>
                                        </svg>
                                    }
                                    title="Thông tin xe"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <InfoRow label="Hãng xe" value={d.vehicle}/>
                                    <InfoRow label="Biển số" value={d.plate}/>
                                    <InfoRow label="Số lượng xe" value={d.vehicleCount}/>
                                </div>
                            </div>

                            {/* Ảnh căn cước công dân */}
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <SectionTitle
                                    icon={
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
                                        </svg>
                                    }
                                    title="Ảnh căn cước công dân"
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Front CCCD */}
                                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-blue-50 p-3">
                                        <div className="text-center mb-2">
                                            <p className="text-xs font-bold text-blue-800">Nhà Trọ HẢI ĐĂNG 1</p>
                                        </div>
                                        <div className="flex flex-wrap gap-1 justify-center text-[9px] text-gray-500">
                                            {FLOORS.map((f) => (
                                                <div key={f.label} className="flex flex-col items-center gap-0.5">
                                                    <span className="font-semibold text-gray-600">{f.label}</span>
                                                    {f.rooms.map((r) => (
                                                        <div
                                                            key={r}
                                                            className="w-6 h-4 bg-blue-200 border border-blue-300 rounded-sm flex items-center justify-center text-[8px] text-blue-700"
                                                        >
                                                            {r}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Back CCCD */}
                                    {d.cccdBack ? (
                                        <div
                                            className="border border-gray-200 rounded-xl bg-gray-100 flex items-center justify-center h-28">
                                            <div className="text-center">
                                                <svg className="w-8 h-8 text-gray-300 mx-auto mb-1" fill="none"
                                                     stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                                                          d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5"/>
                                                </svg>
                                                <p className="text-xs text-gray-400">Mặt sau</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            className="border-2 border-dashed border-red-200 rounded-xl bg-red-50 flex flex-col items-center justify-center h-28 gap-1">
                                            <svg className="w-7 h-7 text-red-300" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01"/>
                                            </svg>
                                            <p className="text-xs text-red-400">Không tải được ảnh, thử lại sau</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: full width on mobile, 1/3 on desktop */}
                        <div className="space-y-4">
                            {/* Hợp đồng thuê */}
                            <div className="bg-gray-900 rounded-xl p-4 text-white">
                                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Hợp đồng thuê</p>
                                <p className="text-xl font-bold mb-1">{d.contract}</p>
                                <p className="text-xs text-gray-400 mb-0.5">Thời hạn: {d.contractDuration}</p>
                                <p className="text-xs text-gray-400 mb-3">{d.contractStart} – {d.contractEnd}</p>
                                <button
                                    className="w-full flex items-center justify-center gap-2 border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white text-xs font-medium py-2 rounded-lg transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                    Xem chi tiết
                                </button>
                            </div>

                            {/* Danh mục hồ sơ */}
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Danh mục
                                    hồ
                                    sơ</p>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                            </svg>
                                            CCCD
                                        </div>
                                        {d.hasCCCD ? (
                                            <span
                                                className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path
                          strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                      Hoàn tất
                    </span>
                                        ) : (
                                            <span
                                                className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Thiếu</span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                            </svg>
                                            Ảnh chân dung
                                        </div>
                                        {d.hasPhoto ? (
                                            <span
                                                className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path
                          strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                      Hoàn tất
                    </span>
                                        ) : (
                                            <span
                                                className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Thiếu</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Liên lạc */}
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Liên
                                    lạc</p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
                                            <svg className="w-3.5 h-3.5 text-green-500" fill="none"
                                                 stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400">Điện thoại</p>
                                            <p className="text-sm font-semibold text-gray-800">{d.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                                            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400">Email</p>
                                            <p className="text-sm font-semibold text-gray-800 break-all">{d.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    {/*<div className=" px-5 pb-5 flex justify-end">*/}
                    {/*    <button*/}
                    {/*        onClick={() => onOpenChange(false)}*/}
                    {/*        className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors"*/}
                    {/*    >*/}
                    {/*        Đóng*/}
                    {/*    </button>*/}
                    {/*</div>*/}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function TenantProfiles() {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const filtered = TENANTS.filter(
        (t) =>
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.phone.includes(search)
    );
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };
    const handlePageSizeChange = (newSize) => {
        setPageSize(Number(newSize));
        setCurrentPage(1);
    };
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedData = filtered.slice(startIndex, startIndex + pageSize);
    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Hồ sơ khách thuê</h1>

            {/* Filters – wrap on mobile */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
                {/* Search */}
                <div className="relative w-full sm:flex-1 sm:max-w-sm">
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                        />
                    </svg>
                    <input
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                        placeholder="Tìm kiếm theo tên hoặc SĐT"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Dropdowns */}
                <select
                    className="w-full sm:w-auto text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white text-gray-700">
                    <option>Phòng (Tất cả)</option>
                    <option>P.102</option>
                    <option>P.105</option>
                    <option>P.201</option>
                </select>

                <select
                    className="w-full sm:w-auto text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white text-gray-700">
                    <option>Cơ sở (Tất cả)</option>
                    <option>Hải Đăng 1</option>
                    <option>Hải Đăng 2</option>
                </select>

                <button
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-2 rounded-xl border border-indigo-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
                        />
                    </svg>
                    Lọc
                </button>
            </div>

            {/* ======================= */}
            {/* DESKTOP TABLE (hidden on mobile) */}
            {/* ======================= */}
            <div className="hidden sm:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 py-4">
                                Họ Tên
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 py-4">
                                Số Điện Thoại
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 py-4">
                                Email
                            </TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 py-4">
                                Phòng
                            </TableHead>
                            <TableHead
                                className="text-xs font-semibold uppercase tracking-wider text-gray-500 py-4 text-right">
                                Người Ở
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                  d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                                        </svg>
                                        <span>Không tìm thấy khách thuê</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedData.map((t) => (
                                <TableRow
                                    key={t.id}
                                    className="cursor-pointer hover:bg-blue-50/40 transition-colors border-gray-100 last:border-0"
                                    onClick={() => setSelected(t)}
                                >
                                    {/* Name + Avatar */}
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${t.color}`}
                                            >
                                                {t.initials}
                                            </div>
                                            <span className="font-medium text-gray-900">{t.name}</span>
                                        </div>
                                    </TableCell>

                                    {/* Phone */}
                                    <TableCell className="text-sm text-gray-600 py-4">{t.phone}</TableCell>

                                    {/* Email */}
                                    <TableCell className="text-sm text-gray-600 py-4 truncate max-w-[180px]">
                                        {t.email}
                                    </TableCell>

                                    {/* Room – with a subtle badge */}
                                    <TableCell className="py-4">
                    <span
                        className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      P.{t.rooms}
                    </span>
                                    </TableCell>

                                    {/* People – aligned right with icon hint */}
                                    <TableCell className="text-sm text-gray-600 py-4 text-right">
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                        {t.people} người
                    </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                {totalItems > pageSize && (
                    <PaginationFooter
                        startIndex={startIndex}
                        pageSize={pageSize}
                        totalItems={totalItems}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                    />
                )}
            </div>
            {/* ======================= */}
            {/* MOBILE CARDS (visible only on small screens) */}
            {/* ======================= */}
            <div className="sm:hidden space-y-4">
                {paginatedData.length === 0 ? (
                    <p className="text-center py-10 text-gray-400">Không tìm thấy khách thuê.</p>
                ) : (
                    paginatedData.map((t) => (
                        <div
                            key={t.id}
                            className="bg-white border border-gray-200 rounded-2xl p-4 active:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => setSelected(t)}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${t.color}`}
                                >
                                    {t.initials}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{t.name}</p>
                                    <p className="text-sm text-gray-500">{t.phone}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 text-sm border-t pt-3 mt-2">
                                <div>
                                    <span className="text-xs text-gray-400">Email</span>
                                    <p className="font-medium text-gray-700 truncate">{t.email}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-400">Phòng</span>
                                    <p className="font-medium text-gray-700">{t.rooms}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-400">Người ở</span>
                                    <p className="font-medium text-gray-700">{t.people}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {totalItems > pageSize && (
                    <PaginationFooter
                        startIndex={startIndex}
                        pageSize={pageSize}
                        totalItems={totalItems}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                    />
                )}
            </div>

            {/* Detail Modal */}
            <DetailModal
                tenant={selected}
                open={!!selected}
                onOpenChange={(open) => {
                    if (!open) setSelected(null);
                }}
            />
        </div>
    );
}