"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  ChevronDown,
  ChevronUp,
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
import { sortByNewest } from "@/lib/sortByNewest.mjs";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";

const ALL_VALUE = "Tất cả";
// ponytail: local filters cover the first 1000 tenant account candidates; move filters into the API when this grows.
const TENANT_ACCOUNT_FETCH_SIZE = 1000;

const MOCK_TENANT_ACCOUNT_CANDIDATES = [
  {
    contractId: 5001,
    contractCode: "HD-2026-001",
    contractStatus: "ACTIVE",
    signedAt: "2026-01-03T09:30:00",
    propertyId: 1,
    propertyName: "HDB Home Nguyen Trai",
    roomId: 101,
    roomCode: "A101",
    profileId: 1001,
    roomRole: "PRIMARY",
    roomOccupantCount: 2,
    roomMaxOccupants: 3,
    userId: 9001,
    fullName: "Nguyen Minh Anh",
    phone: "0901234567",
    email: "minh.anh@example.com",
    recipientEmail: "minh.anh@example.com",
    accountStatus: "ACTIVE",
    mustChangePassword: false,
    accountProvisioned: true,
    emailAvailable: true,
  },
  {
    contractId: 5001,
    contractCode: "HD-2026-001",
    contractStatus: "ACTIVE",
    signedAt: "2026-01-03T09:30:00",
    propertyId: 1,
    propertyName: "HDB Home Nguyen Trai",
    roomId: 101,
    roomCode: "A101",
    profileId: 1002,
    roomRole: "CO_OCCUPANT",
    roomOccupantCount: 2,
    roomMaxOccupants: 3,
    userId: 9002,
    fullName: "Tran Thu Ha",
    phone: "0987654321",
    email: "thu.ha@example.com",
    recipientEmail: "minh.anh@example.com",
    accountStatus: "PENDING",
    mustChangePassword: true,
    accountProvisioned: true,
    emailAvailable: true,
  },
  {
    contractId: 5002,
    contractCode: "HD-2026-014",
    contractStatus: "ACTIVE",
    signedAt: "2026-05-20T14:00:00",
    propertyId: 2,
    propertyName: "HDB Residence Cau Giay",
    roomId: 205,
    roomCode: "B205",
    profileId: 1003,
    roomRole: "PRIMARY",
    roomOccupantCount: 1,
    roomMaxOccupants: 2,
    userId: null,
    fullName: "Le Quang Huy",
    phone: "0978123456",
    email: "quang.huy@example.com",
    recipientEmail: "quang.huy@example.com",
    accountStatus: null,
    mustChangePassword: null,
    accountProvisioned: false,
    emailAvailable: true,
  },
  {
    contractId: 5003,
    contractCode: "HD-2026-020",
    contractStatus: "ACTIVE",
    signedAt: "2026-06-01T10:15:00",
    propertyId: 2,
    propertyName: "HDB Residence Cau Giay",
    roomId: 301,
    roomCode: "C301",
    profileId: 1004,
    roomRole: "PRIMARY",
    roomOccupantCount: 1,
    roomMaxOccupants: 3,
    userId: null,
    fullName: "Pham Gia Bao",
    phone: "0966123456",
    email: "",
    recipientEmail: "",
    accountStatus: null,
    mustChangePassword: null,
    accountProvisioned: false,
    emailAvailable: false,
  },
];

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
    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
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

  if (item.provisioningStatus === "PENDING") {
    return {
      key: "PENDING",
      label: "Đang gửi",
      hint: "Hệ thống đang xử lý gửi tài khoản.",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  if (item.provisioningStatus === "FAILED") {
    return {
      key: "FAILED",
      label: "Gửi thất bại",
      hint: item.failureReason || "Có thể thử gửi lại sau khi xác nhận.",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  if (item.provisioningStatus === "NOT_PROVISIONED") {
    return {
      key: "NOT_SENT",
      label: "Chưa cấp",
      hint: "Chưa gửi tài khoản mobile.",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (item.provisioningStatus === "SENT") {
    return {
      key: "SENT",
      label: "Đã gửi",
      hint: "Chờ khách đổi mật khẩu và hoàn tất hồ sơ trên mobile.",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    key: "ACTIVATED",
    label: "Đã kích hoạt",
    hint: "Khách đã đổi mật khẩu lần đầu.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function MetricCard({ icon: Icon, label, value, tone }) {
  const toneClass = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  }[tone];

  return (
    <article className="flex min-h-[96px] items-center gap-4 rounded-xl border border-[#d4dbe8] bg-white px-5 py-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClass}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#687184]">
          {label}
        </p>
        <p className="mt-1 text-2xl font-extrabold leading-none text-[#0f1d33]">
          {value}
        </p>
      </div>
    </article>
  );
}

function SelectFilter({ value, options, onChange, label }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-semibold text-[#8490a5]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-[#c8ceda] bg-white px-3 text-sm font-semibold text-[#0f1d33] outline-none transition focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10"
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
  const [expandedRooms, setExpandedRooms] = useState(() => new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchTenantAccountCandidates({
        page: 0,
        size: TENANT_ACCOUNT_FETCH_SIZE,
      });
      setItems(
        sortByNewest(data.items, [
          "accountCreatedAt",
          "account_created_at",
          "createdAt",
          "created_at",
          "sentAt",
          "sent_at",
          "signedAt",
          "signed_at",
        ]),
      );
    } catch (loadError) {
      setError(loadError?.message || "Không tải được danh sách cấp tài khoản.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadInitialData = async () => {
      try {
        const data = await fetchTenantAccountCandidates({
          page: 0,
          size: TENANT_ACCOUNT_FETCH_SIZE,
        });
        if (active) {
          setItems(
            sortByNewest(data.items, [
              "accountCreatedAt",
              "account_created_at",
              "createdAt",
              "created_at",
              "sentAt",
              "sent_at",
              "signedAt",
              "signed_at",
            ]),
          );
        }
      } catch (loadError) {
        if (active)
          setError(
            loadError?.message || "Không tải được danh sách cấp tài khoản.",
          );
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadInitialData();

    return () => {
      active = false;
    };
  }, []);

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
    return sortByNewest(
      items.filter((item) => {
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
      }),
      [
        "accountCreatedAt",
        "account_created_at",
        "createdAt",
        "created_at",
        "sentAt",
        "sent_at",
        "signedAt",
        "signed_at",
      ],
    );
  }, [items, propertyFilter, query, roleFilter, stateFilter]);

  const filteredTotalElements = filteredItems.length;
  const filteredTotalPages =
    filteredTotalElements === 0
      ? 0
      : Math.ceil(filteredTotalElements / Math.max(1, size));
  const displayedItemPage =
    filteredTotalPages > 0 ? Math.min(page, filteredTotalPages) : 1;
  const pagedItems = useMemo(() => {
    const start = (displayedItemPage - 1) * size;
    return filteredItems.slice(start, start + size);
  }, [displayedItemPage, filteredItems, size]);

  const groupedContracts = useMemo(() => {
    const groups = new Map();
    for (const item of pagedItems) {
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
  }, [pagedItems]);

  const toggleRoom = useCallback((roomId) => {
    setExpandedRooms((current) => {
      const next = new Set(current);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  }, []);

  const handleSend = async (contractId) => {
    if (!contractId || sendingContractId) return;
    const contractRows = items.filter((item) => item.contractId === contractId);
    const retry = contractRows.some((item) =>
      ["FAILED", "SENT"].includes(resolveAccountState(item).key),
    );
    const confirmed = window.confirm(
      retry
        ? "Hệ thống sẽ gửi lại tài khoản cho người thuê chưa kích hoạt. Tài khoản đã kích hoạt sẽ được bỏ qua."
        : "Hệ thống sẽ gửi tài khoản cho những người thuê chưa được cấp. Không gửi lại cho tài khoản đã có.",
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
    <div className="grid gap-7 text-[#0f1d33]">
      <DashboardPageHeader
        title="Quản lý tài khoản khách thuê"
        description="Cấp tài khoản mobile cho người thuê trong hợp đồng thuê đang ACTIVE."
      />

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-4">
        <MetricCard
          icon={Home}
          label="Hợp đồng hiệu lực"
          value={metrics.contracts}
          tone="slate"
        />
        <MetricCard
          icon={KeyRound}
          label="Chưa cấp"
          value={metrics.notSent}
          tone="amber"
        />
        <MetricCard
          icon={Mail}
          label="Đã gửi"
          value={metrics.sent}
          tone="blue"
        />
        <MetricCard
          icon={ShieldCheck}
          label="Đã kích hoạt"
          value={metrics.activated}
          tone="emerald"
        />
      </section>

      <section className="rounded-xl border border-[#c8ceda] bg-white px-5 py-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(280px,1fr)_190px_180px_180px] xl:items-end">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#687184]" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên khách, SĐT, email, phòng hoặc mã hợp đồng"
              className="h-11 w-full rounded-lg border border-[#c8ceda] bg-white pl-10 pr-3 text-sm text-[#0f1d33] outline-none placeholder:text-[#687184] focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10"
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
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[#c8ceda] bg-white shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
        <div className="border-b border-[#d4dbe8] px-5 py-4">
          <h2 className="text-lg font-extrabold text-[#0f1d33]">
            Danh sách cấp tài khoản
          </h2>
          <p className="mt-1 text-sm text-[#526179]">
            Dữ liệu lấy từ hợp đồng thuê ACTIVE trong database. Một lần gửi sẽ
            cấp tài khoản cho người ký chính và người ở cùng.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center text-sm font-semibold text-[#526179]">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Đang tải dữ liệu từ backend...
          </div>
        ) : groupedContracts.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
            <UsersRound className="h-10 w-10 text-[#9aa3b2]" />
            <p className="text-sm font-semibold text-[#526179]">
              Không có hợp đồng ACTIVE phù hợp.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-4">
            {groupedContracts.map((group) => {
              const isExpanded = expandedRooms.has(group.safeKey);
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
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                >
                  <div
                    className="flex cursor-pointer flex-col gap-4 bg-[#f7f9fc] p-4 transition hover:bg-[#f1f5fb] lg:flex-row lg:items-center lg:justify-between"
                    onClick={() => toggleRoom(group.safeKey)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleRoom(group.safeKey);
                      }
                    }}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-extrabold text-[#0f1d33]">
                          Phòng {group.roomCode || "Chưa có"}
                        </h3>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          {group.contractStatus === "EXPIRING_SOON"
                            ? "Hợp đồng sắp hết hạn"
                            : group.contractStatus === "TERMINATION_PENDING"
                              ? "Hợp đồng chờ thanh lý"
                              : "Hợp đồng ACTIVE"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[#526179]">
                        {group.propertyName || "Chưa có cơ sở"} · Hợp đồng{" "}
                        {group.contractCode || "#"}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <span className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#c8ceda] bg-white px-4 text-sm font-bold text-[#0f1d33]">
                        <UsersRound className="h-4 w-4 text-blue-600" />
                        {group.occupantCount}/{group.maxOccupants} người
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSend(group.contractId);
                        }}
                        onKeyDown={(event) => event.stopPropagation()}
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
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#526179]">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </span>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="dashboard-table border-t border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white text-[11px] font-bold uppercase tracking-[0.06em] text-[#526179]">
                          <tr>
                            <th className="px-5 py-4 text-left">
                              Khách thuê
                            </th>
                            <th className="px-5 py-4 text-center">Vai trò</th>
                            <th className="px-5 py-4 text-center">Ngày ký</th>
                            <th className="px-5 py-4 text-center">
                              Trạng thái
                            </th>
                            <th className="px-5 py-4 text-center">Thao tác</th>
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
                                <td
                                  data-label="Khách thuê"
                                  className="px-5 py-4"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dbe7ff] text-xs font-extrabold text-[#3157b7]">
                                      {getInitials(item.fullName)}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="max-w-[220px] truncate font-extrabold text-[#0f1d33]">
                                        {item.fullName || "Chưa cập nhật"}
                                      </p>
                                      <p className="mt-1 text-xs font-semibold text-[#687184]">
                                        <span>{item.phone || "Chưa có SĐT"}</span>
                                      </p>
                                      <p className="mt-1 inline-flex max-w-[220px] items-center gap-1 truncate text-xs font-semibold text-[#687184]">
                                        <span className="inline-flex items-center gap-1">
                                          <Mail className="h-3.5 w-3.5" />
                                          {item.email || "Chưa có email"}
                                        </span>
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
                                  data-label="Ngày ký"
                                  className="px-5 py-4 font-semibold text-[#0f1d33]"
                                >
                                  {formatDate(item.signedAt)}
                                </td>
                                <td
                                  data-label="Trạng thái"
                                  className="px-5 py-4"
                                >
                                  <div className="grid gap-1">
                                    <StatusBadge item={item} />
                                    <span className="text-xs text-[#687184]">
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
                                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
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
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
        <DashboardPagination
          page={page}
          size={size}
          totalElements={filteredTotalElements}
          totalPages={filteredTotalPages}
          itemLabel="khách thuê"
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
