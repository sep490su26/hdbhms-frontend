"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileWarning,
  Filter,
  Home,
  KeyRound,
  Mail,
  RefreshCw,
  Search,
  Upload,
  Users,
  X,
} from "lucide-react";

const leaseContracts = [
  {
    id: "HD-2024-H102",
    property: "Hải Đăng 1",
    room: "102",
    primaryTenant: "Nguyễn Văn Hùng",
    tenants: [
      { name: "Nguyễn Văn Hùng", role: "Người ký chính", phone: "0901 234 567", citizenId: "079123456789" },
      { name: "Nguyễn Thị Mai", role: "Người ở cùng", phone: "0908 765 432", citizenId: "079987654321" },
    ],
    people: 2,
    startDate: "1/1/2024",
    endDate: "31/12/2024",
    paymentCycle: "1 tháng/lần",
    rent: "2.300.000 đ",
    deposit: "2.300.000 đ",
    fileStatus: "Đã upload",
    status: "Đang hiệu lực",
  },
  {
    id: "HD-2024-H105",
    property: "Hải Đăng 1",
    room: "105",
    primaryTenant: "Lê Thị Thu",
    tenants: [
      { name: "Lê Thị Thu", role: "Người ký chính", phone: "0912 222 105", citizenId: "081234567890" },
    ],
    people: 1,
    startDate: "1/3/2024",
    endDate: "28/2/2025",
    paymentCycle: "1 tháng/lần",
    rent: "2.200.000 đ",
    deposit: "2.200.000 đ",
    fileStatus: "Chưa upload",
    status: "Sắp hết hạn",
  },
  {
    id: "HD-2024-H203",
    property: "Hải Đăng 1",
    room: "203",
    primaryTenant: "Trần Minh Quân",
    tenants: [
      { name: "Trần Minh Quân", role: "Người ký chính", phone: "0933 112 203", citizenId: "075555666777" },
      { name: "Phạm Hoàng Nam", role: "Người ở cùng", phone: "0904 881 203", citizenId: "075111222333" },
      { name: "Võ Thanh An", role: "Người ở cùng", phone: "0977 320 203", citizenId: "075444555666" },
    ],
    people: 3,
    startDate: "15/4/2024",
    endDate: "14/4/2025",
    paymentCycle: "1 tháng/lần",
    rent: "2.500.000 đ",
    deposit: "2.500.000 đ",
    fileStatus: "Đã upload",
    status: "Đang hiệu lực",
  },
  {
    id: "HD-2024-H305",
    property: "Hải Đăng 2",
    room: "305",
    primaryTenant: "Phạm Gia Bảo",
    tenants: [
      { name: "Phạm Gia Bảo", role: "Người ký chính", phone: "0985 305 305", citizenId: "082333444555" },
      { name: "Đặng Minh Anh", role: "Người ở cùng", phone: "0966 305 305", citizenId: "082666777888" },
    ],
    people: 2,
    startDate: "1/6/2024",
    endDate: "31/5/2025",
    paymentCycle: "1 tháng/lần",
    rent: "2.700.000 đ",
    deposit: "2.700.000 đ",
    fileStatus: "Chưa upload",
    status: "Chờ bổ sung",
  },
];

