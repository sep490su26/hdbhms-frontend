"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  LockKeyhole,
  Search,
  UnlockKeyhole,
  UserPlus,
  UsersRound,
  UserRoundCheck,
  Ban,
} from "lucide-react";

const facilities = ["Tất cả", "Hải Đăng 1", "Hải Đăng 2", "Hải Đăng 3"];
const accountTypes = ["Tất cả", "Chủ trọ", "Quản lý", "Khách thuê", "Kế toán"];
const statuses = ["Tất cả", "Đang hoạt động", "Đã khóa"];

const initialAccounts = [
  {
    id: "ACC-001",
    name: "Nguyễn Văn Hiếu",
    email: "hieu.nv@email.com",
    facility: "",
    room: "-",
    type: "Chủ trọ",
    phone: "0912 345 678",
    status: "Đang hoạt động",
    createdAt: "12/10/2023",
  },
  {
    id: "ACC-002",
    name: "Trần Thị Lan",
    email: "lan.tt@email.com",
    facility: "Hải Đăng 1",
    room: "-",
    type: "Quản lý",
    phone: "0988 765 432",
    status: "Đang hoạt động",
    createdAt: "05/01/2024",
  },
  {
    id: "ACC-003",
    name: "Phạm Tuấn Anh",
    email: "anh.pt@email.com",
    facility: "Hải Đăng 1",
    room: "P.205",
    type: "Khách thuê",
    phone: "0909 112 233",
    status: "Đã khóa",
    createdAt: "20/02/2024",
  },
  {
    id: "ACC-004",
    name: "Lê Minh Khang",
    email: "khang.lm@email.com",
    facility: "Hải Đăng 2",
    room: "P.301",
    type: "Khách thuê",
    phone: "0934 556 789",
    status: "Đang hoạt động",
    createdAt: "02/03/2024",
  },
  {
    id: "ACC-005",
    name: "Đặng Ngọc Mai",
    email: "mai.dn@email.com",
    facility: "Hải Đăng 2",
    room: "-",
    type: "Kế toán",
    phone: "0977 001 245",
    status: "Đang hoạt động",
    createdAt: "18/03/2024",
  },
  {
    id: "ACC-006",
    name: "Hoàng Quốc Việt",
    email: "viet.hq@email.com",
    facility: "Hải Đăng 3",
    room: "P.104",
    type: "Khách thuê",
    phone: "0966 330 118",
    status: "Đã khóa",
    createdAt: "04/04/2024",
  },
  {
    id: "ACC-007",
    name: "Bùi Thanh Tâm",
    email: "tam.bt@email.com",
    facility: "Hải Đăng 1",
    room: "P.402",
    type: "Khách thuê",
    phone: "0903 228 556",
    status: "Đang hoạt động",
    createdAt: "16/04/2024",
  },
  {
    id: "ACC-008",
    name: "Võ Anh Quân",
    email: "quan.va@email.com",
    facility: "Hải Đăng 3",
    room: "-",
    type: "Quản lý",
    phone: "0919 765 001",
    status: "Đang hoạt động",
    createdAt: "22/04/2024",
  },
  {
    id: "ACC-009",
    name: "Ngô Bảo Châu",
    email: "chau.nb@email.com",
    facility: "Hải Đăng 2",
    room: "P.208",
    type: "Khách thuê",
    phone: "0981 440 027",
    status: "Đang hoạt động",
    createdAt: "01/05/2024",
  },
  {
    id: "ACC-010",
    name: "Trịnh Gia Hân",
    email: "han.tg@email.com",
    facility: "Hải Đăng 1",
    room: "P.502",
    type: "Khách thuê",
    phone: "0922 610 406",
    status: "Đang hoạt động",
    createdAt: "10/05/2024",
  },
  {
    id: "ACC-011",
    name: "Đỗ Thành Long",
    email: "long.dt@email.com",
    facility: "Hải Đăng 3",
    room: "P.203",
    type: "Khách thuê",
    phone: "0945 109 222",
    status: "Đang hoạt động",
    createdAt: "18/05/2024",
  },
  {
    id: "ACC-012",
    name: "Mai Phương Linh",
    email: "linh.mp@email.com",
    facility: "Hải Đăng 2",
    room: "-",
    type: "Quản lý",
    phone: "0908 777 901",
    status: "Đang hoạt động",
    createdAt: "25/05/2024",
  },
];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function MetricCard({ icon: Icon, label, value, tone }) {
  const toneClass = {
    blue: "bg-[#dbe7ff] text-[#0f2748]",
    indigo: "bg-[#dfe3ff] text-[#3757b5]",
    red: "bg-[#ffdeda] text-[#c91616]",
  }[tone];

  return (
    <article className="flex min-h-[98px] items-center gap-4 rounded-xl border border-[#c8ceda] bg-white px-5 py-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#687184]">{label}</p>
        <p className={`mt-1 text-2xl font-bold leading-none ${tone === "red" ? "text-[#c91616]" : tone === "indigo" ? "text-[#3757b5]" : "text-[#0f2748]"}`}>
          {value}
        </p>
      </div>
    </article>
  );
}

