"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Home,
  KeyRound,
  Mail,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import {
  disableTenantAccountAccess,
  fetchTenantAccountCandidates,
  sendTenantAccountCredentials,
} from "@/services/identityAccessService";
import { formatDate as formatDisplayDate } from "@/lib/dateFormat";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { fetchAllPageItems, paginateItems } from "@/lib/pageResponse";

const ALL_VALUE = "Tất cả";

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getInitials(name) {
  const initials = String(name || "K")
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return initials || "K";
}

function formatDate(value) {
  return formatDisplayDate(value);
}

function roleLabel(role) {
  return role === "PRIMARY" ? "Người ký chính" : "Người ở cùng";
}

function roleClass(role) {
  return role === "PRIMARY"
    ? "border-indigo-200 dark:border-blue-500/20 bg-indigo-50 dark:bg-blue-500/10 text-indigo-700 dark:text-blue-300"
    : "border-slate-200 bg-slate-50 text-slate-700";
}

function resolveAccountState(item) {
  if (
    item.occupantStatus === "DISABLED" ||
    item.provisioningStatus === "DISABLED"
  ) {
    return {
      key: "DISABLED",
      label: "Đã vô hiệu hóa",
      hint: item.disabledReason
        ? `Lý do: ${item.disabledReason}`
        : "Tenant không còn quyền truy cập phòng/hợp đồng này.",
      className: "border-slate-300 bg-slate-100 text-slate-700",
    };
  }

  if (!item.recipientEmail) {
    return {
      key: "MISSING_EMAIL",
      label: "Thiếu email",
      hint: "Bổ sung email người ký chính trước khi gửi tài khoản.",
      className:
        "border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300",
    };
  }

  if (item.provisioningStatus === "PENDING") {
    return {
      key: "PENDING",
      label: "Đang gửi",
      hint: "Hệ thống đang xử lý gửi tài khoản.",
      className:
        "border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300",
    };
  }

  if (item.provisioningStatus === "FAILED") {
    return {
      key: "FAILED",
      label: "Gửi thất bại",
      hint: item.failureReason || "Có thể thử gửi lại sau khi xác nhận.",
      className:
        "border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300",
    };
  }

  if (item.provisioningStatus === "NOT_PROVISIONED") {
    return {
      key: "NOT_SENT",
      label: "Chưa cấp",
      hint: "Chưa gửi tài khoản mobile.",
      className:
        "border-amber-200 dark:border-yellow-500/20 bg-amber-50 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300",
    };
  }

  if (item.provisioningStatus === "SENT") {
    return {
      key: "SENT",
      label: "Đã gửi",
      hint: "Chờ khách đổi mật khẩu và hoàn tất hồ sơ trên mobile.",
      className:
        "border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300",
    };
  }

  return {
    key: "ACTIVATED",
    label: "Đã kích hoạt",
    hint: "Khách đã đổi mật khẩu lần đầu.",
    className:
      "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  };
}

function SelectFilter({ value, options, onChange, label }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-semibold text-[#8490a5]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-[#c8ceda] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ item }) {
  const state = resolveAccountState(item);
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${state.className}`}
    >
      {state.label}
    </span>
  );
}

function contractGroupKey(item, index) {
  if (item.contractId) return `contract-${item.contractId}`;
  if (item.contractCode) return `contract-code-${item.contractCode}`;
  if (item.roomCode) return `room-${item.roomCode}-${index}`;
  return `group-${index}`;
}

function rowKey(item, index) {
  if (item.profileId) return `profile-${item.profileId}`;
  if (item.userId) return `user-${item.userId}`;
  if (item.phone)
    return `${item.contractId || item.contractCode || "contract"}-${item.phone}`;
  return `row-${index}`;
}

function tenantContextKey(item) {
  return `${item.contractId || "contract"}-${item.profileId || item.userId || item.phone || "tenant"}`;
}

export default function AccountsPage() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState(ALL_VALUE);
  const [stateFilter, setStateFilter] = useState(ALL_VALUE);
  const [roleFilter, setRoleFilter] = useState(ALL_VALUE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingContractId, setSendingContractId] = useState(null);
  const [disablingKey, setDisablingKey] = useState(null);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAllPageItems(fetchTenantAccountCandidates);
      setItems(data);
    } catch (loadError) {
      setError(loadError?.message || "Không tải được danh sách cấp tài khoản.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const propertyOptions = useMemo(
    () => [
      ALL_VALUE,
      ...Array.from(
        new Set(items.map((item) => item.propertyName).filter(Boolean)),
      ),
    ],
    [items],
  );

  const metrics = useMemo(() => {
    const contractIds = new Set(
      items.map((item) => item.contractId).filter(Boolean),
    );
    return {
      contracts: contractIds.size,
      notSent: items.filter(
        (item) => resolveAccountState(item).key === "NOT_SENT",
      ).length,
      sent: items.filter((item) => resolveAccountState(item).key === "SENT")
        .length,
      activated: items.filter(
        (item) => resolveAccountState(item).key === "ACTIVATED",
      ).length,
      missingEmail: items.filter(
        (item) => resolveAccountState(item).key === "MISSING_EMAIL",
      ).length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const keyword = normalize(query);
    return items.filter((item) => {
      const state = resolveAccountState(item);
      const matchesQuery =
        !keyword ||
        normalize(item.fullName).includes(keyword) ||
        normalize(item.phone).includes(keyword) ||
        normalize(item.email).includes(keyword) ||
        normalize(item.recipientEmail).includes(keyword) ||
        normalize(item.roomCode).includes(keyword) ||
        normalize(item.contractCode).includes(keyword);
      const matchesProperty =
        propertyFilter === ALL_VALUE || item.propertyName === propertyFilter;
      const matchesState =
        stateFilter === ALL_VALUE || state.label === stateFilter;
      const matchesRole =
        roleFilter === ALL_VALUE || roleLabel(item.roomRole) === roleFilter;
      return matchesQuery && matchesProperty && matchesState && matchesRole;
    });
  }, [items, propertyFilter, query, roleFilter, stateFilter]);

  const groupedContracts = useMemo(() => {
    const groups = new Map();
    for (const item of filteredItems) {
      const key =
        item.contractId ||
        item.contractCode ||
        `${item.roomCode}-${item.phone}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          contractId: item.contractId,
          contractCode: item.contractCode,
          contractStatus: item.contractStatus,
          propertyName: item.propertyName,
          roomCode: item.roomCode,
          recipientEmail: item.recipientEmail,
          occupantCount: item.roomOccupantCount || 1,
          maxOccupants: item.roomMaxOccupants || 3,
          rows: [],
        });
      }
      groups.get(key).rows.push(item);
    }
    return Array.from(groups.values()).map((group, index) => ({
      ...group,
      safeKey: contractGroupKey(group.rows[0] || {}, index),
    }));
  }, [filteredItems]);
  const contractPage = paginateItems(groupedContracts, { page, size });

  const handleSend = async (contractId) => {
    if (!contractId || sendingContractId) return;
    const contractRows = items.filter((item) => item.contractId === contractId);
    const retry = contractRows.some((item) =>
      ["FAILED", "SENT"].includes(resolveAccountState(item).key),
    );
    const confirmed = window.confirm(
      retry
        ? "Hệ thống sẽ gửi lại tài khoản cho người thuê chưa kích hoạt. Tài khoản đã kích hoạt sẽ được bỏ qua."
        : "Hệ thống sẽ gửi tài khoản cho các người thuê chưa được cấp. Không gửi lại cho tài khoản đã có.",
    );
    if (!confirmed) return;
    setSendingContractId(contractId);
    setMessage("");
    setError("");
    try {
      const result = await sendTenantAccountCredentials(contractId, { retry });
      setMessage(result?.message || "Đã gửi thông tin tài khoản khách thuê.");
      await loadData();
    } catch (sendError) {
      setError(sendError?.message || "Không gửi được tài khoản khách thuê.");
    } finally {
      setSendingContractId(null);
    }
  };

  const handleDisable = async (item) => {
    if (!item?.contractId || !item?.profileId || disablingKey) return;
    const reason = window.prompt(
      "Nhập lý do vô hiệu hóa quyền truy cập tenant này",
    );
    if (reason === null) return;
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError("Vui lòng nhập lý do vô hiệu hóa.");
      return;
    }

    const key = tenantContextKey(item);
    setDisablingKey(key);
    setMessage("");
    setError("");
    try {
      const result = await disableTenantAccountAccess(
        item.contractId,
        item.profileId,
        { reason: trimmedReason },
      );
      setMessage(
        result?.message === "TENANT_CONTEXT_DISABLED"
          ? "Đã vô hiệu hóa quyền truy cập tenant."
          : result?.message || "Đã vô hiệu hóa quyền truy cập tenant.",
      );
      await loadData();
    } catch (disableError) {
      setError(
        disableError?.message ||
          "Không vô hiệu hóa được quyền truy cập tenant.",
      );
    } finally {
      setDisablingKey(null);
    }
  };

  return (
    <div className="grid gap-7 text-slate-900 dark:text-white">
      <section className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#3d4759]"></div>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-900 dark:text-white">
            Quản lý tài khoản khách thuê
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Cấp tài khoản mobile cho tất cả người trong hợp đồng sau khi hợp
            đồng thuê đã ACTIVE.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e40af] px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(15,29,51,0.18)] transition hover:bg-[#172842] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-4">
        <DashboardStatCard
          icon={Home}
          label="Hợp đồng hiệu lực"
          value={metrics.contracts}
          tone="slate"
        />
        <DashboardStatCard
          icon={KeyRound}
          label="Chưa cấp"
          value={metrics.notSent}
          tone="amber"
        />
        <DashboardStatCard
          icon={Mail}
          label="Đã gửi"
          value={metrics.sent}
          tone="blue"
        />
        <DashboardStatCard
          icon={ShieldCheck}
          label="Đã kích hoạt"
          value={metrics.activated}
          tone="emerald"
        />
        <DashboardStatCard
          icon={AlertCircle}
          label="Thiếu email"
          value={metrics.missingEmail}
          tone="rose"
        />
      </section>

      <section className="rounded-xl border border-[#c8ceda] dark:border-white/10 bg-white dark:bg-[#0f172a] px-5 py-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(280px,1fr)_190px_180px_180px] xl:items-end">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên khách, SĐT, email, phòng hoặc mã hợp đồng"
              className="h-11 w-full rounded-lg border border-[#c8ceda] dark:border-white/10 bg-white dark:bg-[#0f172a] pl-10 pr-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-500 dark:text-slate-400 focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10"
            />
          </label>
          <SelectFilter
            label="Cơ sở"
            value={propertyFilter}
            options={propertyOptions}
            onChange={(value) => {
              setPropertyFilter(value);
              setPage(1);
            }}
          />
          <SelectFilter
            label="Trạng thái"
            value={stateFilter}
            options={[
              ALL_VALUE,
              "Chưa cấp",
              "Đang gửi",
              "Đã gửi",
              "Đã kích hoạt",
              "Đã vô hiệu hóa",
              "Gửi thất bại",
              "Thiếu email",
            ]}
            onChange={(value) => {
              setStateFilter(value);
              setPage(1);
            }}
          />
          <SelectFilter
            label="Vai trò"
            value={roleFilter}
            options={[ALL_VALUE, "Người ký chính", "Người ở cùng"]}
            onChange={(value) => {
              setRoleFilter(value);
              setPage(1);
            }}
          />
        </div>
      </section>

      {message ? (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[#c8ceda] dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
        <div className="border-b border-[#d4dbe8] dark:border-white/10 px-5 py-4">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Danh sách cấp tài khoản
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Dữ liệu lấy từ hợp đồng thuê ACTIVE trong database. Một lần gửi sẽ
            cấp tài khoản cho người ký chính và người ở cùng.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Đang tải dữ liệu từ backend...
          </div>
        ) : groupedContracts.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
            <UsersRound className="h-10 w-10 text-slate-400 dark:text-slate-500" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Không có hợp đồng ACTIVE phù hợp.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#d4dbe8]">
            {contractPage.items.map((group) => {
              const groupStates = group.rows.map(
                (row) => resolveAccountState(row).key,
              );
              const canSend = groupStates.some((state) =>
                ["NOT_SENT", "FAILED", "SENT"].includes(state),
              );
              const hasFailed = groupStates.includes("FAILED");
              const hasSent = groupStates.includes("SENT");
              const allActivated = groupStates.every(
                (state) => state === "ACTIVATED",
              );
              const isSending = sendingContractId === group.contractId;
              const contractCanSend = group.contractStatus === "ACTIVE";
              const sendDisabled =
                !contractCanSend ||
                !group.recipientEmail ||
                !canSend ||
                isSending;

              return (
                <article
                  key={group.safeKey}
                  className="bg-white dark:bg-[#0f172a]"
                >
                  <div className="flex flex-col gap-4 bg-[#f7f9fc] dark:bg-white/5 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                          Phòng {group.roomCode || "Chưa có"}
                        </h3>
                        <span className="rounded-full border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          {group.contractStatus === "EXPIRING_SOON"
                            ? "Hợp đồng sắp hết hạn"
                            : group.contractStatus === "TERMINATION_PENDING"
                              ? "Hợp đồng chờ thanh lý"
                              : "Hợp đồng ACTIVE"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {group.propertyName || "Chưa có cơ sở"} · Hợp đồng{" "}
                        {group.contractCode || "#"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Email nhận thông tin:{" "}
                        {group.recipientEmail || "Chưa có email người ký chính"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <span className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#c8ceda] dark:border-white/10 bg-white dark:bg-[#0f172a] px-4 text-sm font-bold text-slate-900 dark:text-white">
                        <UsersRound className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                        {group.occupantCount}/{group.maxOccupants} người
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSend(group.contractId)}
                        disabled={sendDisabled}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0f1d33] px-4 text-sm font-bold text-white transition hover:bg-[#172842] disabled:cursor-not-allowed disabled:bg-[#9aa3b2]"
                      >
                        <Send className="h-4 w-4" />
                        {!contractCanSend
                          ? "Chỉ gửi khi ACTIVE"
                          : isSending
                            ? "Đang gửi..."
                            : hasFailed
                              ? "Thử gửi lại"
                              : hasSent
                                ? "Gửi bổ sung"
                                : allActivated
                                  ? "Đã hoàn tất"
                                  : canSend
                                    ? "Gửi tài khoản"
                                    : "Đã gửi tài khoản"}
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-table">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white dark:bg-[#0f172a] text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="px-5 py-4">Khách thuê</th>
                          <th className="px-5 py-4">Vai trò</th>
                          <th className="px-5 py-4">SĐT</th>
                          <th className="px-5 py-4">Email cá nhân</th>
                          <th className="px-5 py-4">Ngày ký</th>
                          <th className="px-5 py-4">Trạng thái</th>
                          <th className="px-5 py-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f6]">
                        {group.rows.map((item, index) => {
                          const state = resolveAccountState(item);
                          const isDisabled = state.key === "DISABLED";
                          const isDisabling =
                            disablingKey === tenantContextKey(item);
                          const disableActionDisabled =
                            isDisabled ||
                            isDisabling ||
                            !item.contractId ||
                            !item.profileId;
                          return (
                            <tr key={rowKey(item, index)}>
                              <td data-label="Khách thuê" className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dbe7ff] text-xs font-extrabold text-[#3157b7]">
                                    {getInitials(item.fullName)}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="max-w-[220px] truncate font-extrabold text-slate-900 dark:text-white">
                                      {item.fullName || "Chưa cập nhật"}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                      Hồ sơ #{item.profileId || "chưa tạo"}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td data-label="Vai trò" className="px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${roleClass(item.roomRole)}`}
                                >
                                  {roleLabel(item.roomRole)}
                                </span>
                              </td>
                              <td
                                data-label="SĐT"
                                className="px-5 py-4 font-semibold text-slate-900 dark:text-white"
                              >
                                {item.phone || "Chưa có"}
                              </td>
                              <td
                                data-label="Email cá nhân"
                                className="break-words px-5 py-4 font-semibold text-slate-900 dark:text-white"
                              >
                                {item.email || "Không có"}
                              </td>
                              <td
                                data-label="Ngày ký"
                                className="px-5 py-4 font-semibold text-slate-900 dark:text-white"
                              >
                                {formatDate(item.signedAt)}
                              </td>
                              <td data-label="Trạng thái" className="px-5 py-4">
                                <div className="grid gap-1">
                                  <StatusBadge item={item} />
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {state.hint}
                                  </span>
                                </div>
                              </td>
                              <td data-label="Thao tác" className="px-5 py-4">
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleDisable(item)}
                                    disabled={disableActionDisabled}
                                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 dark:border-rose-500/20 bg-white dark:bg-[#0f172a] px-3 text-xs font-bold text-rose-700 dark:text-rose-300 transition hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                                  >
                                    <Ban className="h-4 w-4" />
                                    {isDisabled
                                      ? "Đã vô hiệu hóa"
                                      : isDisabling
                                        ? "Đang xử lý..."
                                        : "Vô hiệu hóa"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <DashboardPagination
          page={contractPage.page}
          size={contractPage.size}
          totalElements={contractPage.totalElements}
          totalPages={contractPage.totalPages}
          itemLabel="hợp đồng"
          onPageChange={setPage}
          onSizeChange={(nextSize) => {
            setSize(nextSize);
            setPage(1);
          }}
        />
      </section>
    </div>
  );
}