function FileBadge({ value }) {
  const isUploaded = value === "Đã upload";
  const Icon = isUploaded ? FileCheck2 : FileWarning;

  return (
    <span
      className={`inline-flex min-w-[92px] items-center justify-center gap-1 rounded-full border px-3 py-2 text-center text-sm font-bold leading-tight ${
        isUploaded
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      <Icon className="h-4 w-4" />
      {value}
    </span>
  );
}

function StatusBadge({ value }) {
  if (value === "Đang hiệu lực") {
    return (
      <span className="inline-flex min-w-[132px] items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        Đang hiệu lực
      </span>
    );
  }

  if (value === "Sắp hết hạn") {
    return (
      <span className="inline-flex min-w-[132px] items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
        <AlertTriangle className="h-4 w-4" />
        Sắp hết hạn
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-[132px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600">
      {value}
    </span>
  );
}

function ContractDetailModal({ contract, onClose }) {
  if (!contract) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/65 p-4 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-[920px] overflow-y-auto rounded-xl bg-white shadow-2xl">
        <header className="relative bg-[#05091d] px-7 py-8 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết hợp đồng"
            className="absolute right-4 top-4 rounded-md p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-slate-300">Chi tiết hợp đồng</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.02em]">{contract.id}</h2>
          <div className="mt-4">
            <StatusBadge value={contract.status} />
          </div>
        </header>

        <div className="grid gap-5 p-7 lg:grid-cols-2">
          <section className="rounded-xl border border-[#dfe5ef] bg-[#fbfbfe] p-5">
            <h3 className="inline-flex items-center gap-2 text-xl font-extrabold text-[#091426]">
              <Home className="h-5 w-5" />
              Thông tin phòng
            </h3>
            <div className="mt-5 grid grid-cols-2 gap-5">
              <div>
                <p className="text-sm text-[#6b7280]">Cơ sở</p>
                <p className="mt-1 text-lg font-bold text-[#091426]">{contract.property}</p>
              </div>
              <div>
                <p className="text-sm text-[#6b7280]">Phòng</p>
                <p className="mt-1 text-lg font-bold text-[#091426]">{contract.room}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe5ef] bg-[#fbfbfe] p-5">
            <h3 className="inline-flex items-center gap-2 text-xl font-extrabold text-[#091426]">
              <CalendarDays className="h-5 w-5" />
              Thời hạn hợp đồng
            </h3>
            <div className="mt-5 grid grid-cols-2 gap-5">
              <div>
                <p className="text-sm text-[#6b7280]">Ngày bắt đầu</p>
                <p className="mt-1 text-lg font-bold text-[#091426]">{contract.startDate}</p>
              </div>
              <div>
                <p className="text-sm text-[#6b7280]">Ngày kết thúc</p>
                <p className="mt-1 text-lg font-bold text-[#091426]">{contract.endDate}</p>
              </div>
              <div>
                <p className="text-sm text-[#6b7280]">Chu kỳ thanh toán</p>
                <p className="mt-1 text-lg font-bold text-[#091426]">{contract.paymentCycle}</p>
              </div>
              <div>
                <p className="text-sm text-[#6b7280]">Tiền cọc</p>
                <p className="mt-1 text-lg font-bold text-[#091426]">{contract.deposit}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe5ef] bg-[#fbfbfe] p-5 lg:col-span-2">
            <h3 className="inline-flex items-center gap-2 text-xl font-extrabold text-[#091426]">
              <Users className="h-5 w-5" />
              Người ở trong hợp đồng
            </h3>
            <div className="mt-5 overflow-hidden rounded-lg border border-[#dfe5ef] bg-white">
              <div className="grid grid-cols-[minmax(0,1.2fr)_130px_150px_150px] bg-[#f7f9fe] px-4 py-3 text-xs font-bold uppercase tracking-[0.04em] text-[#6b7280]">
                <span>Họ tên</span>
                <span>Vai trò</span>
                <span>SĐT</span>
                <span>CCCD</span>
              </div>
              {(contract.tenants || []).map((tenant) => (
                <div
                  key={`${contract.id}-${tenant.name}`}
                  className="grid grid-cols-[minmax(0,1.2fr)_130px_150px_150px] border-t border-[#edf1f6] px-4 py-3 text-sm"
                >
                  <span className="font-bold text-[#091426]">{tenant.name}</span>
                  <span className="font-semibold text-[#4b5563]">{tenant.role}</span>
                  <span className="text-[#4b5563]">{tenant.phone}</span>
                  <span className="text-[#4b5563]">{tenant.citizenId}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-5">
              <div>
                <p className="text-sm text-[#6b7280]">Tổng số người</p>
                <p className="mt-1 text-lg font-bold text-[#091426]">{contract.people} người</p>
              </div>
              <div>
                <p className="text-sm text-[#6b7280]">Giá thuê</p>
                <p className="mt-1 text-lg font-bold text-[#091426]">{contract.rent}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#dfe5ef] bg-[#fbfbfe] p-5 lg:col-span-2">
            <h3 className="inline-flex items-center gap-2 text-xl font-extrabold text-[#091426]">
              <FileCheck2 className="h-5 w-5" />
              File hợp đồng đã ký
            </h3>
            <div className="mt-5 rounded-lg bg-white p-4">
              {contract.fileStatus === "Đã upload" ? (
                <>
                  <p className="font-extrabold text-[#091426]">hop-dong-{contract.room}.pdf</p>
                  <p className="mt-1 text-sm text-[#607089]">Upload: 15/09/2023</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 text-sm font-extrabold hover:bg-[#f8fafc]">
                      <Eye className="h-4 w-4" />
                      Xem
                    </button>
                    <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 text-sm font-extrabold hover:bg-[#f8fafc]">
                      <Download className="h-4 w-4" />
                      Tải
                    </button>
                    <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 text-sm font-extrabold hover:bg-[#f8fafc]">
                      <Upload className="h-4 w-4" />
                      Thay
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-red-300 bg-white p-5 text-center">
                  <Upload className="mx-auto h-8 w-8 text-red-500" />
                  <p className="mt-2 font-extrabold text-[#091426]">
                    Chưa có file hợp đồng cho phòng {contract.room}
                  </p>
                  <p className="mt-1 text-sm text-[#607089]">
                    Khách: {contract.primaryTenant}
                  </p>
                  <button type="button" className="mt-4 rounded-lg bg-[#091426] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#16253a]">
                    Upload hợp đồng đã ký
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-3 lg:col-span-2 sm:grid-cols-2">
            <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-extrabold text-white hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Kích hoạt hợp đồng
            </button>
            <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-extrabold text-white hover:bg-indigo-700">
              <KeyRound className="h-4 w-4" />
              Gửi tài khoản cho khách
            </button>
            <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-700 hover:bg-red-100">
              <AlertTriangle className="h-4 w-4" />
              Thanh lý hợp đồng
            </button>
            <button type="button" disabled className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-extrabold opacity-60">
              <RefreshCw className="h-4 w-4" />
              Tái ký / Gia hạn
            </button>
          </section>
        </div>
      </section>
    </div>
  );
}

export default function ContractTemplatePage() {
  const [selectedContract, setSelectedContract] = useState(null);
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [fileFilter, setFileFilter] = useState("Tất cả");
  const [keyword, setKeyword] = useState("");

  const filteredContracts = leaseContracts.filter((contract) => {
    const search = keyword.trim().toLowerCase();
    const matchesSearch =
      !search ||
      contract.id.toLowerCase().includes(search) ||
      contract.room.toLowerCase().includes(search) ||
      contract.primaryTenant.toLowerCase().includes(search);
    const matchesStatus = statusFilter === "Tất cả" || contract.status === statusFilter;
    const matchesFile = fileFilter === "Tất cả" || contract.fileStatus === fileFilter;

    return matchesSearch && matchesStatus && matchesFile;
  });

  const summary = {
    total: leaseContracts.length,
    active: leaseContracts.filter((contract) => contract.status === "Đang hiệu lực").length,
    expiring: leaseContracts.filter((contract) => contract.status === "Sắp hết hạn").length,
    missingFile: leaseContracts.filter((contract) => contract.fileStatus === "Chưa upload").length,
  };

  return (
    <div className="grid gap-6 text-[#091426]">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold tracking-[-0.01em] text-[#091426]">Quản lý hợp đồng thuê</h1>
        <p className="max-w-3xl text-sm leading-6 text-[#505f76]">
          Upload hợp đồng đã ký sau đặt cọc, kích hoạt hợp đồng thuê và gửi tài khoản mobile cho khách.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["Tổng hợp đồng", summary.total, "text-[#091426]", "bg-[#eef3fb]"],
          ["Đang hiệu lực", summary.active, "text-emerald-700", "bg-emerald-50"],
          ["Sắp hết hạn", summary.expiring, "text-amber-700", "bg-amber-50"],
          ["Chưa có file", summary.missingFile, "text-red-700", "bg-red-50"],
        ].map(([label, value, textClass, bgClass]) => (
          <article key={label} className="rounded-xl border border-[#dfe5ef] bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#6b7280]">{label}</p>
            <p className={`mt-2 text-3xl font-extrabold ${textClass}`}>{value}</p>
            <div className={`mt-4 h-1.5 rounded-full ${bgClass}`} />
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-[#dfe5ef] bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a98af]" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm mã HĐ, phòng hoặc người ký..."
              className="h-11 w-full rounded-lg border border-[#cbd5e1] bg-white pl-10 pr-3 text-sm font-semibold text-[#091426] outline-none focus:border-[#091426]"
            />
          </label>
          <label className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a98af]" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-[#cbd5e1] bg-white pl-9 pr-3 text-sm font-bold text-[#091426] outline-none focus:border-[#091426]"
            >
              <option>Tất cả</option>
              <option>Đang hiệu lực</option>
              <option>Sắp hết hạn</option>
              <option>Chờ bổ sung</option>
            </select>
          </label>
          <label className="relative">
            <FileCheck2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a98af]" />
            <select
              value={fileFilter}
              onChange={(event) => setFileFilter(event.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-[#cbd5e1] bg-white pl-9 pr-3 text-sm font-bold text-[#091426] outline-none focus:border-[#091426]"
            >
              <option>Tất cả</option>
              <option>Đã upload</option>
              <option>Chưa upload</option>
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dfe5ef] bg-white shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
        <header className="border-b border-[#dfe5ef] px-8 py-7">
          <h1 className="text-2xl font-extrabold tracking-[-0.01em] text-[#091426]">Danh sách hợp đồng</h1>
          <p className="mt-2 text-base text-[#6b7280]">
            Quản lý hợp đồng thuê, file scan/PDF và trạng thái vòng đời hợp đồng.
          </p>
        </header>

        <div>
          <table className="w-full table-fixed text-left">
            <thead className="bg-[#f7f9fe] text-[11px] font-extrabold uppercase tracking-[0.03em] text-[#6b7280]">
              <tr>
                <th className="w-[14%] px-4 py-4">Mã HĐ</th>
                <th className="w-[8%] px-3 py-4">Phòng</th>
                <th className="w-[15%] px-3 py-4">Người ký chính</th>
                <th className="w-[8%] px-3 py-4">Số người</th>
                <th className="w-[14%] px-3 py-4">Thời hạn</th>
                <th className="w-[12%] px-3 py-4">Giá thuê</th>
                <th className="w-[11%] px-3 py-4">File</th>
                <th className="w-[12%] px-3 py-4">Trạng thái</th>
                <th className="w-[6%] px-3 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f6]">
              {filteredContracts.map((contract, index) => (
                <tr
                  key={contract.id}
                  onClick={() => setSelectedContract(contract)}
                  className={`cursor-pointer transition hover:bg-[#f8fbff] ${
                    index === 0 ? "bg-[#eef5ff]" : "bg-white"
                  }`}
                >
                  <td className="px-4 py-5 align-middle">
                    <p className="text-sm font-extrabold leading-5 text-[#091426]">
                      {contract.id}
                    </p>
                    <p className="mt-1 text-xs text-[#7b8495]">{contract.property}</p>
                  </td>
                  <td className="px-3 py-5 align-middle">
                    <span className="inline-flex items-center gap-1 text-sm font-extrabold text-[#091426]">
                      <Home className="h-4 w-4 text-[#9aa3b2]" />
                      {contract.room}
                    </span>
                  </td>
                  <td className="px-3 py-5 align-middle">
                    <p className="text-sm font-extrabold leading-5 text-[#091426]">
                      {contract.primaryTenant}
                    </p>
                  </td>
                  <td className="px-3 py-5 align-middle">
                    <span className="inline-flex items-center gap-1 text-sm font-extrabold text-[#091426]">
                      <Users className="h-4 w-4 text-indigo-500" />
                      {contract.people} người
                    </span>
                  </td>
                  <td className="px-3 py-5 align-middle">
                    <p className="text-sm font-medium leading-5 text-[#091426]">{contract.startDate}</p>
                    <p className="text-xs leading-5 text-[#7b8495]">đến {contract.endDate}</p>
                  </td>
                  <td className="px-3 py-5 align-middle">
                    <p className="text-sm font-extrabold leading-5 text-[#091426]">
                      {contract.rent}
                    </p>
                  </td>
                  <td className="px-3 py-5 align-middle">
                    <FileBadge value={contract.fileStatus} />
                  </td>
                  <td className="px-3 py-5 align-middle">
                    <StatusBadge value={contract.status} />
                  </td>
                  <td className="px-3 py-5 text-center align-middle">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedContract(contract);
                      }}
                      className="h-10 rounded-lg border border-[#d1d7e0] bg-white px-3 text-sm font-extrabold text-[#091426] shadow-[0_3px_8px_rgba(15,23,42,0.04)] transition hover:bg-[#f8fafc]"
                    >
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
              {filteredContracts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm font-bold text-[#7b8495]">
                    Không có hợp đồng phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ContractDetailModal contract={selectedContract} onClose={() => setSelectedContract(null)} />
    </div>
  );
}
