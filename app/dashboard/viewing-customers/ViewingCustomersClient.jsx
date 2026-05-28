"use client";

import {useCallback, useEffect, useState} from "react";
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
    isFutureAppointment,
    isValidVietnamPhone,
    restoreViewingCustomer,
    updateViewingCustomer,
    updateViewingCustomerStatus,
} from "@/services/viewingCustomersService";

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


function MetricCard({icon: Icon, label, value, tone}) {
    const tones = {
        blue: "bg-blue-100 text-blue-700",
        amber: "bg-amber-100 text-amber-700",
        green: "bg-emerald-100 text-emerald-700",
        indigo: "bg-indigo-100 text-indigo-700",
    };

    return (
        <article
            className="flex min-h-[96px] items-center gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5"/>
      </span>
            <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-[0.06em] text-[#45474c]">{label}</p>
                <p className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#091426]">{value}</p>
            </div>
        </article>
    );
}

function StatusSelect({status, onChange}) {
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

function CustomerAvatar({name}) {
    const parts = name.trim().split(/\s+/);
    const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : name.slice(0, 2);
    const dark = name.includes("Phạm");

    return (
        <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${dark ? "bg-black text-white" : "bg-[#d7e6ff] text-[#39557a]"}`}>
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
                          onClose
                      }) {
    const minDate = minDateTime ? minDateTime.slice(0, 10) : undefined;
    const minTime = minDateTime && form.appointmentDate === minDate ? minDateTime.slice(11, 16) : undefined;
    const safeRooms = Array.isArray(rooms) ? rooms : [];
    const isPropertyLocked = Boolean(lockedPropertyId);
    const filteredRooms = form.propertyId
        ? safeRooms.filter((room) => String(room.propertyId ?? form.propertyId) === String(form.propertyId))
        : safeRooms;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm"
             role="dialog" aria-modal="true">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
                    <h2 className="text-lg font-bold text-[#091426]">{mode === "edit" ? "Sửa khách xem" : "Thêm khách xem"}</h2>
                    <button type="button" onClick={onClose} aria-label="Đóng"
                            className="rounded-md p-2 text-[#64748b] hover:bg-[#f1f3f5]">
                        <X className="h-5 w-5"/>
                    </button>
                </div>

                <form onSubmit={onSubmit} className="grid max-h-[72vh] gap-4 overflow-y-auto p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Họ tên khách *" error={errors.fullName}>
                            <input value={form.fullName} onChange={(event) => onChange("fullName", event.target.value)}
                                   className="field-input"/>
                        </Field>
                        <Field label="Số điện thoại *" error={errors.phone}>
                            <input value={form.phone} onChange={(event) => onChange("phone", event.target.value)}
                                   className="field-input"/>
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
                        <textarea value={form.note} onChange={(event) => onChange("note", event.target.value)} rows={4}
                                  className="field-input min-h-24 resize-none py-3"/>
                    </Field>

                    <div className="flex justify-end gap-3 border-t border-[#e2e8f0] pt-4">
                        <button type="button" onClick={onClose}
                                className="h-10 rounded-lg border border-[#cfd5de] px-4 text-sm font-bold text-[#091426] hover:bg-[#f7f9fb]">
                            Hủy
                        </button>
                        <button type="submit"
                                className="h-10 rounded-lg bg-[#091426] px-5 text-sm font-bold text-white hover:bg-[#13243d]">
                            Lưu
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({label, error, children}) {
    return (
        <label className="grid gap-1.5">
            <span className="text-sm font-bold text-[#091426]">{label}</span>
            {children}
            {error && <span className="text-xs font-semibold text-rose-600">{error}</span>}
        </label>
    );
}

function TrashModal({rows, pagination, onClose, onRestore, onForceDelete, onPageChange}) {
    const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.size + 1;
    const to = pagination.total === 0 ? 0 : Math.min(from + rows.length - 1, pagination.total);
    const pages = Array.from({length: pagination.totalPages}, (_, index) => index + 1).slice(0, 5);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm"
             role="dialog" aria-modal="true">
            <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
                    <h2 className="text-lg font-bold text-[#091426]">Thùng rác</h2>
                    <button type="button" onClick={onClose} aria-label="Đóng"
                            className="rounded-md p-2 text-[#64748b] hover:bg-[#f1f3f5]">
                        <X className="h-5 w-5"/>
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-auto">
                    <table className="w-full min-w-[1080px] text-left">
                        <thead
                            className="bg-[#f1f3f5] text-[11px] font-bold uppercase tracking-[0.04em] text-[#4b5563]">
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
                                <td className="px-5 py-4 text-[#374151]">{VIEWING_STATUSES[customer.status] || customer.status}</td>
                                <td className="px-5 py-4 text-[#374151]">{customer.deletedLabel || "—"}</td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => onRestore(customer)}
                                                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                            Khôi phục
                                        </button>
                                        <button type="button" onClick={() => onForceDelete(customer)}
                                                className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
                                            Xóa vĩnh viễn
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr key="empty-trash-row">
                                <td colSpan={8} className="px-5 py-10 text-center text-sm font-semibold text-[#64748b]">
                                    Thùng rác đang trống.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>

                <div
                    className="flex flex-col gap-3 border-t border-[#d9dde5] px-4 py-4 text-xs text-[#4b5563] sm:flex-row sm:items-center sm:justify-between">
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
    const [filters, setFilters] = useState({
        keyword: "",
        propertyId: "all",
        roomId: "all",
        status: "all",
        fromDate: "",
        toDate: ""
    });
    const [stats, setStats] = useState({todayCount: 0, pendingCount: 0, viewedCount: 0});
    const [pagination, setPagination] = useState({page: 1, size: pageSize, total: 0, totalPages: 0});
    const [trashRows, setTrashRows] = useState([]);
    const [trashPagination, setTrashPagination] = useState({page: 1, size: pageSize, total: 0, totalPages: 0});
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
            .catch((error) => setErrorMessage(error.message));
    }, []);

    useEffect(() => {
        if (!form.propertyId) {
            const timer = window.setTimeout(() => setFormRooms([]), 0);
            return () => window.clearTimeout(timer);
        }
        fetchViewingRooms(form.propertyId)
            .then(setFormRooms)
            .catch((error) => setErrorMessage(error.message));
    }, [form.propertyId]);

    useEffect(() => {
        if (filters.propertyId === "all") {
            const timer = window.setTimeout(() => setFilterRooms([]), 0);
            return () => window.clearTimeout(timer);
        }
        fetchViewingRooms(filters.propertyId)
            .then(setFilterRooms)
            .catch((error) => setErrorMessage(error.message));
    }, [filters.propertyId]);

    const loadCustomers = useCallback(async (nextPage = 1) => {
        try {
            const selectedProperty = properties.find((p) => String(p.id) === String(filters.propertyId));
            const propertyCode = selectedProperty ? selectedProperty.propertyCode : undefined;

            const selectedRoom = filterRooms.find((r) => String(r.id) === String(filters.roomId));
            const roomCode = selectedRoom ? selectedRoom.roomCode : undefined;

            const apiFilters = {...filters, propertyCode, roomCode};

            const [listData, statsData] = await Promise.all([
                fetchViewingCustomers({filters: apiFilters, page: nextPage, size: pageSize}),
                fetchViewingCustomerStats(), // API now ignores filters for internal total counting
            ]);
            setCustomers(listData.items);
            setPagination(listData);
            setStats(statsData);
            setErrorMessage("");
        } catch (error) {
            setErrorMessage(error.message);
        }
    }, [filters, pageSize, properties, filterRooms]);

    const loadTrash = useCallback(async (nextPage = 1) => {
        try {
            const data = await fetchViewingCustomerTrash({filters, page: nextPage, size: pageSize});
            setTrashRows(data.items);
            setTrashPagination(data);
            setErrorMessage("");
        } catch (error) {
            setErrorMessage(error.message);
        }
    }, [filters, pageSize]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            loadCustomers(1);
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadCustomers]);

    const updateFilter = (key, value) => {
        setFilters((current) => ({...current, [key]: value, ...(key === "propertyId" ? {roomId: "all"} : {})}));
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
            setErrorMessage(error.message);
        }
    };

    const deleteCustomer = async (customer) => {
        if (window.confirm("Khách xem phòng này sẽ được chuyển vào thùng rác và tự động xóa sau 7 ngày. Bạn có chắc muốn xóa không?")) {
            try {
                await deleteViewingCustomer(customer.id);
                await loadCustomers(pagination.page);
                if (trashOpen) await loadTrash(trashPagination.page);
            } catch (error) {
                setErrorMessage(error.message);
            }
        }
    };

    const changeStatus = async (customer, nextStatus) => {
        const previousStatus = customer.status;
        setCustomers((current) =>
            current.map((item) => (item.id === customer.id ? {...item, status: nextStatus} : item)),
        );
        try {
            await updateViewingCustomerStatus(customer.id, nextStatus);
            await loadCustomers(pagination.page);
        } catch (error) {
            setCustomers((current) =>
                current.map((item) => (item.id === customer.id ? {...item, status: previousStatus} : item)),
            );
            setErrorMessage(error.message);
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
            setErrorMessage(error.message);
        }
    };

    const forceDeleteCustomer = async (customer) => {
        if (!window.confirm(`Xóa vĩnh viễn lịch xem phòng của ${customer.fullName}?`)) return;
        try {
            await forceDeleteViewingCustomer(customer.id);
            await loadTrash(trashPagination.page);
        } catch (error) {
            setErrorMessage(error.message);
        }
    };

    const pageFrom = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.size + 1;
    const pageTo = pagination.total === 0 ? 0 : Math.min(pageFrom + customers.length - 1, pagination.total);
    const pageNumbers = Array.from({length: pagination.totalPages}, (_, index) => index + 1).slice(0, 5);

    return (
        <>
            <div>
                <div className="mx-auto max-w-[1440px]">
                    {errorMessage && (
                        <div
                            className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                            {errorMessage}
                        </div>
                    )}
                    <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#505f76]">Quản lý vận
                                hành</p>
                            <h1 className="mt-2 text-2xl font-bold tracking-[-0.01em] text-[#191c1e]">Danh sách khách
                                xem phòng</h1>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#45474c]">Quản lý và theo dõi lịch hẹn
                                xem phòng của khách tiềm năng.</p>
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
                            <button type="button" onClick={openCreate}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#091426] px-5 text-sm font-bold text-white shadow-sm hover:bg-[#13243d]">
                                <Plus className="h-4 w-4"/>
                                Thêm khách xem
                            </button>
                        </div>
                    </section>

                    <section className="mt-7 grid gap-5 md:grid-cols-3">
                        <MetricCard icon={CalendarDays} label="Hôm nay"
                                    value={String(stats.todayCount ?? 0).padStart(2, "0")} tone="blue"/>
                        <MetricCard icon={ClipboardList} label="Chưa xem"
                                    value={String(stats.pendingCount ?? 0).padStart(2, "0")} tone="amber"/>
                        <MetricCard icon={CheckCircle2} label="Đã xem"
                                    value={String(stats.viewedCount ?? 0).padStart(2, "0")} tone="green"/>
                    </section>

                    <section
                        className="mt-7 overflow-hidden rounded-lg border border-[#cfd5de] bg-white shadow-[0_1px_1px_rgba(9,20,38,0.03)]">
                        <div
                            className="flex flex-wrap items-center gap-3 border-b border-[#d9dde5] px-4 py-3 text-xs text-[#4b5563]">
                            <div className="flex w-full sm:w-auto items-center">
                                <input
                                    type="text"
                                    placeholder="Tìm tên, SĐT, Email..."
                                    value={filters.keyword}
                                    onChange={(event) => updateFilter("keyword", event.target.value)}
                                    className="h-9 w-full sm:w-64 rounded border border-[#cfd5de] px-3 text-xs focus:border-[#091426] focus:outline-none"
                                />
                            </div>
                            {/*<span className="font-semibold text-[#111827]">Lọc theo:</span>*/}
                            {/*<select*/}
                            {/*    value={filters.roomId}*/}
                            {/*    onChange={(event) => updateFilter("roomId", event.target.value)}*/}
                            {/*    disabled={filters.propertyId === "all"}*/}
                            {/*    className="h-9 rounded border border-[#cfd5de] bg-white px-3 text-xs font-medium text-[#111827] disabled:cursor-not-allowed disabled:bg-[#f1f3f5] disabled:text-[#94a3b8]"*/}
                            {/*>*/}
                            {/*    <option*/}
                            {/*        value="all">{filters.propertyId === "all" ? "Chọn cơ sở trước" : "Tất cả phòng"}</option>*/}
                            {/*    {filterRooms.map((room) => (*/}
                            {/*        <option key={room.id} value={room.id}>{room.name}</option>*/}
                            {/*    ))}*/}
                            {/*</select>*/}
                            {/* STATUS FILTER - Disabled as backend does not support status yet
              <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} className="h-9 rounded border border-[#cfd5de] bg-white px-3 text-xs font-medium text-[#111827]">
                <option value="all">Tất cả trạng thái</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
              */}
                            <span className="font-semibold text-[#111827]">Thời gian:</span>
                            <input type="date" value={filters.fromDate}
                                   onChange={(event) => updateFilter("fromDate", event.target.value)}
                                   className="h-9 rounded border border-[#cfd5de] px-3 text-xs"/>
                            <span>đến</span>
                            <input type="date" value={filters.toDate}
                                   onChange={(event) => updateFilter("toDate", event.target.value)}
                                   className="h-9 rounded border border-[#cfd5de] px-3 text-xs"/>
                            <button type="button" onClick={openTrash}
                                    className="ml-auto inline-flex h-9 items-center gap-2 rounded px-2 text-xs font-semibold text-[#334155] hover:bg-[#f1f3f5]">
                                <Trash2 className="h-4 w-4"/>
                                Thùng rác
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[980px] text-left">
                                <thead
                                    className="bg-[#f1f3f5] text-[11px] font-bold uppercase tracking-[0.04em] text-[#4b5563]">
                                <tr>
                                    <th className="px-5 py-4">Tên khách</th>
                                    <th className="px-5 py-4">Số điện thoại</th>
                                    <th className="px-5 py-4">Cơ sở</th>
                                    <th className="px-5 py-4">Phòng quan tâm</th>
                                    <th className="px-5 py-4">Ngày giờ xem</th>
                                    {/* <th className="px-5 py-4">Trạng thái</th> */}
                                    <th className="px-5 py-4">Thao tác</th>
                                </tr>
                                </thead>
                                <tbody>
                                {customers.map((customer, idx) => (
                                    <tr key={customer.id != null ? customer.id : `fallback-${idx}`}
                                        className="border-t border-[#d9dde5] text-sm">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <CustomerAvatar name={customer.fullName}/>
                                                <div className="min-w-0">
                                                    <span
                                                        className="block max-w-[180px] truncate font-bold leading-5 text-[#111827]">{customer.fullName}</span>
                                                    {customer.note && (
                                                        <span
                                                            className="note-preview mt-1 block max-w-[300px] text-xs font-medium leading-5 text-[#64748b]"
                                                            title={customer.note}>
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
                                            <span
                                                className="block font-bold text-[#111827]">{customer.appointmentLabel || "—"}</span>
                                        </td>
                                        {/* <td className="px-5 py-4">
                        <StatusSelect status={customer.status} onChange={(status) => changeStatus(customer, status)} />
                      </td> */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => openEdit(customer)}
                                                        aria-label="Sửa"
                                                        className="rounded p-1.5 text-[#374151] hover:bg-[#f1f3f5]">
                                                    <Pencil className="h-4 w-4"/>
                                                </button>
                                                <button type="button" onClick={() => deleteCustomer(customer)}
                                                        aria-label="Xóa"
                                                        className="rounded p-1.5 text-red-500 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {customers.length === 0 && (
                                    <tr key="empty-customers-row">
                                        <td colSpan={7}
                                            className="px-5 py-10 text-center text-sm font-semibold text-[#64748b]">
                                            Không có khách xem phòng phù hợp với bộ lọc.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>

                        <div
                            className="flex flex-col gap-3 border-t border-[#d9dde5] px-4 py-4 text-xs text-[#4b5563] sm:flex-row sm:items-center sm:justify-between">
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
                                {pageNumbers.map((page) => (
                                    <button
                                        key={page}
                                        type="button"
                                        onClick={() => loadCustomers(page)}
                                        className={`flex h-8 w-8 items-center justify-center rounded border text-xs font-bold ${
                                            page === pagination.page ? "border-[#091426] bg-[#091426] text-white" : "border-[#cfd5de] bg-white text-[#374151] hover:bg-[#f1f3f5]"
                                        }`}
                                    >
                                        {page}
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
            </div>

            {modalMode && (
                <ViewingModal
                    mode={modalMode}
                    form={form}
                    errors={errors}
                    properties={properties}
                    rooms={formRooms}
                    minDateTime={minDateTime}
                    lockedPropertyId={filters.propertyId === "all" ? "" : String(filters.propertyId)}
                    onChange={(key, value) => setForm((current) => ({...current, [key]: value}))}
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

        </>
    );
}
