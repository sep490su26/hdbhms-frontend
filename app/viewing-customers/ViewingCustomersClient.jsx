"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gauge,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  Map,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  UserRoundCog,
  Users,
  Wrench,
  X,
} from "lucide-react";
import {
  STATUS_OPTIONS,
  VIEWING_STATUSES,
  combineAppointmentParts,
  createViewingCustomer,
  deleteViewingCustomer,
  fetchViewingCustomerStats,
  fetchViewingCustomerTrash,
  fetchViewingCustomers,
  fetchViewingProperties,
  fetchViewingRooms,
  forceDeleteViewingCustomer,
  getAppointmentParts,
  getCurrentLocalDateTimeInputValue,
  getViewingCustomerErrorMessage,
  isFutureAppointment,
  isValidVietnamPhone,
  restoreViewingCustomer,
  updateViewingCustomer,
  updateViewingCustomerStatus,
} from "@/services/viewingCustomersService";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import { sortByNewest } from "@/lib/sortByNewest.mjs";
import { enumLabel } from "@/lib/enumLabels";

const emptyForm = {
  fullName: "",
  phone: "",
  propertyId: "",
  interestedRoomId: "",
  appointmentDate: "",
  appointmentTime: "",
  note: "",
  status: "PENDING",
};

const navItems = [
  { label: "Tổng quan", icon: LayoutDashboard },
  { label: "Sơ đồ tầng", icon: Map },
  { label: "Quản lý phòng", icon: Building2 },
  { label: "Quản lý khách xem", icon: Users, active: true },
  { label: "Quản lý Tài khoản", icon: UserRoundCog },
  { label: "Nhập số điện nước", icon: Gauge },
  { label: "Bảo trì", icon: Wrench },
  { label: "Mẫu hợp đồng", icon: FileText },
  { label: "Báo cáo Tài chính", icon: ClipboardList },
];

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col bg-[#091426] text-white lg:flex">
      <div className="flex items-center gap-3 border-b border-white/5 px-5 py-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#091426]">
          <Home className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold leading-5">Hải Đăng</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#7a879d]">Property management</p>
        </div>
      </div>

      <div className="px-5 pt-7 text-[10px] font-bold uppercase tracking-[0.2em] text-[#39465a]">Main menu</div>
      <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className={`flex h-11 items-center gap-3 rounded-md px-3 text-left text-sm transition ${
                item.active ? "bg-[#172235] text-white" : "text-[#718096] hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-4">
        <button type="button" className="mb-3 flex w-full items-center justify-between rounded-md px-3 py-3 text-sm text-[#718096] hover:bg-white/5 hover:text-white">
          <span className="inline-flex items-center gap-3">
            <Bell className="h-4 w-4" />
            Thông báo
          </span>
          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">5</span>
        </button>
        <div className="flex items-center gap-3 rounded-lg bg-[#172235] px-3 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-[#091426]">A</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">Admin User</p>
            <p className="truncate text-[11px] text-[#718096]">admin@haidang.vn</p>
          </div>
        </div>
        <button type="button" className="mt-3 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm text-[#718096] hover:bg-white/5 hover:text-white">
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

function Topbar({ search, onSearchChange }) {
  return (
    <header className="sticky top-0 z-20 flex h-[58px] items-center justify-between border-b border-[#d9dde5] bg-white px-5 lg:ml-[240px]">
      <label className="relative w-full max-w-[326px]">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm kiếm khách hàng..."
          className="h-10 w-full rounded-none border border-[#cfd5de] bg-[#f9fafb] pl-11 pr-3 text-[13px] text-[#111827] outline-none placeholder:text-[#8b95a4] focus:border-[#091426]"
        />
      </label>

      <div className="flex items-center gap-5 text-[#4b5563]">
        <button type="button" aria-label="Thông báo" className="rounded-full p-1.5 hover:bg-[#f1f3f5]">
          <Bell className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Trợ giúp" className="rounded-full p-1.5 hover:bg-[#f1f3f5]">
          <HelpCircle className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Cài đặt" className="rounded-full p-1.5 hover:bg-[#f1f3f5]">
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function StatusSelect({ status, onChange }) {
  const styles = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    VIEWED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED: "border-gray-200 bg-gray-50 text-gray-600",
  };

  return (
    <select
      value={status}
      onChange={(event) => onChange(event.target.value)}
      className={`h-8 rounded-full border px-3 text-xs font-bold outline-none ${styles[status] || styles.PENDING}`}
    >
      {STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function CustomerAvatar({ name }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2);
  const dark = name.includes("Phạm");

  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${dark ? "bg-black text-white" : "bg-[#d7e6ff] text-[#39557a]"}`}>
      {initials.toUpperCase()}
    </span>
  );
}

