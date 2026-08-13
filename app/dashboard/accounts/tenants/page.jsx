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
import DashboardFilterDropdown from "@/components/dashboard/DashboardFilterDropdown";

const ALL_VALUE = "all";
// ponytail: local filters cover the first 1000 tenant account candidates; move filters into the API when this grows.
const TENANT_ACCOUNT_FETCH_SIZE = 1000;

const ACCOUNT_STATE_OPTIONS = [
  { value: ALL_VALUE, label: "Tất cả trạng thái" },
  { value: "NOT_SENT", label: "Chưa cấp" },
  { value: "PENDING", label: "Đang gửi" },
  { value: "SENT", label: "Đã gửi" },
  { value: "ACTIVATED", label: "Đã kích hoạt" },
  { value: "DISABLED", label: "Đã vô hiệu hóa" },
  { value: "FAILED", label: "Gửi thất bại" },
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
    ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-300"
    : "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300";
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
      className:
        "border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
    };
  }

  if (item.provisioningStatus === "PENDING") {
    return {
      key: "PENDING",
      label: "Đang gửi",
      hint: "Hệ thống đang xử lý gửi tài khoản.",
      className:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300",
    };
  }

  if (item.provisioningStatus === "FAILED") {
    return {
      key: "FAILED",
      label: "Gửi thất bại",
      hint: item.failureReason || "Có thể thử gửi lại sau khi xác nhận.",
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300",
    };
  }

  if (item.provisioningStatus === "NOT_PROVISIONED") {
    return {
      key: "NOT_SENT",
      label: "Chưa cấp",
      hint: "Chưa gửi tài khoản mobile.",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300",
    };
  }

  if (item.provisioningStatus === "SENT") {
    return {
      key: "SENT",
      label: "Đã gửi",
      hint: "Chờ khách đổi mật khẩu và hoàn tất hồ sơ trên mobile.",
      className:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300",
    };
  }

  return {
    key: "ACTIVATED",
    label: "Đã kích hoạt",
    hint: "Khách đã đổi mật khẩu lần đầu.",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  };
}

