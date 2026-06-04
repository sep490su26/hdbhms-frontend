"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSignature,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  fetchTenantAccountCandidates,
  sendTenantAccountCredentials,
} from "@/services/identityAccessService";

const statusFilters = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "WAITING", label: "Chưa cấp tài khoản" },
  { value: "SENT", label: "Đã gửi tài khoản" },
  { value: "ACTIVATED", label: "Đã kích hoạt" },
  { value: "MISSING_EMAIL", label: "Thiếu email" },
];

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveAccountState(item) {
  if (!item.emailAvailable) {
    return {
      key: "MISSING_EMAIL",
      label: "Thiếu email",
      className: "border-rose-200 bg-rose-50 text-rose-700",
      description: "Bổ sung email trước khi gửi tài khoản.",
    };
  }

  if (!item.accountProvisioned) {
    return {
      key: "WAITING",
      label: "Chưa cấp",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      description: "Hợp đồng đã hiệu lực, có thể gửi tài khoản.",
    };
  }

  if (item.lastLoginAt || item.mustChangePassword === false) {
    return {
      key: "ACTIVATED",
      label: "Đã kích hoạt",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      description: "Khách đã đăng nhập hoặc đã đổi mật khẩu đầu tiên.",
    };
  }

  return {
    key: "SENT",
    label: "Đã gửi",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    description: "Đã gửi mật khẩu tạm, chờ khách đăng nhập mobile.",
  };
}

function MetricCard({ icon: Icon, label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <article className="flex min-h-[96px] items-center gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold uppercase tracking-[0.06em] text-[#505f76]">{label}</p>
        <p className="mt-1 text-2xl font-bold text-[#091426]">{value}</p>
      </div>
    </article>
  );
}