function ViewingModal({ mode, form, errors, properties, rooms, minDateTime, lockedPropertyId, onChange, onSubmit, onClose }) {
  const minDate = minDateTime ? minDateTime.slice(0, 10) : undefined;
  const minTime = minDateTime && form.appointmentDate === minDate ? minDateTime.slice(11, 16) : undefined;
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const isPropertyLocked = Boolean(lockedPropertyId);
  const filteredRooms = form.propertyId
    ? safeRooms.filter((room) => String(room.propertyId ?? form.propertyId) === String(form.propertyId))
    : safeRooms;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
          <h2 className="text-lg font-bold text-[#091426]">{mode === "edit" ? "Sửa khách xem" : "Thêm khách xem"}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-md p-2 text-[#64748b] hover:bg-[#f1f3f5]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid max-h-[72vh] gap-4 overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Họ tên khách *" error={errors.fullName}>
              <input value={form.fullName} onChange={(event) => onChange("fullName", event.target.value)} className="field-input" />
            </Field>
            <Field label="Số điện thoại *" error={errors.phone}>
              <input value={form.phone} onChange={(event) => onChange("phone", event.target.value)} className="field-input" />
            </Field>
            <Field label="Cơ sở *" error={errors.propertyId}>
              <select
                value={form.propertyId}
                disabled={isPropertyLocked}
                onChange={(event) => {
                  const nextPropertyId = event.target.value;
                  onChange("propertyId", nextPropertyId);
                  onChange("interestedRoomId", "");
                }}
                className="field-input disabled:cursor-not-allowed disabled:bg-[#f1f3f5] disabled:text-[#64748b]"
              >
                <option value="">Chọn cơ sở</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>{property.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Phòng quan tâm">
              <select
                value={form.interestedRoomId}
                onChange={(event) => onChange("interestedRoomId", event.target.value)}
                disabled={!form.propertyId}
                className="field-input disabled:cursor-not-allowed disabled:bg-[#f1f3f5] disabled:text-[#94a3b8]"
              >
                <option value="">{form.propertyId ? "Chọn phòng" : "Chọn cơ sở trước"}</option>
                {filteredRooms.map((room) => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Ngày hẹn xem *">
              <input
                type="date"
                min={minDate}
                value={form.appointmentDate}
                onChange={(event) => onChange("appointmentDate", event.target.value)}
                className="field-input"
              />
            </Field>
            <Field label="Giờ hẹn xem *" error={errors.appointmentAt}>
              <input
                type="time"
                min={minTime || undefined}
                value={form.appointmentTime}
                onChange={(event) => onChange("appointmentTime", event.target.value)}
                className="field-input"
              />
            </Field>
          </div>

          <Field label="Ghi chú">
            <textarea value={form.note} onChange={(event) => onChange("note", event.target.value)} rows={4} className="field-input min-h-24 resize-none py-3" />
          </Field>

          <div className="flex justify-end gap-3 border-t border-[#e2e8f0] pt-4">
            <button type="button" onClick={onClose} className="h-10 rounded-lg border border-[#cfd5de] px-4 text-sm font-bold text-[#091426] hover:bg-[#f7f9fb]">
              Hủy
            </button>
            <button type="submit" className="h-10 rounded-lg bg-[#091426] px-5 text-sm font-bold text-white hover:bg-[#13243d]">
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-bold text-[#091426]">{label}</span>
      {children}
      {error && <span className="text-xs font-semibold text-rose-600">{error}</span>}
    </label>
  );
}

function TrashModal({ rows, pagination, onClose, onRestore, onForceDelete, onPageChange }) {
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.size + 1;
  const to = pagination.total === 0 ? 0 : Math.min(from + rows.length - 1, pagination.total);
  const pages = Array.from({ length: pagination.totalPages }, (_, index) => index + 1).slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
          <h2 className="text-lg font-bold text-[#091426]">Thùng rác</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-md p-2 text-[#64748b] hover:bg-[#f1f3f5]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="bg-[#f1f3f5] text-[11px] font-bold uppercase tracking-[0.04em] text-[#4b5563]">
              <tr>
                <th className="px-5 py-4">Tên khách</th>
                <th className="px-5 py-4">Số điện thoại</th>
                <th className="px-5 py-4">Cơ sở</th>
                <th className="px-5 py-4">Phòng quan tâm</th>
                <th className="px-5 py-4">Ngày giờ xem</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4">Ngày xóa</th>
                <th className="px-5 py-4">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((customer) => (
                <tr key={customer.id} className="border-t border-[#d9dde5] text-sm">
                  <td className="px-5 py-4 font-bold text-[#111827]">{customer.fullName}</td>
                  <td className="px-5 py-4 text-[#374151]">{customer.phone}</td>
                  <td className="px-5 py-4 text-[#374151]">{customer.propertyName}</td>
                  <td className="px-5 py-4 text-[#374151]">{customer.interestedRoomName || "Chưa chọn phòng"}</td>
                  <td className="px-5 py-4 font-bold text-[#111827]">{customer.appointmentLabel || "—"}</td>
                  <td className="px-5 py-4 text-[#374151]">{enumLabel(customer.status, VIEWING_STATUSES, "Chưa xác định")}</td>
                  <td className="px-5 py-4 text-[#374151]">{customer.deletedLabel || "—"}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onRestore(customer)} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                        Khôi phục
                      </button>
                      <button type="button" onClick={() => onForceDelete(customer)} className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
                        Xóa vĩnh viễn
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm font-semibold text-[#64748b]">
                    Thùng rác đang trống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#d9dde5] px-4 py-4 text-xs text-[#4b5563] sm:flex-row sm:items-center sm:justify-between">
          <span>{pagination.total === 0 ? "Không có khách xem phòng nào trong thùng rác" : `Đang hiển thị ${from} đến ${to} của ${pagination.total} khách`}</span>
          <div className="flex items-center gap-2">
            {pages.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`flex h-8 w-8 items-center justify-center rounded border text-xs font-bold ${
                  page === pagination.page ? "border-[#091426] bg-[#091426] text-white" : "border-[#cfd5de] bg-white text-[#374151] hover:bg-[#f1f3f5]"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ViewingCustomersClient() {
  const pageSize = 10;
  const [customers, setCustomers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [filterRooms, setFilterRooms] = useState([]);
  const [formRooms, setFormRooms] = useState([]);
  const [filters, setFilters] = useState({ keyword: "", propertyId: "all", roomId: "all", status: "all", fromDate: "", toDate: "" });
  const [stats, setStats] = useState({ todayCount: 0, pendingCount: 0, viewedCount: 0 });
  const [pagination, setPagination] = useState({ page: 1, size: pageSize, total: 0, totalPages: 0 });
  const [trashRows, setTrashRows] = useState([]);
  const [trashPagination, setTrashPagination] = useState({ page: 1, size: pageSize, total: 0, totalPages: 0 });
  const [trashOpen, setTrashOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [minDateTime, setMinDateTime] = useState("");

  useEffect(() => {
    if (!modalMode) return;
    const timer = window.setTimeout(() => {
      setMinDateTime(getCurrentLocalDateTimeInputValue());
    }, 0);

    return () => window.clearTimeout(timer);
  }, [modalMode]);

  useEffect(() => {
    fetchViewingProperties()
      .then(setProperties)
      .catch((error) => setErrorMessage(getViewingCustomerErrorMessage(error)));
  }, []);

  useEffect(() => {
    if (!form.propertyId) {
      const timer = window.setTimeout(() => setFormRooms([]), 0);
      return () => window.clearTimeout(timer);
    }
    fetchViewingRooms(form.propertyId)
      .then(setFormRooms)
      .catch((error) => setErrorMessage(getViewingCustomerErrorMessage(error)));
  }, [form.propertyId]);

  useEffect(() => {
    if (filters.propertyId === "all") {
      const timer = window.setTimeout(() => setFilterRooms([]), 0);
      return () => window.clearTimeout(timer);
    }
    fetchViewingRooms(filters.propertyId)
      .then(setFilterRooms)
      .catch((error) => setErrorMessage(getViewingCustomerErrorMessage(error)));
  }, [filters.propertyId]);

  const loadCustomers = useCallback(async (nextPage = 1) => {
    try {
      const [listData, statsData] = await Promise.all([
        fetchViewingCustomers({ filters, page: nextPage, size: pageSize }),
        fetchViewingCustomerStats(filters),
      ]);
      setCustomers(sortByNewest(listData.items, ["createdAt", "created_at"]));
      setPagination(listData);
      setStats(statsData);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getViewingCustomerErrorMessage(error));
    }
  }, [filters, pageSize]);

  const loadTrash = useCallback(async (nextPage = 1) => {
    try {
      const data = await fetchViewingCustomerTrash({ filters, page: nextPage, size: pageSize });
      setTrashRows(sortByNewest(data.items, ["deletedAt", "deleted_at", "createdAt", "created_at"]));
      setTrashPagination(data);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getViewingCustomerErrorMessage(error));
    }
  }, [filters, pageSize]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCustomers(1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, ...(key === "propertyId" ? { roomId: "all" } : {}) }));
  };

  const openCreate = () => {
    setForm({
      ...emptyForm,
      propertyId: filters.propertyId === "all" ? "" : String(filters.propertyId),
    });
    setErrors({});
    setEditingId(null);
    setModalMode("create");
  };

  const openEdit = (customer) => {
    const appointmentParts = getAppointmentParts(customer.appointmentAt);
    setForm({
      fullName: customer.fullName,
      phone: customer.phone,
      propertyId: String(customer.propertyId),
      interestedRoomId: customer.interestedRoomId ? String(customer.interestedRoomId) : "",
      appointmentDate: appointmentParts.appointmentDate,
      appointmentTime: appointmentParts.appointmentTime,
      note: customer.note || "",
      status: customer.status,
    });
    setErrors({});
    setEditingId(customer.id);
    setModalMode("edit");
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!form.fullName.trim()) nextErrors.fullName = "Vui lòng nhập họ tên khách.";
    if (!form.phone.trim()) nextErrors.phone = "Vui lòng nhập số điện thoại.";
    else if (!isValidVietnamPhone(form.phone)) nextErrors.phone = "Số điện thoại Việt Nam chưa hợp lệ.";
    if (!form.propertyId) nextErrors.propertyId = "Vui lòng chọn cơ sở.";
    if (!form.appointmentDate || !form.appointmentTime) nextErrors.appointmentAt = "Vui lòng chọn ngày giờ hẹn xem.";
    else if (!isFutureAppointment(form.appointmentDate, form.appointmentTime)) {
      nextErrors.appointmentAt = "Ngày giờ hẹn xem phải sau thời gian hiện tại";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    const appointmentAt = combineAppointmentParts(form.appointmentDate, form.appointmentTime);
    const roomId = form.interestedRoomId ? Number(form.interestedRoomId) : null;

    const payload = {
      customerName: form.fullName.trim(),
      phone: form.phone.trim().replace(/\s+/g, ""),
      propertyId: Number(form.propertyId),
      roomId,
      appointmentAt,
      status: form.status || "PENDING",
      note: form.note.trim(),
    };

    try {
      if (modalMode === "edit") {
        await updateViewingCustomer(editingId, payload);
      } else {
        await createViewingCustomer(payload);
      }
      setModalMode(null);
      await loadCustomers(modalMode === "edit" ? pagination.page : 1);
    } catch (error) {
      setErrorMessage(getViewingCustomerErrorMessage(error));
    }
  };

  const deleteCustomer = async (customer) => {
    if (window.confirm("Khách xem phòng này sẽ được chuyển vào thùng rác và tự động xóa sau 7 ngày. Bạn có chắc muốn xóa không?")) {
      try {
        await deleteViewingCustomer(customer.id);
        await loadCustomers(pagination.page);
        if (trashOpen) await loadTrash(trashPagination.page);
      } catch (error) {
        setErrorMessage(getViewingCustomerErrorMessage(error));
      }
    }
  };

  const changeStatus = async (customer, nextStatus) => {
    const previousStatus = customer.status;
    setCustomers((current) =>
      current.map((item) => (item.id === customer.id ? { ...item, status: nextStatus } : item)),
    );
    try {
      await updateViewingCustomerStatus(customer.id, nextStatus);
      await loadCustomers(pagination.page);
    } catch (error) {
      setCustomers((current) =>
        current.map((item) => (item.id === customer.id ? { ...item, status: previousStatus } : item)),
      );
      setErrorMessage(getViewingCustomerErrorMessage(error));
    }
  };

  const openTrash = async () => {
    setTrashOpen(true);
    await loadTrash(1);
  };

  const restoreCustomer = async (customer) => {
    try {
      await restoreViewingCustomer(customer.id);
      await Promise.all([loadCustomers(pagination.page), loadTrash(trashPagination.page)]);
    } catch (error) {
      setErrorMessage(getViewingCustomerErrorMessage(error));
    }
  };

  const forceDeleteCustomer = async (customer) => {
    if (!window.confirm(`Xóa vĩnh viễn lịch xem phòng của ${customer.fullName}?`)) return;
    try {
      await forceDeleteViewingCustomer(customer.id);
      await loadTrash(trashPagination.page);
    } catch (error) {
      setErrorMessage(getViewingCustomerErrorMessage(error));
    }
  };

  const pageFrom = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.size + 1;
  const pageTo = pagination.total === 0 ? 0 : Math.min(pageFrom + customers.length - 1, pagination.total);
  const pageNumbers = Array.from({ length: pagination.totalPages }, (_, index) => index + 1).slice(0, 5);

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#111827]">
      <Sidebar />
      <Topbar search={filters.keyword} onSearchChange={(value) => updateFilter("keyword", value)} />

      <main className="px-4 py-8 lg:ml-[240px] lg:px-9">
        <div className="mx-auto max-w-[1120px]">
          {errorMessage && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}
          <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[28px] font-extrabold leading-8 tracking-[-0.02em] text-black">Danh sách khách xem phòng</h1>
              <p className="mt-2 text-sm text-[#4b5563]">Quản lý và theo dõi lịch hẹn xem phòng của khách tiềm năng.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={filters.propertyId}
                onChange={(event) => updateFilter("propertyId", event.target.value)}
                className="h-11 min-w-[170px] rounded-md border border-[#cfd5de] bg-white px-3 text-sm font-bold text-[#091426] shadow-sm outline-none focus:border-[#091426]"
              >
                <option value="all">Tất cả cơ sở</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>{property.name}</option>
                ))}
              </select>
              <button type="button" onClick={openCreate} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#091426] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#13243d]">
                <Plus className="h-4 w-4" />
                Thêm khách xem
              </button>
            </div>
          </section>

          <section className="mt-7 grid gap-5 md:grid-cols-3">
            <DashboardStatCard icon={CalendarDays} label="Hôm nay" value={String(stats.todayCount ?? 0).padStart(2, "0")} tone="blue" />
            <DashboardStatCard icon={ClipboardList} label="Chưa xem" value={String(stats.pendingCount ?? 0).padStart(2, "0")} tone="amber" />
            <DashboardStatCard icon={CheckCircle2} label="Đã xem" value={String(stats.viewedCount ?? 0).padStart(2, "0")} tone="green" />
          </section>

          <section className="mt-7 overflow-hidden rounded-lg border border-[#cfd5de] bg-white shadow-[0_1px_1px_rgba(9,20,38,0.03)]">
            <div className="flex flex-wrap items-center gap-3 border-b border-[#d9dde5] px-4 py-3 text-xs text-[#4b5563]">
              <span className="font-semibold text-[#111827]">Lọc theo:</span>
              <select
                value={filters.roomId}
                onChange={(event) => updateFilter("roomId", event.target.value)}
                disabled={filters.propertyId === "all"}
                className="h-9 rounded border border-[#cfd5de] bg-white px-3 text-xs font-medium text-[#111827] disabled:cursor-not-allowed disabled:bg-[#f1f3f5] disabled:text-[#94a3b8]"
              >
                <option value="all">{filters.propertyId === "all" ? "Chọn cơ sở trước" : "Tất cả phòng"}</option>
                {filterRooms.map((room) => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
              <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} className="h-9 rounded border border-[#cfd5de] bg-white px-3 text-xs font-medium text-[#111827]">
                <option value="all">Tất cả trạng thái</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
              <span className="font-semibold text-[#111827]">Thời gian:</span>
              <input type="date" value={filters.fromDate} onChange={(event) => updateFilter("fromDate", event.target.value)} className="h-9 rounded border border-[#cfd5de] px-3 text-xs" />
              <span>đến</span>
              <input type="date" value={filters.toDate} onChange={(event) => updateFilter("toDate", event.target.value)} className="h-9 rounded border border-[#cfd5de] px-3 text-xs" />
              <button type="button" onClick={openTrash} className="ml-auto inline-flex h-9 items-center gap-2 rounded px-2 text-xs font-semibold text-[#334155] hover:bg-[#f1f3f5]">
                <Trash2 className="h-4 w-4" />
                Thùng rác
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-[#f1f3f5] text-[11px] font-bold uppercase tracking-[0.04em] text-[#4b5563]">
                  <tr>
                    <th className="px-5 py-4">Tên khách</th>
                    <th className="px-5 py-4">Số điện thoại</th>
                    <th className="px-5 py-4">Cơ sở</th>
                    <th className="px-5 py-4">Phòng quan tâm</th>
                    <th className="px-5 py-4">Ngày giờ xem</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-t border-[#d9dde5] text-sm">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <CustomerAvatar name={customer.fullName} />
                          <div className="min-w-0">
                            <span className="block max-w-[180px] truncate font-bold leading-5 text-[#111827]">{customer.fullName}</span>
                            {customer.note && (
                              <span className="note-preview mt-1 block max-w-[300px] text-xs font-medium leading-5 text-[#64748b]" title={customer.note}>
                                Ghi chú: {customer.note}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[#374151]">{customer.phone}</td>
                      <td className="px-5 py-4 text-[#374151]">{customer.propertyName}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase ${
                            customer.interestedRoomId
                              ? "bg-[#dbeafe] text-[#335a91]"
                              : "bg-[#f1f3f5] text-[#64748b]"
                          }`}
                        >
                          {customer.interestedRoomName || "Chưa chọn phòng"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="block font-bold text-[#111827]">{customer.appointmentLabel || "—"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusSelect status={customer.status} onChange={(status) => changeStatus(customer, status)} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => openEdit(customer)} aria-label="Sửa" className="rounded p-1.5 text-[#374151] hover:bg-[#f1f3f5]">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => deleteCustomer(customer)} aria-label="Xóa" className="rounded p-1.5 text-red-500 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr key="empty-customers-row">
                      <td colSpan={7} className="px-5 py-10 text-center text-sm font-semibold text-[#64748b]">
                        Không có khách xem phòng phù hợp với bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#d9dde5] px-4 py-4 text-xs text-[#4b5563] sm:flex-row sm:items-center sm:justify-between">
              <span>
                {pagination.total === 0
                  ? "Không có khách xem phòng nào"
                  : `Đang hiển thị ${pageFrom} đến ${pageTo} của ${pagination.total} khách`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadCustomers(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded border border-[#cfd5de] bg-white text-xs font-bold text-[#374151] hover:bg-[#f1f3f5] disabled:opacity-40"
                >
                  {"<"}
                </button>
                {pageNumbers.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => loadCustomers(item)}
                    className={`flex h-8 w-8 items-center justify-center rounded border text-xs font-bold ${
                      item === pagination.page ? "border-[#091426] bg-[#091426] text-white" : "border-[#cfd5de] bg-white text-[#374151] hover:bg-[#f1f3f5]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => loadCustomers(Math.min(pagination.totalPages, pagination.page + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded border border-[#cfd5de] bg-white text-xs font-bold text-[#374151] hover:bg-[#f1f3f5] disabled:opacity-40"
                >
                  {">"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {modalMode && (
        <ViewingModal
          mode={modalMode}
          form={form}
          errors={errors}
          properties={properties}
          rooms={formRooms}
          minDateTime={minDateTime}
          lockedPropertyId={filters.propertyId === "all" ? "" : String(filters.propertyId)}
          onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
          onSubmit={handleSubmit}
          onClose={() => setModalMode(null)}
        />
      )}

      {trashOpen && (
        <TrashModal
          rows={trashRows}
          pagination={trashPagination}
          onClose={() => setTrashOpen(false)}
          onRestore={restoreCustomer}
          onForceDelete={forceDeleteCustomer}
          onPageChange={loadTrash}
        />
      )}

    </div>
  );
}
