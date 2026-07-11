"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Mail,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import { formatDateTime } from "@/lib/dateFormat";
import {
  createStaffAccount,
  fetchSimpleProperties,
  fetchUsers,
  updateUserRole,
  updateUserStatus,
} from "@/services/identityAccessService";
import { useAuth } from "../../_contexts/AuthContext";

const ALL_VALUE = "all";
const ROLE_OPTIONS = [
  { value: "MANAGER", label: "Quản lý" },
  { value: "ACCOUNTANT", label: "Kế toán" },
];
const STAFF_ROLES = ROLE_OPTIONS.map((item) => item.value);

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Đang hoạt động" },
  { value: "INACTIVE", label: "Tạm khóa" },
  { value: "PENDING_CONTRACT", label: "Chờ hợp đồng" },
  { value: "ARCHIVED", label: "Lưu trữ" },
  { value: "CLOSED", label: "Đã đóng" },
];
const MUTABLE_STATUSES = new Set(["ACTIVE", "INACTIVE"]);

const blankForm = {
  fullName: "",
  phone: "",
  email: "",
  role: "MANAGER",
};

function roleLabel(role) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label || role || "Chưa rõ";
}

function statusMeta(status) {
  const map = {
    ACTIVE: {
      label: "Đang hoạt động",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    INACTIVE: {
      label: "Tạm khóa",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    },
    PENDING_CONTRACT: {
      label: "Chờ hợp đồng",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    ARCHIVED: {
      label: "Lưu trữ",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    },
    CLOSED: {
      label: "Đã đóng",
      className: "border-slate-300 bg-slate-100 text-slate-700",
    },
  };
  return (
    map[status] || {
      label: status || "Chưa rõ",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    }
  );
}

function getInitials(name) {
  return String(name || "NV")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function MetricCard({ icon: Icon, label, value, tone = "slate" }) {
  const toneClass = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
  }[tone];

  return (
    <article className="flex min-h-[96px] items-center gap-4 rounded-xl border border-[#d4dbe8] bg-white px-5 py-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-[#687184]">
          {label}
        </p>
        <p className="mt-1 text-2xl font-extrabold leading-none text-[#0f1d33]">
          {value}
        </p>
      </div>
    </article>
  );
}

function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function InlineAlert({ tone = "error", children }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function SelectFilter({ label, value, onChange, options }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-semibold text-[#8490a5]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-[#c8ceda] bg-white px-3 text-sm font-semibold text-[#0f1d33] outline-none transition focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Modal({ title, onClose, children, footer }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-account-modal-title"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#d4dbe8] px-6 py-4">
          <h2 id="staff-account-modal-title" className="text-lg font-bold text-[#0f1d33]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#526179] hover:bg-[#f3f6fb] hover:text-[#0f1d33]"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer ? <div className="border-t border-[#d4dbe8] px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export default function StaffAccountsPage() {
  const { user } = useAuth();
  const currentUserId = user?.id ?? user?.userId ?? user?.user_id ?? null;
  const [items, setItems] = useState([]);
  const [properties, setProperties] = useState([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState(ALL_VALUE);
  const [statusFilter, setStatusFilter] = useState(ALL_VALUE);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(blankForm);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ role: "MANAGER", status: "ACTIVE" });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchUsers({
        page: page - 1,
        size,
        roles: roleFilter === ALL_VALUE ? STAFF_ROLES : [roleFilter],
        status: statusFilter,
        search: query,
      });
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (loadError) {
      setError(loadError?.message || "Không tải được danh sách tài khoản nhân viên.");
    } finally {
      setLoading(false);
    }
  }, [page, query, roleFilter, size, statusFilter]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadUsers]);

  useEffect(() => {
    let active = true;

    fetchSimpleProperties()
      .then((data) => {
        if (active) setProperties(data);
      })
      .catch(() => {
        if (active) setProperties([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(
    () => ({
      total: totalElements,
      active: items.filter((item) => item.status === "ACTIVE").length,
      firstPassword: items.filter((item) => item.mustChangePassword).length,
      inactive: items.filter((item) => item.status === "INACTIVE").length,
    }),
    [items, totalElements],
  );

  const roleOptions = useMemo(
    () => [{ value: ALL_VALUE, label: "Tất cả vai trò" }, ...ROLE_OPTIONS],
    [],
  );

  const statusOptions = useMemo(
    () => [{ value: ALL_VALUE, label: "Tất cả trạng thái" }, ...STATUS_OPTIONS],
    [],
  );

  const propertyText = useMemo(() => {
    if (!properties.length) return "Chưa có dữ liệu cơ sở";
    return `${properties.length} cơ sở khả dụng`;
  }, [properties.length]);

  const resetFiltersPage = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const validateCreateForm = () => {
    if (!createForm.fullName.trim()) return "Vui lòng nhập họ tên nhân viên.";
    if (!createForm.phone.trim()) return "Vui lòng nhập số điện thoại.";
    if (!createForm.email.trim()) return "Vui lòng nhập email.";
    if (!ROLE_OPTIONS.some((item) => item.value === createForm.role)) {
      return "Vai trò nhân viên không hợp lệ.";
    }
    return "";
  };

  const handleCreate = async () => {
    const validationError = validateCreateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await createStaffAccount({
        fullName: createForm.fullName.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email.trim(),
        role: createForm.role,
      });
      setMessage("Đã tạo tài khoản nhân viên và gửi thông tin đăng nhập qua email.");
      setCreateForm(blankForm);
      setCreateOpen(false);
      await loadUsers();
    } catch (createError) {
      setError(createError?.message || "Không tạo được tài khoản nhân viên.");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (account) => {
    setError("");
    setMessage("");
    setEditTarget(account);
    setEditForm({
      role: ROLE_OPTIONS.some((item) => item.value === account.role)
        ? account.role
        : "MANAGER",
      status: account.status || "ACTIVE",
    });
  };

  const handleSaveEdit = async () => {
    if (!editTarget?.id || saving) return;
    if (String(editTarget.id) === String(currentUserId)) {
      setError("Không thể tự sửa role hoặc trạng thái tài khoản của chính mình.");
      return;
    }
    if (!ROLE_OPTIONS.some((item) => item.value === editForm.role)) {
      setError("Vai trò nhân viên không hợp lệ.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (editForm.role !== editTarget.role) {
        await updateUserRole(editTarget.id, editForm.role);
      }
      if (editForm.status !== editTarget.status && MUTABLE_STATUSES.has(editForm.status)) {
        await updateUserStatus(editTarget.id, { status: editForm.status });
      }
      setMessage("Đã cập nhật tài khoản nhân viên.");
      setEditTarget(null);
      await loadUsers();
    } catch (saveError) {
      setError(saveError?.message || "Không cập nhật được tài khoản nhân viên.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (account) => {
    if (!account?.id || saving) return;
    if (String(account.id) === String(currentUserId)) {
      setError("Không thể khóa hoặc kích hoạt tài khoản của chính mình.");
      return;
    }
    if (!MUTABLE_STATUSES.has(account.status)) {
      setError("Chỉ có thể đổi trạng thái giữa đang hoạt động và tạm khóa.");
      return;
    }

    const nextStatus = account.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const confirmed = window.confirm(
      nextStatus === "INACTIVE"
        ? `Tạm khóa tài khoản ${account.fullName}?`
        : `Kích hoạt lại tài khoản ${account.fullName}?`,
    );
    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateUserStatus(account.id, { status: nextStatus });
      setMessage(
        nextStatus === "ACTIVE"
          ? "Đã kích hoạt tài khoản nhân viên."
          : "Đã tạm khóa tài khoản nhân viên.",
      );
      await loadUsers();
    } catch (statusError) {
      setError(statusError?.message || "Không cập nhật được trạng thái tài khoản.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-7 text-[#0f1d33]">
      <DashboardPageHeader
        title="Quản lý tài khoản nhân viên"
        description="Tạo và quản lý tài khoản web cho quản lý, kế toán; kiểm soát role, trạng thái đăng nhập và chuẩn bị gán cơ sở phụ trách."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#c8ceda] bg-white px-5 text-sm font-bold text-[#0f1d33] transition hover:bg-[#f6f8fc] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setMessage("");
              setCreateForm(blankForm);
              setCreateOpen(true);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#0f1d33] px-5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(15,29,51,0.18)] transition hover:bg-[#172842]"
          >
            <UserPlus className="h-4 w-4" />
            Tạo tài khoản nhân viên
          </button>
          </div>
        }
      />

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-4">
        <MetricCard icon={UsersRound} label="Tổng nhân viên" value={metrics.total} />
        <MetricCard icon={ShieldCheck} label="Đang hoạt động" value={metrics.active} tone="emerald" />
        <MetricCard icon={KeyRound} label="Chưa đổi mật khẩu" value={metrics.firstPassword} tone="amber" />
        <MetricCard icon={LockKeyhole} label="Tạm khóa" value={metrics.inactive} tone="rose" />
      </section>

      <section className="rounded-xl border border-[#c8ceda] bg-white px-5 py-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(280px,1fr)_190px_190px_220px] xl:items-end">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#687184]" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên, email hoặc số điện thoại"
              className="h-11 w-full rounded-lg border border-[#c8ceda] bg-white pl-10 pr-3 text-sm text-[#0f1d33] outline-none placeholder:text-[#687184] focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10"
            />
          </label>
          <SelectFilter
            label="Vai trò"
            value={roleFilter}
            options={roleOptions}
            onChange={resetFiltersPage(setRoleFilter)}
          />
          <SelectFilter
            label="Trạng thái"
            value={statusFilter}
            options={statusOptions}
            onChange={resetFiltersPage(setStatusFilter)}
          />
          <label className="grid gap-1.5">
            <span className="text-[11px] font-semibold text-[#8490a5]">Cơ sở phụ trách</span>
            <select
              value={ALL_VALUE}
              disabled
              className="h-11 rounded-lg border border-dashed border-[#c8ceda] bg-[#f8fafc] px-3 text-sm font-semibold text-[#687184]"
            >
              <option>{propertyText}</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs font-semibold text-[#687184]">
          Phần cơ sở phụ trách đang chờ API backend để lưu assignment, nên chưa cho chỉnh trực tiếp ở web.
        </p>
      </section>

      {message ? <InlineAlert tone="success">{message}</InlineAlert> : null}
      {error ? <InlineAlert>{error}</InlineAlert> : null}

      <section className="overflow-hidden rounded-xl border border-[#c8ceda] bg-white shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
        <div className="border-b border-[#d4dbe8] px-5 py-4">
          <h2 className="text-lg font-extrabold text-[#0f1d33]">
            Danh sách tài khoản nhân viên
          </h2>
          <p className="mt-1 text-sm text-[#526179]">
            Dữ liệu lấy từ API tài khoản hệ thống, chỉ hiển thị và thao tác với role nhân viên.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center text-sm font-semibold text-[#526179]">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Đang tải danh sách nhân viên...
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 text-center">
            <UsersRound className="h-10 w-10 text-[#9aa3b2]" />
            <p className="text-sm font-semibold text-[#526179]">
              Không có tài khoản nhân viên phù hợp.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#f7f9fb] text-xs font-bold uppercase tracking-[0.06em] text-[#687184]">
                <tr>
                  <th className="px-5 py-4">Nhân viên</th>
                  <th className="px-5 py-4">Vai trò</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4">Cơ sở phụ trách</th>
                  <th className="px-5 py-4">Đăng nhập gần nhất</th>
                  <th className="px-5 py-4">Ngày tạo</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d4dbe8]">
                {items.map((account) => {
                  const isSelf = String(account.id) === String(currentUserId);
                  const canToggle = MUTABLE_STATUSES.has(account.status) && !isSelf;
                  const assignedPropertyNames = Array.isArray(account.assignedProperties)
                    ? account.assignedProperties
                        .map((property) => property.name || property.propertyName)
                        .filter(Boolean)
                    : [];

                  return (
                    <tr key={account.id || account.email} className="align-top">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ecf3ff] text-xs font-bold text-[#465fff]">
                            {getInitials(account.fullName)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-[#0f1d33]">{account.fullName}</p>
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[#687184]">
                              <span>{account.phone || "Chưa có SĐT"}</span>
                              <span className="inline-flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5" />
                                {account.email || "Chưa có email"}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-[#0f1d33]">
                        {roleLabel(account.role)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={account.status} />
                        {account.mustChangePassword ? (
                          <p className="mt-2 text-xs font-semibold text-amber-700">
                            Chưa đổi mật khẩu lần đầu
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-[#526179]">
                        <span className="inline-flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-[#687184]" />
                          {assignedPropertyNames.length
                            ? assignedPropertyNames.join(", ")
                            : "Chưa gán"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[#526179]">
                        {formatDateTime(account.lastLoginAt, "Chưa đăng nhập")}
                      </td>
                      <td className="px-5 py-4 text-[#526179]">
                        {formatDateTime(account.createdAt, "Chưa cập nhật")}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(account)}
                            disabled={isSelf}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#c8ceda] px-3 text-xs font-bold text-[#0f1d33] transition hover:bg-[#f6f8fc] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil className="h-4 w-4" />
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(account)}
                            disabled={!canToggle || saving}
                            className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              account.status === "ACTIVE"
                                ? "border border-rose-200 text-rose-700 hover:bg-rose-50"
                                : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {account.status === "ACTIVE" ? (
                              <LockKeyhole className="h-4 w-4" />
                            ) : (
                              <ShieldCheck className="h-4 w-4" />
                            )}
                            {account.status === "ACTIVE" ? "Tạm khóa" : "Kích hoạt"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <DashboardPagination
          page={page}
          size={size}
          totalElements={totalElements}
          totalPages={totalPages}
          itemLabel="nhân viên"
          onPageChange={setPage}
          onSizeChange={(nextSize) => {
            setSize(nextSize);
            setPage(1);
          }}
        />
      </section>

      {createOpen ? (
        <Modal
          title="Tạo tài khoản nhân viên"
          onClose={() => setCreateOpen(false)}
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-10 rounded-lg border border-[#c8ceda] px-4 text-sm font-bold text-[#0f1d33]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="h-10 rounded-lg bg-[#0f1d33] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Đang tạo..." : "Tạo tài khoản"}
              </button>
            </div>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-bold text-[#0f1d33]">Họ tên</span>
              <input
                value={createForm.fullName}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, fullName: event.target.value }))
                }
                className="h-11 rounded-lg border border-[#c8ceda] px-3 text-sm font-semibold outline-none focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10"
                placeholder="Nguyễn Văn A"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-[#0f1d33]">Số điện thoại</span>
              <input
                value={createForm.phone}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, phone: event.target.value }))
                }
                className="h-11 rounded-lg border border-[#c8ceda] px-3 text-sm font-semibold outline-none focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10"
                placeholder="0901234567"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-[#0f1d33]">Email</span>
              <input
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, email: event.target.value }))
                }
                className="h-11 rounded-lg border border-[#c8ceda] px-3 text-sm font-semibold outline-none focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10"
                placeholder="nhanvien@example.com"
              />
            </label>
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-bold text-[#0f1d33]">Vai trò</span>
              <select
                value={createForm.role}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, role: event.target.value }))
                }
                className="h-11 rounded-lg border border-[#c8ceda] px-3 text-sm font-semibold outline-none focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-lg border border-dashed border-[#c8ceda] bg-[#f8fafc] p-4 md:col-span-2">
              <p className="text-sm font-bold text-[#0f1d33]">Cơ sở phụ trách</p>
              <p className="mt-1 text-sm font-semibold text-[#687184]">
                Đã tải {properties.length} cơ sở. Chưa thể lưu gán cơ sở vì backend chưa có API assignment cho nhân viên.
              </p>
            </div>
          </div>
        </Modal>
      ) : null}

      {editTarget ? (
        <Modal
          title={`Sửa tài khoản ${editTarget.fullName}`}
          onClose={() => setEditTarget(null)}
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="h-10 rounded-lg border border-[#c8ceda] px-4 text-sm font-bold text-[#0f1d33]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="h-10 rounded-lg bg-[#0f1d33] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          }
        >
          <div className="grid gap-4">
            <div className="rounded-lg border border-[#d4dbe8] bg-[#f8fafc] p-4">
              <p className="font-bold text-[#0f1d33]">{editTarget.fullName}</p>
              <p className="mt-1 text-sm font-semibold text-[#687184]">
                {editTarget.email || editTarget.phone}
              </p>
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-[#0f1d33]">Vai trò</span>
              <select
                value={editForm.role}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, role: event.target.value }))
                }
                className="h-11 rounded-lg border border-[#c8ceda] px-3 text-sm font-semibold outline-none focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-[#0f1d33]">Trạng thái</span>
              <select
                value={editForm.status}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, status: event.target.value }))
                }
                className="h-11 rounded-lg border border-[#c8ceda] px-3 text-sm font-semibold outline-none focus:border-[#0f2748] focus:ring-2 focus:ring-[#0f2748]/10"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={!MUTABLE_STATUSES.has(option.value)}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="text-xs font-semibold text-[#687184]">
                Phase này chỉ cho đổi giữa đang hoạt động và tạm khóa.
              </span>
            </label>
            <div className="rounded-lg border border-dashed border-[#c8ceda] bg-[#f8fafc] p-4">
              <p className="text-sm font-bold text-[#0f1d33]">Cơ sở phụ trách</p>
              <p className="mt-1 text-sm font-semibold text-[#687184]">
                Chưa có endpoint lưu assignment, nên phần này chỉ hiển thị sau khi backend bổ sung API.
              </p>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