function InlineAlert({ tone = "error", children }) {
  const styles = {
    error: "border-rose-100 bg-rose-50 text-rose-700",
    success: "border-emerald-100 bg-emerald-50 text-emerald-700",
    info: "border-blue-100 bg-blue-50 text-blue-700",
  };
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${styles[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function Modal({ title, children, footer, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
          <h2 className="text-lg font-bold text-[#091426]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-2 text-[#505f76] hover:bg-[#f2f4f6]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="border-t border-[#e2e8f0] px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const [items, setItems] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [pageError, setPageError] = useState("");
  const [pageNotice, setPageNotice] = useState("");
  const [sendTarget, setSendTarget] = useState(null);

  useEffect(() => {
    let isActive = true;

    async function loadInitialData() {
      try {
        const data = await fetchTenantAccountCandidates();
        if (!isActive) return;
        setItems(Array.isArray(data) ? data : []);
        setPageError("");
      } catch (error) {
        if (!isActive) return;
        setItems([]);
        setPageError(error.message || "Không tải được danh sách tài khoản cần cấp.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    loadInitialData();
    return () => {
      isActive = false;
    };
  }, []);

  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    setPageError("");
    try {
      const data = await fetchTenantAccountCandidates();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      setItems([]);
      setPageError(error.message || "Không tải được danh sách tài khoản cần cấp.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rows = useMemo(() => {
    const search = normalizeText(keyword);
    return items
      .map((item) => ({ ...item, accountState: resolveAccountState(item) }))
      .filter((item) => {
        const matchesStatus = statusFilter === "ALL" || item.accountState.key === statusFilter;
        const matchesSearch =
          !search ||
          normalizeText(item.fullName).includes(search) ||
          normalizeText(item.phone).includes(search) ||
          normalizeText(item.email).includes(search) ||
          normalizeText(item.roomCode).includes(search) ||
          normalizeText(item.contractCode).includes(search);
        return matchesStatus && matchesSearch;
      });
  }, [items, keyword, statusFilter]);

  const metrics = useMemo(() => {
    const states = items.map(resolveAccountState);
    return {
      total: items.length,
      waiting: states.filter((state) => state.key === "WAITING").length,
      sent: states.filter((state) => state.key === "SENT").length,
      activated: states.filter((state) => state.key === "ACTIVATED").length,
      missingEmail: states.filter((state) => state.key === "MISSING_EMAIL").length,
    };
  }, [items]);

  async function submitSendAccount() {
    if (!sendTarget) return;
    setIsMutating(true);
    setPageError("");
    setPageNotice("");
    try {
      const updated = await sendTenantAccountCredentials(sendTarget.contractId);
      setItems((current) =>
        current.map((item) => (item.contractId === updated.contractId ? { ...item, ...updated } : item)),
      );
      setPageNotice(`Đã gửi tài khoản và mật khẩu tạm đến email ${sendTarget.email}.`);
      setSendTarget(null);
    } catch (error) {
      setPageError(error.message || "Không gửi được tài khoản. Vui lòng thử lại.");
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <>
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#505f76]">Admin Dashboard</p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.01em] text-[#091426]">
            Quản lý tài khoản khách thuê
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#45474c]">
            Cấp tài khoản mobile sau khi hợp đồng thuê offline đã ký và hợp đồng đã được kích hoạt.
          </p>
        </div>
        <button
          type="button"
          onClick={loadCandidates}
          disabled={isLoading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-5 text-sm font-bold text-white hover:bg-[#16253a] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={FileSignature} label="Hợp đồng hiệu lực" value={metrics.total} />
        <MetricCard icon={KeyRound} label="Chưa cấp" value={metrics.waiting} tone="amber" />
        <MetricCard icon={Mail} label="Đã gửi" value={metrics.sent} tone="blue" />
        <MetricCard icon={ShieldCheck} label="Đã kích hoạt" value={metrics.activated} tone="emerald" />
        <MetricCard icon={AlertCircle} label="Thiếu email" value={metrics.missingEmail} tone="rose" />
      </section>

      {(pageNotice || pageError) && (
        <section className="grid gap-3">
          {pageNotice && <InlineAlert tone="success">{pageNotice}</InlineAlert>}
          {pageError && <InlineAlert>{pageError}</InlineAlert>}
        </section>
      )}

      <section className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_240px]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên khách, SĐT, email, phòng hoặc mã hợp đồng"
              className="h-11 w-full rounded-lg border border-[#e2e8f0] bg-white pl-10 pr-3 text-sm font-semibold text-[#091426] outline-none placeholder:text-[#6b7280] focus:border-[#091426]"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm font-bold text-[#091426] outline-none focus:border-[#091426]"
          >
            {statusFilters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] px-5 py-4">
          <div>
            <h2 className="font-bold text-[#091426]">Danh sách cấp tài khoản</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              Chỉ hiển thị người ký chính của các hợp đồng thuê đang hiệu lực.
            </p>
          </div>
          <span className="rounded-full bg-[#091426] px-3 py-1 text-xs font-bold text-white">{rows.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-[#f7f9fb] text-xs font-bold uppercase tracking-[0.06em] text-[#505f76]">
              <tr>
                <th className="px-5 py-4">Khách thuê</th>
                <th className="px-5 py-4">Hợp đồng</th>
                <th className="px-5 py-4">Phòng</th>
                <th className="px-5 py-4">Số điện thoại</th>
                <th className="px-5 py-4">Email nhận tài khoản</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4">Ngày ký</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải danh sách tài khoản...
                    </span>
                  </td>
                </tr>
              )}

              {!isLoading &&
                rows.map((item) => (
                  <tr key={item.contractId} className="align-top hover:bg-[#f7f9fb]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d3e4fe] text-xs font-bold text-[#091426]">
                          {String(item.fullName || "K").slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-[#091426]">{item.fullName || "Chưa cập nhật"}</p>
                          <p className="text-xs text-[#6b7280]">Hồ sơ #{item.profileId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#091426]">{item.contractCode}</p>
                      <p className="text-xs text-[#6b7280]">{item.contractStatus}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#091426]">Phòng {item.roomCode}</p>
                      <p className="text-xs text-[#6b7280]">{item.propertyName}</p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#45474c]">{item.phone || "Chưa cập nhật"}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 font-semibold text-[#45474c]">
                        <Mail className="h-4 w-4 text-[#6b7280]" />
                        {item.email || "Chưa có email"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="grid gap-1">
                        <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold ${item.accountState.className}`}>
                          {item.accountState.label}
                        </span>
                        <span className="text-xs text-[#6b7280]">{item.accountState.description}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[#45474c]">{formatDate(item.signedAt || item.startDate)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setSendTarget(item)}
                          disabled={!item.emailAvailable || item.accountState.key === "ACTIVATED" || isMutating}
                          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#091426] px-4 text-xs font-bold text-white hover:bg-[#16253a] disabled:cursor-not-allowed disabled:bg-[#c5c6cd]"
                        >
                          <Send className="h-4 w-4" />
                          {item.accountState.key === "ACTIVATED"
                            ? "Đã kích hoạt"
                            : item.accountProvisioned
                              ? "Gửi lại tài khoản"
                              : "Gửi tài khoản"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <UserRound className="mx-auto h-10 w-10 text-[#94a3b8]" />
                    <p className="mt-3 text-sm font-semibold text-[#6b7280]">
                      Không có hợp đồng hiệu lực phù hợp để cấp tài khoản.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {sendTarget && (
        <Modal
          title="Gửi tài khoản khách thuê"
          onClose={() => setSendTarget(null)}
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setSendTarget(null)}
                className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submitSendAccount}
                disabled={isMutating}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white hover:bg-[#16253a] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Xác nhận gửi
              </button>
            </div>
          }
        >
          <div className="grid gap-4">
            <InlineAlert tone="info">
              Hệ thống sẽ sinh mật khẩu tạm, lưu BCrypt và gửi thông tin đăng nhập qua email. Mật khẩu tạm không hiển thị trên web.
            </InlineAlert>
            <div className="rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] p-4">
              <p className="text-sm font-bold text-[#091426]">{sendTarget.fullName}</p>
              <p className="mt-1 text-sm text-[#45474c]">
                Phòng {sendTarget.roomCode} · Hợp đồng {sendTarget.contractCode}
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#45474c]">
                <Mail className="h-4 w-4" />
                {sendTarget.email}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              <UserCheck className="mr-2 inline h-4 w-4" />
              Khách sẽ dùng số điện thoại {sendTarget.phone || "đã đăng ký"} và mật khẩu tạm để đăng nhập mobile.
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
