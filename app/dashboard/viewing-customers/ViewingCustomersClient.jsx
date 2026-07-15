"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Trash2,
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

const emptyForm = {
  fullName: "",
  phone: "",
  propertyId: "",
  interestedRoomId: "",
  appointmentDate: "",
  appointmentTime: "",
  note: "",
  status: "NOT_VIEWED",
};

function StatusSelect({ status, onChange }) {
  const styles = {
    NOT_VIEWED: "border-amber-200 dark:border-yellow-500/20 bg-amber-50 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300",
    VIEWED: "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    DISMISSED: "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#020817] text-slate-600 dark:text-slate-300",
  };

  return (
    <select
      value={status}
      onChange={(event) => onChange(event.target.value)}
      className={`h-8 rounded-full border px-3 text-xs font-bold outline-none ${styles[status] || styles.NOT_VIEWED}`}
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
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : name.slice(0, 2);
  const dark = name.includes("Phạm");

  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${dark ? "bg-black text-white" : "bg-[#d7e6ff] text-[#39557a]"}`}
    >
      {initials.toUpperCase()}
    </span>
  );
}

function ViewingModal({
  mode,
  form,
  errors,
  properties,
  rooms,
  minDateTime,
  lockedPropertyId,
  onChange,
  onSubmit,
  onClose,
}) {
  const minDate = minDateTime ? minDateTime.slice(0, 10) : undefined;
  const minTime =
    minDateTime && form.appointmentDate === minDate
      ? minDateTime.slice(11, 16)
      : undefined;
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const isPropertyLocked = Boolean(lockedPropertyId);
  const filteredRooms = form.propertyId
    ? safeRooms.filter(
        (room) =>
          String(room.propertyId ?? form.propertyId) ===
          String(form.propertyId),
      )
    : safeRooms;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white dark:bg-[#0f172a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] dark:border-white/10 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {mode === "edit" ? "Sửa khách xem" : "Thêm khách xem"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-2 text-slate-500 dark:text-slate-400 hover:bg-[#f1f3f5] dark:hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="grid max-h-[72vh] gap-4 overflow-y-auto p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Họ tên khách *" error={errors.fullName}>
              <input
                value={form.fullName}
                onChange={(event) => onChange("fullName", event.target.value)}
                className="field-input"
              />
            </Field>
            <Field label="Số điện thoại *" error={errors.phone}>
              <input
                value={form.phone}
                onChange={(event) => onChange("phone", event.target.value)}
                className="field-input"
              />
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
                className="field-input disabled:cursor-not-allowed disabled:bg-[#f1f3f5] disabled:text-slate-500 dark:text-slate-400"
              >
                <option value="">Chọn cơ sở</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phòng quan tâm">
              <select
                value={form.interestedRoomId}
                onChange={(event) =>
                  onChange("interestedRoomId", event.target.value)
                }
                disabled={!form.propertyId}
                className="field-input disabled:cursor-not-allowed disabled:bg-[#f1f3f5] disabled:text-slate-400 dark:text-slate-500"
              >
                <option value="">
                  {form.propertyId ? "Chọn phòng" : "Chọn cơ sở trước"}
                </option>
                {filteredRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ngày hẹn xem *">
              <input
                type="date"
                min={minDate}
                value={form.appointmentDate}
                onChange={(event) =>
                  onChange("appointmentDate", event.target.value)
                }
                className="field-input"
              />
            </Field>
            <Field label="Giờ hẹn xem *" error={errors.appointmentAt}>
              <input
                type="time"
                min={minTime || undefined}
                value={form.appointmentTime}
                onChange={(event) =>
                  onChange("appointmentTime", event.target.value)
                }
                className="field-input"
              />
            </Field>
          </div>

          <Field label="Ghi chú">
            <textarea
              value={form.note}
              onChange={(event) => onChange("note", event.target.value)}
              rows={4}
              className="field-input min-h-24 resize-none py-3"
            />
          </Field>

          <div className="flex justify-end gap-3 border-t border-[#e2e8f0] dark:border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-[#cfd5de] dark:border-white/10 px-4 text-sm font-bold text-slate-900 dark:text-white hover:bg-[#f7f9fb] dark:hover:bg-white/5"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="h-10 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-5 text-sm font-bold text-white hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8]"
            >
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
      <span className="text-sm font-bold text-slate-900 dark:text-white">{label}</span>
      {children}
      {error && (
        <span className="text-xs font-semibold text-rose-600 dark:text-rose-300">{error}</span>
      )}
    </label>
  );
}

function TrashModal({
  rows,
  pagination,
  pageSize,
  onClose,
  onRestore,
  onForceDelete,
  onPageChange,
  onSizeChange,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-lg bg-white dark:bg-[#0f172a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] dark:border-white/10 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Thùng rác</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-2 text-slate-500 dark:text-slate-400 hover:bg-[#f1f3f5] dark:hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="dashboard-table max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f1f3f5] dark:bg-white/5 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-600 dark:text-slate-300">
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
                <tr
                  key={customer.id}
                  className="border-t border-[#d9dde5] dark:border-white/10 text-sm"
                >
                  <td
                    data-label="Tên khách"
                    className="px-5 py-4 font-bold text-slate-900 dark:text-white"
                  >
                    {customer.fullName}
                  </td>
                  <td
                    data-label="Số điện thoại"
                    className="px-5 py-4 text-slate-700 dark:text-slate-200"
                  >
                    {customer.phone}
                  </td>
                  <td data-label="Cơ sở" className="px-5 py-4 text-slate-700 dark:text-slate-200">
                    {customer.propertyName}
                  </td>
                  <td
                    data-label="Phòng quan tâm"
                    className="px-5 py-4 text-slate-700 dark:text-slate-200"
                  >
                    {customer.interestedRoomName || "Chưa chọn phòng"}
                  </td>
                  <td
                    data-label="Ngày giờ xem"
                    className="px-5 py-4 font-bold text-slate-900 dark:text-white"
                  >
                    {customer.appointmentLabel || "—"}
                  </td>
                  <td
                    data-label="Trạng thái"
                    className="px-5 py-4 text-slate-700 dark:text-slate-200"
                  >
                    {VIEWING_STATUSES[customer.status] || customer.status}
                  </td>
                  <td
                    data-label="Ngày xóa"
                    className="px-5 py-4 text-slate-700 dark:text-slate-200"
                  >
                    {customer.deletedLabel || "—"}
                  </td>
                  <td data-label="Thao tác" className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onRestore(customer)}
                        className="rounded-md border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300"
                      >
                        Khôi phục
                      </button>
                      <button
                        type="button"
                        onClick={() => onForceDelete(customer)}
                        className="rounded-md border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300"
                      >
                        Xóa vĩnh viễn
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr key="empty-trash-row">
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400"
                  >
                    Thùng rác đang trống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DashboardPagination
          page={pagination.page}
          size={pageSize}
          totalElements={pagination.total}
          totalPages={pagination.totalPages}
          itemLabel="khách trong thùng rác"
          onPageChange={onPageChange}
          onSizeChange={onSizeChange}
        />
      </div>
    </div>
  );
}

function NoteModal({ customer, onClose }) {
  if (!customer) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white dark:bg-[#0f172a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] dark:border-white/10 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Ghi chú khách xem phòng
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {customer.fullName} ·{" "}
              {customer.interestedRoomName || "Chưa chọn phòng"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-2 text-slate-500 dark:text-slate-400 hover:bg-[#f1f3f5] dark:hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="rounded-lg border border-[#d9dde5] dark:border-white/10 bg-[#f8fafc] dark:bg-white/5 p-4 text-sm leading-6 text-slate-900 dark:text-white">
            <p className="whitespace-pre-wrap break-words">
              {customer.note || "Không có ghi chú."}
            </p>
          </div>
        </div>
        <div className="flex justify-end border-t border-[#e2e8f0] dark:border-white/10 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-5 text-sm font-bold text-white hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ViewingCustomersClient() {
  const [pageSize, setPageSize] = useState(10);
  const [trashPageSize, setTrashPageSize] = useState(10);
  const [customers, setCustomers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [filterRooms, setFilterRooms] = useState([]);
  const [formRooms, setFormRooms] = useState([]);
  const [filters, setFilters] = useState({
    keyword: "",
    propertyId: "all",
    roomId: "all",
    status: "all",
    fromDate: "",
    toDate: "",
  });
  const [stats, setStats] = useState({
    todayCount: 0,
    pendingCount: 0,
    viewedCount: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    size: pageSize,
    total: 0,
    totalPages: 0,
  });
  const [trashRows, setTrashRows] = useState([]);
  const [trashPagination, setTrashPagination] = useState({
    page: 1,
    size: pageSize,
    total: 0,
    totalPages: 0,
  });
  const [trashOpen, setTrashOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [noteCustomer, setNoteCustomer] = useState(null);
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

  const loadCustomers = useCallback(
    async (nextPage = 1) => {
      try {
        const selectedRoom = filterRooms.find(
          (r) => String(r.id) === String(filters.roomId),
        );
        const roomCode = selectedRoom ? selectedRoom.roomCode : undefined;

        const apiFilters = { ...filters, roomCode };

        const [listData, statsData] = await Promise.all([
          fetchViewingCustomers({
            filters: apiFilters,
            page: nextPage,
            size: pageSize,
          }),
          fetchViewingCustomerStats(), // API now ignores filters for internal total counting
        ]);
        setCustomers(sortByNewest(listData.items, ["createdAt", "created_at"]));
        setPagination(listData);
        setStats(statsData);
        setErrorMessage("");
      } catch (error) {
        setErrorMessage(getViewingCustomerErrorMessage(error));
      }
    },
    [filters, pageSize, filterRooms],
  );

  const loadTrash = useCallback(
    async (nextPage = 1) => {
      try {
        const data = await fetchViewingCustomerTrash({
          filters,
          page: nextPage,
          size: trashPageSize,
        });
        setTrashRows(sortByNewest(data.items, ["deletedAt", "deleted_at", "createdAt", "created_at"]));
        setTrashPagination(data);
        setErrorMessage("");
      } catch (error) {
        setErrorMessage(getViewingCustomerErrorMessage(error));
      }
    },
    [filters, trashPageSize],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCustomers(1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadCustomers]);

  useEffect(() => {
    if (!trashOpen) return undefined;
    const timer = window.setTimeout(() => loadTrash(1), 0);
    return () => window.clearTimeout(timer);
  }, [loadTrash, trashOpen]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "propertyId" ? { roomId: "all" } : {}),
    }));
  };

  const openCreate = () => {
    setForm({
      ...emptyForm,
      propertyId:
        filters.propertyId === "all" ? "" : String(filters.propertyId),
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
      interestedRoomId: customer.interestedRoomId
        ? String(customer.interestedRoomId)
        : "",
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
    if (!form.fullName.trim())
      nextErrors.fullName = "Vui lòng nhập họ tên khách.";
    if (!form.phone.trim()) nextErrors.phone = "Vui lòng nhập số điện thoại.";
    else if (!isValidVietnamPhone(form.phone))
      nextErrors.phone = "Số điện thoại Việt Nam chưa hợp lệ.";
    if (!form.propertyId) nextErrors.propertyId = "Vui lòng chọn cơ sở.";
    if (!form.appointmentDate || !form.appointmentTime)
      nextErrors.appointmentAt = "Vui lòng chọn ngày giờ hẹn xem.";
    else if (!isFutureAppointment(form.appointmentDate, form.appointmentTime)) {
      nextErrors.appointmentAt = "Ngày giờ hẹn xem phải sau thời gian hiện tại";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    const appointmentAt = combineAppointmentParts(
      form.appointmentDate,
      form.appointmentTime,
    );
    const roomId = form.interestedRoomId ? Number(form.interestedRoomId) : null;

    const payload = {
      customerName: form.fullName.trim(),
      phone: form.phone.trim().replace(/\s+/g, ""),
      propertyId: Number(form.propertyId),
      roomId,
      appointmentAt,
      status: form.status || "NOT_VIEWED",
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
    if (
      window.confirm(
        "Khách xem phòng này sẽ được chuyển vào thùng rác và tự động xóa sau 7 ngày. Bạn có chắc muốn xóa không?",
      )
    ) {
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
      current.map((item) =>
        item.id === customer.id ? { ...item, status: nextStatus } : item,
      ),
    );
    try {
      await updateViewingCustomerStatus(customer.id, nextStatus);
      await loadCustomers(pagination.page);
    } catch (error) {
      setCustomers((current) =>
        current.map((item) =>
          item.id === customer.id ? { ...item, status: previousStatus } : item,
        ),
      );
      setErrorMessage(getViewingCustomerErrorMessage(error));
    }
  };

  const openTrash = () => {
    setTrashOpen(true);
  };

  const restoreCustomer = async (customer) => {
    try {
      await restoreViewingCustomer(customer.id);
      await Promise.all([
        loadCustomers(pagination.page),
        loadTrash(trashPagination.page),
      ]);
    } catch (error) {
      setErrorMessage(getViewingCustomerErrorMessage(error));
    }
  };

  const forceDeleteCustomer = async (customer) => {
    if (
      !window.confirm(`Xóa vĩnh viễn lịch xem phòng của ${customer.fullName}?`)
    )
      return;
    try {
      await forceDeleteViewingCustomer(customer.id);
      await loadTrash(trashPagination.page);
    } catch (error) {
      setErrorMessage(getViewingCustomerErrorMessage(error));
    }
  };

  return (
    <>
      <div className="w-full min-w-0 flex flex-col gap-6">
        <div className="w-full min-w-0">
          {errorMessage && (
            <div className="mb-4 rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}
          <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-900 dark:text-white">
                Danh sách khách xem phòng
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Quản lý và theo dõi lịch hẹn xem phòng của khách tiềm năng.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={filters.propertyId}
                onChange={(event) =>
                  updateFilter("propertyId", event.target.value)
                }
                className="h-11 w-full min-w-0 rounded-md border border-[#cfd5de] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm font-bold text-slate-900 dark:text-white shadow-sm outline-none focus:border-[#1e40af] sm:w-auto"
              >
                <option value="all">Tất cả cơ sở</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#1e40af] dark:bg-[#2563eb] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8]"
              >
                <Plus className="h-4 w-4" />
                Thêm khách xem
              </button>
            </div>
          </section>

          <section className="mt-7 grid gap-5 md:grid-cols-3">
            <DashboardStatCard
              icon={CalendarDays}
              label="Hôm nay"
              value={String(stats.todayCount ?? 0).padStart(2, "0")}
              tone="blue"
            />
            <DashboardStatCard
              icon={ClipboardList}
              label="Chưa xem"
              value={String(stats.pendingCount ?? 0).padStart(2, "0")}
              tone="amber"
            />
            <DashboardStatCard
              icon={CheckCircle2}
              label="Đã xem"
              value={String(stats.viewedCount ?? 0).padStart(2, "0")}
              tone="green"
            />
          </section>

          <section className="mt-7 overflow-hidden rounded-lg border border-[#cfd5de] dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-[0_1px_1px_rgba(9,20,38,0.03)]">
            <div className="flex flex-wrap items-center gap-3 border-b border-[#d9dde5] dark:border-white/10 px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex w-full sm:w-auto items-center">
                <input
                  type="text"
                  placeholder="Tìm tên, SĐT, Email..."
                  value={filters.keyword}
                  onChange={(event) =>
                    updateFilter("keyword", event.target.value)
                  }
                  className="h-9 w-full rounded border border-[#cfd5de] dark:border-white/10 px-3 text-xs focus:border-[#1e40af] focus:outline-none"
                />
              </div>
              {/*<span className="font-semibold text-slate-900 dark:text-white">Lọc theo:</span>*/}
              {/*<select*/}
              {/*    value={filters.roomId}*/}
              {/*    onChange={(event) => updateFilter("roomId", event.target.value)}*/}
              {/*    disabled={filters.propertyId === "all"}*/}
              {/*    className="h-9 rounded border border-[#cfd5de] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-xs font-medium text-slate-900 dark:text-white disabled:cursor-not-allowed disabled:bg-[#f1f3f5] disabled:text-slate-400 dark:text-slate-500"*/}
              {/*>*/}
              {/*    <option*/}
              {/*        value="all">{filters.propertyId === "all" ? "Chọn cơ sở trước" : "Tất cả phòng"}</option>*/}
              {/*    {filterRooms.map((room) => (*/}
              {/*        <option key={room.id} value={room.id}>{room.name}</option>*/}
              {/*    ))}*/}
              {/*</select>*/}
              <select
                value={filters.status}
                onChange={(event) => updateFilter("status", event.target.value)}
                className="h-9 rounded border border-[#cfd5de] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-xs font-medium text-slate-900 dark:text-white"
              >
                <option value="all">Tất cả trạng thái</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <span className="font-semibold text-slate-900 dark:text-white">Thời gian:</span>
              <input
                type="date"
                value={filters.fromDate}
                onChange={(event) =>
                  updateFilter("fromDate", event.target.value)
                }
                className="h-9 w-full rounded border border-[#cfd5de] px-3 text-xs dark:border-white/10 sm:w-40"
              />
              <span>đến</span>
              <input
                type="date"
                value={filters.toDate}
                onChange={(event) => updateFilter("toDate", event.target.value)}
                className="h-9 w-full rounded border border-[#cfd5de] px-3 text-xs dark:border-white/10 sm:w-40"
              />
              <button
                type="button"
                onClick={openTrash}
                className="ml-auto inline-flex h-9 items-center gap-2 rounded px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#f1f3f5] dark:hover:bg-white/5"
              >
                <Trash2 className="h-4 w-4" />
                Thùng rác
              </button>
            </div>

            <div className="dashboard-table">
              <table className="w-full text-left">
                <thead className="bg-[#f1f3f5] dark:bg-white/5 text-[11px] font-bold uppercase tracking-[0.04em] text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-5 py-4">Tên khách</th>
                    <th className="px-5 py-4">Số điện thoại</th>
                    <th className="px-5 py-4">Cơ sở</th>
                    <th className="px-5 py-4">Phòng quan tâm</th>
                    <th className="px-5 py-4">Ghi chú</th>
                    <th className="px-5 py-4">Ngày giờ xem</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer, idx) => (
                    <tr
                      key={
                        customer.id != null ? customer.id : `fallback-${idx}`
                      }
                      className="border-t border-[#d9dde5] dark:border-white/10 text-sm"
                    >
                      <td data-label="Tên khách" className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <CustomerAvatar name={customer.fullName} />
                          <div className="min-w-0">
                            <span className="block max-w-[180px] truncate font-bold leading-5 text-slate-900 dark:text-white">
                              {customer.fullName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td
                        data-label="Số điện thoại"
                        className="px-5 py-4 text-slate-700 dark:text-slate-200"
                      >
                        {customer.phone}
                      </td>
                      <td
                        data-label="Cơ sở"
                        className="px-5 py-4 text-slate-700 dark:text-slate-200"
                      >
                        {customer.propertyName}
                      </td>
                      <td data-label="Phòng quan tâm" className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase ${
                            customer.interestedRoomId
                              ? "bg-[#dbeafe] text-[#335a91]"
                              : "bg-[#f1f3f5] dark:bg-white/5 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {customer.interestedRoomName || "Chưa chọn phòng"}
                        </span>
                      </td>
                      <td data-label="Ghi chú" className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            customer.note && setNoteCustomer(customer)
                          }
                          disabled={!customer.note}
                          className={`note-preview block max-w-[260px] text-left text-sm font-medium leading-5 ${
                            customer.note
                              ? "cursor-pointer text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline"
                              : "cursor-default text-slate-400 dark:text-slate-500"
                          }`}
                          title={
                            customer.note ? "Xem đầy đủ ghi chú" : undefined
                          }
                        >
                          {customer.note || "—"}
                        </button>
                      </td>
                      <td data-label="Ngày giờ xem" className="px-5 py-4">
                        <span className="block font-bold text-slate-900 dark:text-white">
                          {customer.appointmentLabel || "—"}
                        </span>
                      </td>
                      <td data-label="Trạng thái" className="px-5 py-4">
                        <StatusSelect
                          status={customer.status}
                          onChange={(status) => changeStatus(customer, status)}
                        />
                      </td>
                      <td data-label="Thao tác" className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(customer)}
                            aria-label="Sửa"
                            className="rounded p-1.5 text-slate-700 dark:text-slate-200 hover:bg-[#f1f3f5] dark:hover:bg-white/5"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCustomer(customer)}
                            aria-label="Xóa"
                            className="rounded p-1.5 text-red-500 dark:text-rose-300 hover:bg-red-50 dark:hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr key="empty-customers-row">
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400"
                      >
                        Không có khách xem phòng phù hợp với bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <DashboardPagination
              page={pagination.page}
              size={pageSize}
              totalElements={pagination.total}
              totalPages={pagination.totalPages}
              itemLabel="khách xem phòng"
              onPageChange={loadCustomers}
              onSizeChange={setPageSize}
            />
          </section>
        </div>
      </div>

      {modalMode && (
        <ViewingModal
          mode={modalMode}
          form={form}
          errors={errors}
          properties={properties}
          rooms={formRooms}
          minDateTime={minDateTime}
          lockedPropertyId={
            filters.propertyId === "all" ? "" : String(filters.propertyId)
          }
          onChange={(key, value) =>
            setForm((current) => ({ ...current, [key]: value }))
          }
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
          onSizeChange={setTrashPageSize}
          pageSize={trashPageSize}
        />
      )}

      {noteCustomer && (
        <NoteModal
          customer={noteCustomer}
          onClose={() => setNoteCustomer(null)}
        />
      )}
    </>
  );
}