function SelectFilter({ label, value, options, onChange }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-medium text-[#a2a9b8]">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full min-w-[140px] appearance-none rounded-[4px] border border-[#c8ceda] bg-[#eef3fb] px-3 pr-9 text-sm font-medium text-[#1b2840] outline-none transition focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687184]" />
      </span>
    </label>
  );
}

function StatusBadge({ status }) {
  const isLocked = status === "Đã khóa";

  return (
    <span
      className={`inline-flex min-w-[72px] items-center justify-center rounded-lg px-2.5 py-1 text-center text-[11px] font-bold leading-tight ${
        isLocked ? "bg-[#ffdeda] text-[#d71919]" : "bg-[#dfe3ff] text-[#3757b5]"
      }`}
    >
      {status}
    </span>
  );
}

function ActionButton({ account, onToggle }) {
  const isLocked = account.status === "Đã khóa";
  const Icon = isLocked ? UnlockKeyhole : LockKeyhole;

  return (
    <button
      type="button"
      onClick={() => onToggle(account.id)}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-bold transition ${
        isLocked ? "text-[#168334] hover:bg-emerald-50" : "text-[#d71919] hover:bg-red-50"
      }`}
    >
      <Icon className="h-4 w-4" />
      {isLocked ? "Mở khóa" : "Khóa"}
    </button>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [query, setQuery] = useState("");
  const [facility, setFacility] = useState("Tất cả");
  const [accountType, setAccountType] = useState("Tất cả");
  const [status, setStatus] = useState("Tất cả");

  const filteredAccounts = useMemo(() => {
    const keyword = normalize(query);

    return accounts.filter((account) => {
      const matchesQuery =
        !keyword ||
        normalize(account.name).includes(keyword) ||
        normalize(account.email).includes(keyword) ||
        normalize(account.phone).includes(keyword);
      const matchesFacility = facility === "Tất cả" || account.facility === facility;
      const matchesType = accountType === "Tất cả" || account.type === accountType;
      const matchesStatus = status === "Tất cả" || account.status === status;

      return matchesQuery && matchesFacility && matchesType && matchesStatus;
    });
  }, [accountType, accounts, facility, query, status]);

  const metrics = useMemo(
    () => ({
      total: accounts.length,
      active: accounts.filter((account) => account.status === "Đang hoạt động").length,
      locked: accounts.filter((account) => account.status === "Đã khóa").length,
    }),
    [accounts],
  );

  const toggleLock = (accountId) => {
    setAccounts((currentAccounts) =>
      currentAccounts.map((account) =>
        account.id === accountId
          ? {
              ...account,
              status: account.status === "Đã khóa" ? "Đang hoạt động" : "Đã khóa",
            }
          : account,
      ),
    );
  };

  return (
    <div className="grid gap-7 text-[#0f1d33]">
      <section className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#3d4759]">
            <span>Hệ thống</span>
            <span>/</span>
            <span className="font-bold text-[#0f1d33]">Quản lý tài khoản</span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-[-0.02em] text-[#0f1d33]">
            Quản lý tài khoản
          </h1>
        </div>
        <button
          type="button"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#0f1d33] px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(15,29,51,0.18)] transition hover:bg-[#172842]"
        >
          <UserPlus className="h-5 w-5" />
          Thêm tài khoản mới
        </button>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <MetricCard icon={UsersRound} label="Tổng tài khoản" value={metrics.total} tone="blue" />
        <MetricCard icon={UserRoundCheck} label="Đang hoạt động" value={metrics.active} tone="indigo" />
        <MetricCard icon={Ban} label="Đã khóa" value={metrics.locked} tone="red" />
      </section>

      <section className="rounded-xl border border-[#c8ceda] bg-white px-5 py-6 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_150px_150px_150px_auto] xl:items-end">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#687184]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên, email hoặc số điện thoại..."
              className="h-10 w-full rounded-[4px] border border-[#c8ceda] bg-white pl-10 pr-3 text-sm text-[#0f1d33] outline-none placeholder:text-[#687184] focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10"
            />
          </label>

          <SelectFilter label="Cơ sở" value={facility} options={facilities} onChange={setFacility} />
          <SelectFilter label="Loại tài khoản" value={accountType} options={accountTypes} onChange={setAccountType} />
          <SelectFilter label="Trạng thái" value={status} options={statuses} onChange={setStatus} />

          <button
            type="button"
            aria-label="Bộ lọc nâng cao"
            className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#c8ceda] bg-white text-[#0f1d33] transition hover:bg-[#eef3fb]"
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#c8ceda] bg-white shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-[#eef3fb] text-[11px] font-bold uppercase tracking-[0.06em] text-[#3d4759]">
              <tr>
                <th className="px-5 py-4">Họ tên</th>
                <th className="px-5 py-4">Cơ sở</th>
                <th className="px-5 py-4">Phòng</th>
                <th className="px-5 py-4">Loại tài khoản</th>
                <th className="px-5 py-4">SĐT</th>
                <th className="px-5 py-4 text-center">Trạng thái</th>
                <th className="px-5 py-4">Ngày tạo</th>
                <th className="px-5 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c8ceda]">
              {filteredAccounts.slice(0, 10).map((account) => {
                return (
                  <tr key={account.id} className="bg-white align-middle">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            account.status === "Đã khóa"
                              ? "bg-[#ffdeda] text-[#d71919]"
                              : "bg-[#dbe7ff] text-[#0f2748]"
                          }`}
                        >
                          {getInitials(account.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-[160px] truncate font-bold text-[#0f1d33]">{account.name}</p>
                          <p className="mt-0.5 max-w-[170px] truncate text-xs text-[#687184]">{account.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium text-[#0f1d33]">
                      {account.type === "Chủ trọ" ? "" : account.facility}
                    </td>
                    <td className="px-5 py-4 font-medium text-[#0f1d33]">{account.room}</td>
                    <td className="px-5 py-4 font-medium text-[#0f1d33]">{account.type}</td>
                    <td className="px-5 py-4 font-medium leading-6 text-[#0f1d33]">
                      {account.phone.split(" ").map((part) => (
                        <span key={`${account.id}-${part}`} className="block">
                          {part}
                        </span>
                      ))}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={account.status} />
                    </td>
                    <td className="px-5 py-4 font-medium text-[#0f1d33]">{account.createdAt}</td>
                    <td className="px-5 py-4 text-center">
                      {account.type === "Chủ trọ" ? (
                        <span className="text-xs font-semibold text-[#9aa3b2]">-</span>
                      ) : (
                        <ActionButton account={account} onToggle={toggleLock} />
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm font-semibold text-[#687184]">
                    Không có tài khoản phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#c8ceda] bg-[#eef3fb] px-5 py-4 text-xs font-medium text-[#3d4759] sm:flex-row sm:items-center sm:justify-between">
          <span>Hiển thị 1-10 trên {accounts.length * 2} tài khoản</span>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md text-[#9aa3b2]">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" className="h-8 w-8 rounded-md bg-[#0f1d33] text-xs font-bold text-white">1</button>
            <button type="button" className="h-8 w-8 rounded-md text-xs font-bold text-[#0f1d33] transition hover:bg-white">2</button>
            <button type="button" className="h-8 w-8 rounded-md text-xs font-bold text-[#0f1d33] transition hover:bg-white">3</button>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md text-[#0f1d33] transition hover:bg-white">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
