"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Filter,
  LockKeyhole,
  Search,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import {
  accountStatusMeta,
  accountStatusOptions,
  accountTypeLabels,
  accountTypeOptions,
  facilityOptions,
  initialEmployeeAccounts,
} from "./data";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { sortByNewest } from "@/lib/sortByNewest.mjs";

function StatusBadge({ status }) {
  const meta = accountStatusMeta[status] || accountStatusMeta.pending;

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function Modal({ title, children, footer, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
      <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white dark:bg-[#0f172a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] dark:border-white/10 px-6 py-4">
          <h2 id="account-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-md p-2 text-slate-600 dark:text-slate-300 hover:bg-[#f2f4f6] dark:hover:bg-white/5">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="border-t border-[#e2e8f0] dark:border-white/10 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

function InlineAlert({ tone = "error", children }) {
  const styles = {
    error: "border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300",
    success: "border-emerald-100 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  };
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${styles[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function resolveFacilityName(facilityId) {
  return facilityOptions.find((facility) => facility.value === facilityId)?.label || "Chưa gán";
}

export function AccountManagement() {
  const [accounts, setAccounts] = useState(initialEmployeeAccounts);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [permissionTarget, setPermissionTarget] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState("");
  const [permissionError, setPermissionError] = useState("");
  const [lockTarget, setLockTarget] = useState(null);
  const [lockReason, setLockReason] = useState("");
  const [lockError, setLockError] = useState("");
  const [pageNotice, setPageNotice] = useState("");
  const [pageError, setPageError] = useState("");

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sortByNewest(accounts.filter((account) => {
      const matchesType = typeFilter === "all" || account.accountType === typeFilter;
      const matchesStatus = statusFilter === "all" || account.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        account.fullName.toLowerCase().includes(normalizedQuery) ||
        account.email.toLowerCase().includes(normalizedQuery) ||
        account.phone.toLowerCase().includes(normalizedQuery);

      return matchesType && matchesStatus && matchesQuery;
    }), ["createdAt", "created_at"], ["id"]);
  }, [accounts, query, statusFilter, typeFilter]);

  const metrics = useMemo(() => {
    return {
      total: accounts.length,
      active: accounts.filter((account) => account.status === "active").length,
      pending: accounts.filter((account) => account.status === "pending").length,
      locked: accounts.filter((account) => account.status === "locked").length,
    };
  }, [accounts]);

  const openPermissionDialog = (account) => {
    setPageError("");
    setPageNotice("");
    setPermissionTarget(account);
    setSelectedFacility(account.assignedFacility || "");
    setPermissionError("");
  };

  const confirmPermission = () => {
    if (!selectedFacility) {
      setPermissionError("Vui lòng gán cơ sở phụ trách trước khi cấp quyền");
      return;
    }

    setAccounts((currentAccounts) =>
      currentAccounts.map((account) =>
        account.id === permissionTarget.id
          ? {
              ...account,
              status: "active",
              assignedFacility: selectedFacility,
              lastLoginAt: account.lastLoginAt === "Chưa đăng nhập" ? "Chưa đăng nhập" : account.lastLoginAt,
            }
          : account,
      ),
    );
    setPageNotice(`Đã cấp quyền Quản lý cho ${permissionTarget.fullName}.`);
    setPermissionTarget(null);
  };

  const openLockDialog = (account) => {
    setPageNotice("");
    if (account.status === "locked") {
      setPageError("Tài khoản này đã bị khóa từ trước");
      return;
    }

    setPageError("");
    setLockTarget(account);
    setLockReason("");
    setLockError("");
  };

  const confirmLock = () => {
    if (!lockReason.trim()) {
      setLockError("Vui lòng nhập lý do khóa");
      return;
    }

    setAccounts((currentAccounts) =>
      currentAccounts.map((account) =>
        account.id === lockTarget.id
          ? {
              ...account,
              status: "locked",
              lockedReason: lockReason.trim(),
            }
          : account,
      ),
    );
    setPageNotice(`Đã khóa tài khoản ${lockTarget.fullName}.`);
    setLockTarget(null);
  };

  return (
    <>
      <DashboardPageHeader
        eyebrow="Admin Dashboard"
        title="AccountManagement"
        description="Quản lý tài khoản nhân sự cho vai trò Quản lý trong hệ thống nhà trọ."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard icon={UsersRound} label="Tổng nhân sự" value={metrics.total} />
        <DashboardStatCard icon={ShieldCheck} label="Đang hoạt động" value={metrics.active} tone="emerald" />
        <DashboardStatCard icon={UserRoundCog} label="Chờ duyệt" value={metrics.pending} tone="amber" />
        <DashboardStatCard icon={LockKeyhole} label="Đã khóa" value={metrics.locked} tone="rose" />
      </section>

      {(pageNotice || pageError) && (
        <section>
          {pageNotice && <InlineAlert tone="success">{pageNotice}</InlineAlert>}
          {pageError && <InlineAlert>{pageError}</InlineAlert>}
        </section>
      )}

      <section className="rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo họ tên, SĐT hoặc email"
              className="h-11 w-full rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] pl-10 pr-3 text-sm font-semibold text-slate-900 dark:text-white outline-none placeholder:text-slate-500 dark:text-slate-400 focus:border-[#1e40af]"
            />
          </label>
          <label className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] pl-10 pr-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#1e40af]"
            >
              {accountTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 w-full appearance-none rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] pl-10 pr-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#1e40af]"
            >
              {accountStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#e2e8f0] dark:border-white/10 px-5 py-4">
          <h2 className="font-bold text-slate-900 dark:text-white">Danh sách tài khoản</h2>
          <span className="rounded-full bg-[#1e40af] dark:bg-[#2563eb] px-3 py-1 text-xs font-bold text-white">{filteredAccounts.length}</span>
        </div>
        <div className="dashboard-table">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f7f9fb] dark:bg-white/5 text-xs font-bold uppercase tracking-[0.06em] text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-5 py-4">Họ tên</th>
                <th className="px-5 py-4">Loại tài khoản</th>
                <th className="px-5 py-4">SĐT</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4">Ngày tạo</th>
                <th className="px-5 py-4">Đăng nhập gần nhất</th>
                <th className="px-5 py-4">Cơ sở phụ trách</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="border-t border-[#e2e8f0] dark:border-white/10 align-top">
                  <td data-label="Họ tên" className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d3e4fe] text-xs font-bold text-slate-900 dark:text-white">
                        {account.fullName.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white">{account.fullName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{account.id}</p>
                      </div>
                    </div>
                  </td>
                  <td data-label="Loại tài khoản" className="px-5 py-4 font-semibold text-slate-900 dark:text-white">{accountTypeLabels[account.accountType]}</td>
                  <td data-label="SĐT" className="px-5 py-4 text-slate-600 dark:text-slate-300">{account.phone}</td>
                  <td data-label="Email" className="break-words px-5 py-4 text-slate-600 dark:text-slate-300">{account.email}</td>
                  <td data-label="Trạng thái" className="px-5 py-4"><StatusBadge status={account.status} /></td>
                  <td data-label="Ngày tạo" className="px-5 py-4 text-slate-600 dark:text-slate-300">{account.createdAt}</td>
                  <td data-label="Đăng nhập gần nhất" className="px-5 py-4 text-slate-600 dark:text-slate-300">{account.lastLoginAt}</td>
                  <td data-label="Cơ sở phụ trách" className="px-5 py-4">
                    <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      {resolveFacilityName(account.assignedFacility)}
                    </span>
                  </td>
                  <td data-label="Thao tác" className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {account.accountType === "manager" && account.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => openPermissionDialog(account)}
                          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-3 text-xs font-bold text-white hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8]"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Cấp quyền
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openLockDialog(account)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-100 dark:border-rose-500/20 px-3 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      >
                        <LockKeyhole className="h-4 w-4" />
                        Khóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">Không có tài khoản phù hợp.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {permissionTarget && (
        <Modal
          title={`Cấp quyền cho ${permissionTarget.fullName}`}
          onClose={() => setPermissionTarget(null)}
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button type="button" onClick={() => setPermissionTarget(null)} className="h-10 rounded-lg border border-[#c5c6cd] dark:border-white/10 px-4 text-sm font-bold text-slate-900 dark:text-white">Hủy</button>
              <button type="button" onClick={confirmPermission} className="h-10 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-4 text-sm font-bold text-white">Xác nhận cấp quyền</button>
            </div>
          }
        >
          <div className="grid gap-4">
            <div className="rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-[#f7f9fb] dark:bg-white/5 p-4">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{permissionTarget.fullName}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{permissionTarget.email}</p>
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Cơ sở phụ trách</span>
              <select
                value={selectedFacility}
                onChange={(event) => {
                  setSelectedFacility(event.target.value);
                  setPermissionError("");
                }}
                className="h-11 rounded-lg border border-[#c5c6cd] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#1e40af]"
              >
                <option value="">Chọn cơ sở phụ trách</option>
                {facilityOptions.map((facility) => (
                  <option key={facility.value} value={facility.value}>{facility.label}</option>
                ))}
              </select>
            </label>
            {permissionError && <InlineAlert>{permissionError}</InlineAlert>}
          </div>
        </Modal>
      )}

      {lockTarget && (
        <Modal
          title={`Khóa tài khoản ${lockTarget.fullName}`}
          onClose={() => setLockTarget(null)}
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button type="button" onClick={() => setLockTarget(null)} className="h-10 rounded-lg border border-[#c5c6cd] dark:border-white/10 px-4 text-sm font-bold text-slate-900 dark:text-white">Hủy</button>
              <button type="button" onClick={confirmLock} className="h-10 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700">Xác nhận khóa</button>
            </div>
          }
        >
          <div className="grid gap-4">
            <div className="rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-[#f7f9fb] dark:bg-white/5 p-4">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{lockTarget.fullName}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{accountTypeLabels[lockTarget.accountType]} · {lockTarget.email}</p>
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Lý do khóa</span>
              <textarea
                value={lockReason}
                onChange={(event) => {
                  setLockReason(event.target.value);
                  setLockError("");
                }}
                rows={4}
                className="min-h-28 resize-none rounded-lg border border-[#c5c6cd] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#1e40af]"
                placeholder="Nhập lý do khóa tài khoản"
              />
            </label>
            {lockError && <InlineAlert>{lockError}</InlineAlert>}
          </div>
        </Modal>
      )}
    </>
  );
}