function SelectFilter({ value, options, onChange, label }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-semibold text-[#8490a5] dark:text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-[#c8ceda] bg-white px-3 text-sm font-semibold text-[#0f1d33] outline-none transition focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10 dark:border-white/10 dark:bg-[#020817] dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-white text-[#0f1d33] dark:bg-[#020817] dark:text-white">
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

function floorFromRoomCode(roomCode) {
  const digits = String(roomCode || "").match(/\d+/)?.[0] || "";
  if (!digits) return "";
  return digits.length >= 3 ? digits.slice(0, -2) : digits.slice(0, -1) || digits;
}

export default function AccountsPage() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState(ALL_VALUE);
  const [floorFilter, setFloorFilter] = useState(ALL_VALUE);
  const [stateFilter, setStateFilter] = useState(ALL_VALUE);
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
      { value: ALL_VALUE, label: "Tất cả cơ sở" },
      ...Array.from(
        new Set(items.map((item) => item.propertyName).filter(Boolean)),
      ).map((property) => ({ value: property, label: property })),
    ],
    [items],
  );

  const floorOptions = useMemo(() => {
    if (propertyFilter === ALL_VALUE) {
      return [{ value: ALL_VALUE, label: "Chọn cơ sở trước" }];
    }

    const floors = new Set();
    items.forEach((item) => {
      if (item.propertyName !== propertyFilter) return;
      const floor = floorFromRoomCode(item.roomCode);
      if (floor) floors.add(floor);
    });

    return [
      { value: ALL_VALUE, label: "Tất cả tầng" },
      ...Array.from(floors)
        .sort((left, right) => Number(left) - Number(right))
        .map((floor) => ({ value: floor, label: `Tầng ${floor}` })),
    ];
  }, [items, propertyFilter]);


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
          stateFilter === ALL_VALUE || state.key === stateFilter;
        const matchesFloor =
          floorFilter === ALL_VALUE || floorFromRoomCode(item.roomCode) === floorFilter;
        return matchesQuery && matchesProperty && matchesFloor && matchesState;
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
  }, [floorFilter, items, propertyFilter, query, stateFilter]);

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
    <div className="grid gap-7 text-[#0f1d33] dark:text-white">
      <DashboardPageHeader
        title="Quản lý tài khoản khách thuê"
      />

      <section className="rounded-xl border border-[#c8ceda] bg-white px-5 py-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-[#0f172a]">
        <div className="grid gap-4 xl:grid-cols-[minmax(280px,1fr)_190px_180px_190px] xl:items-end">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#687184] dark:text-slate-400" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên khách, SĐT, email, phòng hoặc mã hợp đồng"
              className="h-11 w-full rounded-lg border border-[#c8ceda] bg-white pl-10 pr-3 text-sm text-[#0f1d33] outline-none placeholder:text-[#687184] focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10 dark:border-white/10 dark:bg-[#020817] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
            />
          </label>
          <DashboardFilterDropdown
            label="Cơ sở"
            value={propertyFilter}
            options={propertyOptions}
            onChange={(value) => {
              setPropertyFilter(value);
              setFloorFilter(ALL_VALUE);
              setPage(1);
            }}
          />
          <DashboardFilterDropdown
            label="Tầng"
            value={floorFilter}
            options={floorOptions}
            disabled={propertyFilter === ALL_VALUE || floorOptions.length <= 1}
            onChange={(value) => {
              setFloorFilter(value);
              setPage(1);
            }}
          />
          <DashboardFilterDropdown
            label="Trạng thái"
            value={stateFilter}
            options={ACCOUNT_STATE_OPTIONS}
            onChange={(value) => {
              setStateFilter(value);
              setPage(1);
            }}
          />
        </div>
      </section>

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[#c8ceda] bg-white shadow-[0_8px_22px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-[#0f172a]">

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center text-sm font-semibold text-[#526179] dark:text-slate-400">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Đang tải dữ liệu từ backend...
          </div>
        ) : groupedContracts.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
            <UsersRound className="h-10 w-10 text-[#9aa3b2] dark:text-slate-500" />
            <p className="text-sm font-semibold text-[#526179] dark:text-slate-400">
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
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#020817]"
                >
                  <div
                    className="flex cursor-pointer flex-col gap-4 bg-[#f7f9fc] p-4 transition hover:bg-[#f1f5fb] dark:bg-white/5 dark:hover:bg-white/10 lg:flex-row lg:items-center lg:justify-between"
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
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-extrabold text-[#0f1d33] dark:text-white">
                          Phòng {group.roomCode || "Chưa có"}
                        </h3>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                          {group.contractStatus === "EXPIRING_SOON"
                            ? "Hợp đồng sắp hết hạn"
                            : group.contractStatus === "TERMINATION_PENDING"
                              ? "Hợp đồng chờ thanh lý"
                              : "Hợp đồng ACTIVE"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[#526179] dark:text-slate-400">
                        {group.propertyName || "Chưa có cơ sở"} · Hợp đồng{" "}
                        {group.contractCode || "#"}
                      </p>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-[154px_224px_40px] sm:items-center lg:w-[442px]">
                      <span className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#c8ceda] bg-white px-3 text-sm font-bold text-[#0f1d33] dark:border-white/10 dark:bg-[#0f172a] dark:text-white">
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
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0f1d33] px-4 text-sm font-bold text-white transition hover:bg-[#172842] disabled:cursor-not-allowed disabled:bg-[#9aa3b2] dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8] dark:disabled:bg-slate-700"
                      >
                        <Send className="h-4 w-4" />
                        <span className="whitespace-nowrap">
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
                        </span>
                      </button>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#526179] dark:text-slate-400">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </span>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="dashboard-table border-t border-slate-200 dark:border-white/10">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white text-[11px] font-bold uppercase tracking-[0.06em] text-[#526179] dark:bg-[#020817] dark:text-slate-400">
                          <tr>
                            <th className="px-5 py-4 text-left">Khách thuê</th>
                            <th className="px-5 py-4 text-center">Vai trò</th>
                            <th className="px-5 py-4 text-center">Ngày ký</th>
                            <th className="px-5 py-4 text-center">
                              Trạng thái
                            </th>
                            <th className="px-5 py-4 text-center">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eef1f6] dark:divide-white/10">
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
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dbe7ff] text-xs font-extrabold text-[#3157b7] dark:bg-blue-500/10 dark:text-blue-300">
                                      {getInitials(item.fullName)}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="max-w-[220px] truncate font-extrabold text-[#0f1d33] dark:text-white">
                                        {item.fullName || "Chưa cập nhật"}
                                      </p>
                                      <p className="mt-1 text-xs font-semibold text-[#687184] dark:text-slate-400">
                                        <span>
                                          {item.phone || "Chưa có SĐT"}
                                        </span>
                                      </p>
                                      <p className="mt-1 inline-flex max-w-[220px] items-center gap-1 truncate text-xs font-semibold text-[#687184] dark:text-slate-400">
                                        <span className="inline-flex items-center gap-1">
                                          <Mail className="h-3.5 w-3.5" />
                                          {item.email || "Chưa có email"}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td
                                  data-label="Vai trò"
                                  className="px-5 py-4 justify-center text-center"
                                >
                                  <span
                                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold justify-center ${roleClass(item.roomRole)}`}
                                  >
                                    {roleLabel(item.roomRole)}
                                  </span>
                                </td>
                                <td
                                  data-label="Ngày ký"
                                  className="px-5 py-4 font-semibold text-[#0f1d33] justify-center text-center dark:text-slate-200"
                                >
                                  {formatDate(item.signedAt)}
                                </td>
                                <td
                                  data-label="Trạng thái"
                                  className="px-5 py-4"
                                >
                                  <div className="grid gap-1">
                                    <StatusBadge item={item} />
                                    <span className="text-xs text-[#687184] dark:text-slate-400">
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
                                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20 dark:disabled:border-white/10 dark:disabled:bg-white/5 dark:disabled:text-slate-500"
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
