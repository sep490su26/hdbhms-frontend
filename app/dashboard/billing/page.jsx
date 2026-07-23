"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  History,
  Loader2,
  ReceiptText,
  RefreshCw,
  Save,
  SlidersHorizontal,
  WalletCards,
  X,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import {
  applyRentOverride,
  confirmManualPayment,
  fetchBillingInvoices,
  sendOverdueInvoiceWarning,
} from "@/services/billingService";
import { fetchManagementRoomCatalog } from "@/services/managementRoomsService";
import { sortByNewest } from "@/lib/sortByNewest.mjs";

const money = new Intl.NumberFormat("vi-VN");
const FORM_CONTROL_CLASS =
  "h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10 dark:border-white/10 dark:bg-[#0f172a] dark:text-white";

const STATUS_LABELS = {
  DRAFT: "Nháp",
  ISSUED: "Chờ thanh toán",
  PARTIALLY_PAID: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  OVERDUE: "Quá hạn",
  VOIDED: "Đã hủy",
};

const TYPE_LABELS = {
  RENT: "Tiền phòng",
  UTILITY: "Điện nước",
  OTHER: "Phát sinh",
  DEPOSIT: "Đặt cọc",
  TRANSFER_DIFFERENCE: "Chênh lệch chuyển phòng",
};

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeQueryId(value) {
  const text = String(value || "").trim();
  return /^\d+$/.test(text) ? text : "";
}

function normalizeBillingPeriodParam(value) {
  const text = String(value || "").trim();
  const billingPeriodMatch = /^(\d{4})-(\d{1,2})$/.exec(text);
  if (billingPeriodMatch) {
    return `${billingPeriodMatch[1]}-${billingPeriodMatch[2].padStart(2, "0")}`;
  }

  const meterPeriodMatch = /^(\d{1,2})-(\d{4})$/.exec(text);
  if (meterPeriodMatch) {
    return `${meterPeriodMatch[2]}-${meterPeriodMatch[1].padStart(2, "0")}`;
  }

  return "";
}

function billingPeriodToVietnameseDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{1,2})/);
  if (!match) return "";
  return `01/${match[2].padStart(2, "0")}/${match[1]}`;
}

function formatBillingPeriod(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(value || ""));
  return match ? `${match[2]}/${match[1]}` : value || "-";
}

function displayRoomCode(value) {
  const code = String(value || "").trim();
  if (!code) return "Chưa gán";
  if (/^p\d+$/i.test(code)) return `P${code.slice(1)}`;
  return /^\d+$/.test(code) ? `P${code}` : code;
}

function formatVietnameseDateInput(value) {
  const text = String(value || "").replace(/[^\d/]/g, "").slice(0, 10);
  if (text.includes("/")) return text;
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function vietnameseDateToBillingPeriod(value) {
  const match = String(value || "")
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatMoney(value) {
  return `${money.format(Number(value || 0))} VNĐ`;
}

function statusLabel(value) {
  return STATUS_LABELS[value] || value || "Chưa rõ";
}

function typeLabel(value) {
  return TYPE_LABELS[value] || value || "Khác";
}

function invoiceStatusClasses(status) {
  if (status === "PAID") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20";
  }
  if (status === "OVERDUE") {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20";
  }
  if (status === "PARTIALLY_PAID") {
    return "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20";
  }
  if (status === "VOIDED") {
    return "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10";
  }
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20";
}

function isPendingInvoice(invoice) {
  return invoice?.status === "ISSUED";
}

function isExpiredInvoice(invoice) {
  if (!invoice || Number(invoice.remainingAmount || 0) <= 0) return false;
  if (invoice.status === "OVERDUE") return true;
  if (!invoice.dueDate) return false;
  const dueDate = new Date(invoice.dueDate);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
}

function roomKey(room) {
  return String(room?.id ?? room?.roomId ?? "");
}

function roomLabel(room) {
  return `${room.propertyName ? `${room.propertyName} - ` : ""}${displayRoomCode(room.roomCode || room.name)}`;
}

function roomsForProperty(rooms, propertyId) {
  if (!propertyId) return rooms;
  return rooms.filter((room) => String(room.propertyId) === String(propertyId));
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const queryBillingPeriod =
    normalizeBillingPeriodParam(searchParams.get("billingPeriod")) ||
    normalizeBillingPeriodParam(searchParams.get("period"));
  const queryPropertyId = normalizeQueryId(
    searchParams.get("propertyId") || searchParams.get("facilityId"),
  );
  const initialBillingPeriod = queryBillingPeriod || currentMonth();
  const [filters, setFilters] = useState({
    billingPeriod: initialBillingPeriod,
    status: "ALL",
    invoiceType: "ALL",
    propertyId: queryPropertyId,
    roomId: "",
  });
  const [billingPeriodText, setBillingPeriodText] = useState(() =>
    billingPeriodToVietnameseDate(initialBillingPeriod),
  );
  const [overrideBillingPeriodText, setOverrideBillingPeriodText] = useState(
    () => billingPeriodToVietnameseDate(currentMonth()),
  );
  const [rooms, setRooms] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [overrideForm, setOverrideForm] = useState({
    propertyId: "",
    roomId: "",
    billingPeriod: currentMonth(),
    overrideMonthlyRent: "",
    reason: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    propertyId: "",
    roomId: "",
    invoiceId: "",
    amount: "",
    note: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const selectedInvoice = useMemo(
    () =>
      invoices.find(
        (invoice) => String(invoice.id) === String(selectedInvoiceId),
      ) || null,
    [invoices, selectedInvoiceId],
  );
  const visibleInvoices = useMemo(
    () => sortByNewest(invoices, ["createdAt", "created_at", "issueDate", "issue_date", "billingPeriod"]),
    [invoices],
  );
  const selectedInvoicePaymentHistory = useMemo(
    () =>
      sortByNewest(selectedInvoice?.paymentHistory, [
        "createdAt",
        "created_at",
        "allocatedAt",
        "allocated_at",
        "confirmedAt",
        "confirmed_at",
        "transactionTime",
        "transaction_time",
      ]),
    [selectedInvoice],
  );

  const properties = useMemo(() => {
    const propertyMap = new Map();
    rooms.forEach((room) => {
      if (!room.propertyId) return;
      const id = String(room.propertyId);
      if (!propertyMap.has(id)) {
        propertyMap.set(id, { id, name: room.propertyName || `Cơ sở ${id}` });
      }
    });
    return Array.from(propertyMap.values());
  }, [rooms]);

  const filterRooms = useMemo(
    () => roomsForProperty(rooms, filters.propertyId),
    [rooms, filters.propertyId],
  );

  const overrideRooms = useMemo(
    () => roomsForProperty(rooms, overrideForm.propertyId),
    [rooms, overrideForm.propertyId],
  );

  const paymentRooms = useMemo(
    () => roomsForProperty(rooms, paymentForm.propertyId),
    [rooms, paymentForm.propertyId],
  );

  const paymentInvoices = useMemo(
    () =>
      visibleInvoices.filter((invoice) => {
        if (!isPendingInvoice(invoice)) return false;
        if (
          paymentForm.propertyId &&
          String(invoice.propertyId) !== String(paymentForm.propertyId)
        )
          return false;
        if (
          paymentForm.roomId &&
          String(invoice.roomId) !== String(paymentForm.roomId)
        )
          return false;
        return true;
      }),
    [paymentForm.propertyId, paymentForm.roomId, visibleInvoices],
  );

  const totalElements = invoices.length;
  const totalPages = Math.ceil(totalElements / size);
  const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const paginatedInvoices = useMemo(() => {
    const firstIndex = (safePage - 1) * size;
    return invoices.slice(firstIndex, firstIndex + size);
  }, [invoices, safePage, size]);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchBillingInvoices(filters);
      const sortedInvoices = sortByNewest(data, ["createdAt", "created_at", "issueDate", "issue_date", "billingPeriod"]);
      setInvoices(sortedInvoices);
      setSelectedInvoiceId((current) =>
        current &&
        sortedInvoices.some((invoice) => String(invoice.id) === String(current))
          ? current
          : "",
      );
    } catch (loadError) {
      setError(loadError?.message || "Không tải được danh sách hóa đơn.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchManagementRoomCatalog()
      .then(setRooms)
      .catch(() => setRooms([]));
  }, []);

  useEffect(() => {
    if (!queryBillingPeriod && !queryPropertyId) return undefined;

    const timeoutId = window.setTimeout(() => {
      setFilters((current) => ({
        ...current,
        billingPeriod: queryBillingPeriod || current.billingPeriod,
        propertyId: queryPropertyId || current.propertyId,
        roomId: "",
      }));
      if (queryBillingPeriod) {
        setBillingPeriodText(billingPeriodToVietnameseDate(queryBillingPeriod));
      }
      setPage(1);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [queryBillingPeriod, queryPropertyId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadInvoices, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadInvoices]);

  useEffect(() => {
    if (!selectedInvoice) return;
    const timeoutId = window.setTimeout(() => {
      const rentLine = selectedInvoice.lines.find(
        (line) => line.lineType === "ROOM_RENT",
      );
      const propertyId = selectedInvoice.propertyId
        ? String(selectedInvoice.propertyId)
        : "";
      const roomId = selectedInvoice.roomId
        ? String(selectedInvoice.roomId)
        : "";
      setPaymentForm((current) => ({
        ...current,
        propertyId: propertyId || current.propertyId,
        roomId: roomId || current.roomId,
        invoiceId: selectedInvoice.id || "",
        amount: selectedInvoice.remainingAmount
          ? String(selectedInvoice.remainingAmount)
          : "",
      }));
      setOverrideForm((current) => ({
        ...current,
        propertyId: propertyId || current.propertyId,
        roomId: roomId || current.roomId,
        billingPeriod: selectedInvoice.billingPeriod || current.billingPeriod,
        overrideMonthlyRent: rentLine?.unitPrice
          ? String(rentLine.unitPrice)
          : current.overrideMonthlyRent,
      }));
      if (selectedInvoice.billingPeriod) {
        setOverrideBillingPeriodText(
          billingPeriodToVietnameseDate(selectedInvoice.billingPeriod),
        );
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [selectedInvoice]);

  async function submitOverride(event) {
    event.preventDefault();
    setSaving("override");
    setError("");
    setMessage("");
    try {
      const result = await applyRentOverride(overrideForm);
      setMessage(
        result?.invoiceApplied
          ? "Đã điều chỉnh giá và cập nhật hóa đơn tháng đã chọn."
          : "Đã lưu giá điều chỉnh cho tháng đã chọn.",
      );
      await loadInvoices();
    } catch (saveError) {
      setError(saveError?.message || "Không lưu được giá điều chỉnh.");
    } finally {
      setSaving("");
    }
  }

  function selectPaymentInvoice(invoiceId) {
    const invoice = invoices.find(
      (item) => String(item.id) === String(invoiceId),
    );
    if (invoiceId) setSelectedInvoiceId(invoiceId);
    setPaymentForm((current) => ({
      ...current,
      propertyId: invoice?.propertyId
        ? String(invoice.propertyId)
        : current.propertyId,
      roomId: invoice?.roomId ? String(invoice.roomId) : current.roomId,
      invoiceId,
      amount: invoice?.remainingAmount
        ? String(invoice.remainingAmount)
        : current.amount,
    }));
  }

  function openManualPayment(invoice) {
    if (!invoice) return;
    setSelectedInvoiceId(invoice.id || "");
    setPaymentForm({
      propertyId: invoice.propertyId ? String(invoice.propertyId) : "",
      roomId: invoice.roomId ? String(invoice.roomId) : "",
      invoiceId: invoice.id || "",
      amount: invoice.remainingAmount ? String(invoice.remainingAmount) : "",
      note: "",
    });
    setIsPaymentModalOpen(true);
  }

  async function sendOverdueWarning(invoice) {
    if (!invoice?.id) return;
    setSaving(`warning-${invoice.id}`);
    setError("");
    setMessage("");
    try {
      const result = await sendOverdueInvoiceWarning(invoice.id);
      setMessage(
        result?.recipientCount
          ? `Đã gửi cảnh báo thanh toán quá hạn cho ${result.recipientCount} khách thuê.`
          : "Không tìm thấy khách thuê đang nhận thông báo cho phòng này.",
      );
    } catch (warningError) {
      setError(warningError?.message || "Không gửi được cảnh báo thanh toán quá hạn.");
    } finally {
      setSaving("");
    }
  }

  async function submitPayment(event) {
    event.preventDefault();
    setSaving("payment");
    setError("");
    setMessage("");
    try {
      await confirmManualPayment(paymentForm.invoiceId, {
        amount: paymentForm.amount,
        note: paymentForm.note,
      });
      setMessage("Đã xác nhận thanh toán thủ công.");
      setPaymentForm({
        propertyId: "",
        roomId: "",
        invoiceId: "",
        amount: "",
        note: "",
      });
      setIsPaymentModalOpen(false);
      await loadInvoices();
    } catch (saveError) {
      setError(saveError?.message || "Không xác nhận được thanh toán.");
    } finally {
      setSaving("");
    }
  }

  function updateBillingPeriodText(value) {
    const nextText = formatVietnameseDateInput(value);
    setBillingPeriodText(nextText);

    if (!nextText.trim()) {
      setFilters((current) => ({ ...current, billingPeriod: "" }));
      return;
    }

    const nextPeriod = vietnameseDateToBillingPeriod(nextText);
    if (nextPeriod) {
      setFilters((current) => ({ ...current, billingPeriod: nextPeriod }));
    }
  }

  function normalizeBillingPeriodText() {
    if (!billingPeriodText.trim()) return;

    const nextPeriod = vietnameseDateToBillingPeriod(billingPeriodText);
    setBillingPeriodText(
      billingPeriodToVietnameseDate(nextPeriod || filters.billingPeriod),
    );
  }

  function updateOverrideBillingPeriodText(value) {
    const nextText = formatVietnameseDateInput(value);
    setOverrideBillingPeriodText(nextText);

    if (!nextText.trim()) {
      setOverrideForm((current) => ({ ...current, billingPeriod: "" }));
      return;
    }

    const nextPeriod = vietnameseDateToBillingPeriod(nextText);
    if (nextPeriod) {
      setOverrideForm((current) => ({ ...current, billingPeriod: nextPeriod }));
    }
  }

  function normalizeOverrideBillingPeriodText() {
    if (!overrideBillingPeriodText.trim()) return;

    const nextPeriod = vietnameseDateToBillingPeriod(overrideBillingPeriodText);
    const normalizedPeriod = nextPeriod || overrideForm.billingPeriod;
    setOverrideBillingPeriodText(
      billingPeriodToVietnameseDate(normalizedPeriod),
    );
    if (nextPeriod) {
      setOverrideForm((current) => ({ ...current, billingPeriod: nextPeriod }));
    }
  }

  const totals = invoices.reduce(
    (acc, invoice) => ({
      total: acc.total + Number(invoice.totalAmount || 0),
      paid: acc.paid + Number(invoice.paidAmount || 0),
      remaining: acc.remaining + Number(invoice.remainingAmount || 0),
    }),
    { total: 0, paid: 0, remaining: 0 },
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 text-slate-900 dark:text-white">
      <DashboardPageHeader
        title="Hóa đơn & Thu tiền"
        description="Theo dõi hóa đơn phòng, ghi nhận thanh toán thủ công và quản lý các khoản còn phải thu."
        actions={
          <Link
            href="/dashboard/billing/history"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#cbd5e1] dark:border-white/10 px-4 text-sm font-bold text-slate-700 dark:text-slate-200 "
          >
            <History className="h-4 w-4 dark:text-slate-300" />
            Lịch sử thanh toán
          </Link>
        }
      />

      {(error || message) && (
        <section
          className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
            error
              ? "border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300"
              : "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {error || message}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStatCard
          icon={ReceiptText}
          label="Tổng hóa đơn"
          value={formatMoney(totals.total)}
          tone="blue"
          subtitle="Tổng giá trị trong kỳ"
        />
        <DashboardStatCard
          icon={CheckCircle2}
          label="Đã thu"
          value={formatMoney(totals.paid)}
          tone="emerald"
          subtitle="Khoản đã ghi nhận"
        />
        <DashboardStatCard
          icon={WalletCards}
          label="Còn lại"
          value={formatMoney(totals.remaining)}
          tone="rose"
          subtitle="Khoản cần tiếp tục thu"
        />
      </section>

      <section className="rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Bộ lọc hóa đơn</h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lọc theo kỳ, trạng thái, cơ sở và phòng.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <label className="grid gap-1 text-sm font-bold">
            Tháng
            <input
              type="text"
              inputMode="numeric"
              placeholder="vd: 01/07/2026"
              value={billingPeriodText}
              onBlur={normalizeBillingPeriodText}
              onChange={(event) => updateBillingPeriodText(event.target.value)}
              className={FORM_CONTROL_CLASS}
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Trạng thái
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
              className={FORM_CONTROL_CLASS}
            >
              <option value="ALL">Tất cả</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Loại
            <select
              value={filters.invoiceType}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  invoiceType: event.target.value,
                }))
              }
              className={FORM_CONTROL_CLASS}
            >
              <option value="ALL">Tất cả</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Cơ sở
            <select
              value={filters.propertyId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  propertyId: event.target.value,
                  roomId: "",
                }))
              }
              className={FORM_CONTROL_CLASS}
            >
              <option value="">Tất cả cơ sở</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Phòng
            <select
              value={filters.roomId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  roomId: event.target.value,
                }))
              }
              className={FORM_CONTROL_CLASS}
            >
              <option value="">Tất cả phòng</option>
              {filterRooms.map((room) => (
                <option key={roomKey(room)} value={roomKey(room)}>
                  {roomLabel(room)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={loadInvoices}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-4 text-sm font-bold text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Tải hóa đơn
          </button>
          <button
            type="button"
            onClick={() => setIsOverrideModalOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-200 dark:hover:bg-white/5"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Điều chỉnh giá
          </button>
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            <Banknote className="h-4 w-4" />
            Thanh toán thủ công
          </button>
        </div>
      </section>

      <section className="w-full overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
        <div className="flex flex-col gap-3 border-b border-[#e2e8f0] px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
              <ReceiptText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Danh sách hóa đơn
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Theo dõi trạng thái thu tiền theo từng phòng.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 dark:bg-white/5 dark:text-slate-300">
            {totalElements} hóa đơn
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-[#f2f4f6] dark:bg-white/5 text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Hóa đơn</th>
                <th className="px-4 py-3">Phòng</th>
                <th className="px-4 py-3">Khách thuê</th>
                <th className="px-4 py-3">Tháng</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Tổng tiền</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400" colSpan={7}>
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Đang tải hóa đơn...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400" colSpan={7}>
                    Chưa có hóa đơn phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => setSelectedInvoiceId(invoice.id || "")}
                    className={`cursor-pointer border-t border-[#e2e8f0] bg-white transition hover:bg-slate-50 dark:border-white/10 dark:bg-[#0f172a] dark:hover:bg-white/5 ${
                      String(selectedInvoiceId) === String(invoice.id) ? "bg-blue-50/60 dark:bg-blue-500/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-black">{invoice.invoiceCode}</p>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {typeLabel(invoice.invoiceType)}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-semibold">{displayRoomCode(invoice.roomCode)}</td>
                    <td className="px-4 py-3">{invoice.tenantName || "Chưa có"}</td>
                    <td className="px-4 py-3">{formatBillingPeriod(invoice.billingPeriod)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${invoiceStatusClasses(invoice.status)}`}
                      >
                        {statusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black">
                      {formatMoney(invoice.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {isPendingInvoice(invoice) && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openManualPayment(invoice);
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white transition hover:bg-emerald-700"
                          >
                            <Banknote className="h-3.5 w-3.5" />
                            Xác nhận
                          </button>
                        )}
                        {isExpiredInvoice(invoice) && (
                          <button
                            type="button"
                            disabled={saving === `warning-${invoice.id}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              sendOverdueWarning(invoice);
                            }}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-700 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                          >
                            {saving === `warning-${invoice.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            )}
                            Cảnh báo
                          </button>
                        )}
                        {!isPendingInvoice(invoice) && !isExpiredInvoice(invoice) && (
                          <span className="text-xs font-semibold text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <DashboardPagination
          page={safePage}
          size={size}
          totalElements={totalElements}
          totalPages={totalPages}
          itemLabel="hóa đơn"
          onPageChange={setPage}
          onSizeChange={(nextSize) => {
            setSize(nextSize);
            setPage(1);
          }}
          className="border-t border-[#e2e8f0] dark:border-white/10"
        />
      </section>

      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-2xl dark:bg-[#0f172a]">
            <button
              type="button"
              onClick={() => setIsOverrideModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
            <form
              onSubmit={submitOverride}
              className="rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4"
            >
              <div className="mb-4 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-[#3156b6]" />
                <h2 className="text-sm font-black">
                  Điều chỉnh giá theo tháng
                </h2>
              </div>
              <div className="grid gap-3">
                <label className="grid gap-1 text-sm font-bold">
                  Cơ sở
                  <select
                    required
                    value={overrideForm.propertyId}
                    onChange={(event) =>
                      setOverrideForm((current) => ({
                        ...current,
                        propertyId: event.target.value,
                        roomId: "",
                      }))
                    }
                    className={FORM_CONTROL_CLASS}
                  >
                    <option value="">Chọn cơ sở</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-bold">
                  Phòng
                  <select
                    required
                    value={overrideForm.roomId}
                    onChange={(event) =>
                      setOverrideForm((current) => ({
                        ...current,
                        roomId: event.target.value,
                      }))
                    }
                    disabled={!overrideForm.propertyId}
                    className={FORM_CONTROL_CLASS}
                  >
                    <option value="">
                      {overrideForm.propertyId
                        ? "Chọn phòng"
                        : "Chọn cơ sở trước"}
                    </option>
                    {overrideRooms.map((room) => (
                      <option key={roomKey(room)} value={roomKey(room)}>
                        {room.roomCode || room.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-bold">
                  Tháng
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    placeholder="vd: 01/07/2026"
                    value={overrideBillingPeriodText}
                    onBlur={normalizeOverrideBillingPeriodText}
                    onChange={(event) =>
                      updateOverrideBillingPeriodText(event.target.value)
                    }
                    className={FORM_CONTROL_CLASS}
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold">
                  Giá điều chỉnh
                  <input
                    required
                    min="1"
                    type="number"
                    value={overrideForm.overrideMonthlyRent}
                    onChange={(event) =>
                      setOverrideForm((current) => ({
                        ...current,
                        overrideMonthlyRent: event.target.value,
                      }))
                    }
                    className={FORM_CONTROL_CLASS}
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold">
                  Ghi chú
                  <input
                    value={overrideForm.reason}
                    onChange={(event) =>
                      setOverrideForm((current) => ({
                        ...current,
                        reason: event.target.value,
                      }))
                    }
                    className={FORM_CONTROL_CLASS}
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={saving === "override"}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#3156b6] px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving === "override" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Lưu điều chỉnh
              </button>
            </form>
          </div>
        </div>
      )}

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-2xl dark:bg-[#0f172a]">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
            <form
              onSubmit={submitPayment}
              className="rounded-lg border border-[#e2e8f0] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4"
            >
              <div className="mb-4 flex items-center gap-2">
                <Banknote className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                <h2 className="text-sm font-black">
                  Xác nhận thanh toán thủ công
                </h2>
              </div>
              <div className="grid gap-3">
                <label className="grid gap-1 text-sm font-bold">
                  Cơ sở
                  <select
                    required
                    value={paymentForm.propertyId}
                    onChange={(event) =>
                      setPaymentForm((current) => ({
                        ...current,
                        propertyId: event.target.value,
                        roomId: "",
                        invoiceId: "",
                        amount: "",
                      }))
                    }
                    className={FORM_CONTROL_CLASS}
                  >
                    <option value="">Chọn cơ sở</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-bold">
                  Phòng
                  <select
                    required
                    value={paymentForm.roomId}
                    onChange={(event) =>
                      setPaymentForm((current) => ({
                        ...current,
                        roomId: event.target.value,
                        invoiceId: "",
                        amount: "",
                      }))
                    }
                    disabled={!paymentForm.propertyId}
                    className={FORM_CONTROL_CLASS}
                  >
                    <option value="">
                      {paymentForm.propertyId
                        ? "Chọn phòng"
                        : "Chọn cơ sở trước"}
                    </option>
                    {paymentRooms.map((room) => (
                      <option key={roomKey(room)} value={roomKey(room)}>
                        {room.roomCode || room.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-bold">
                  Hóa đơn
                  <select
                    required
                    value={paymentForm.invoiceId}
                    onChange={(event) =>
                      selectPaymentInvoice(event.target.value)
                    }
                    disabled={!paymentForm.roomId}
                    className={FORM_CONTROL_CLASS}
                  >
                    <option value="">
                      {paymentForm.roomId ? "Chọn hóa đơn" : "Chọn phòng trước"}
                    </option>
                    {paymentInvoices.map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoiceCode} - {displayRoomCode(invoice.roomCode)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-bold">
                  Số tiền nhận
                  <input
                    required
                    min="1"
                    type="number"
                    value={paymentForm.amount}
                    onChange={(event) =>
                      setPaymentForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    className={FORM_CONTROL_CLASS}
                  />
                </label>
                <label className="grid gap-1 text-sm font-bold">
                  Ghi chú
                  <input
                    value={paymentForm.note}
                    onChange={(event) =>
                      setPaymentForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    className={FORM_CONTROL_CLASS}
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={saving === "payment"}
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving === "payment" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Banknote className="h-4 w-4" />
                )}
                Xác nhận đã nhận tiền
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <section className="rounded-lg border border-[#e2e8f0] bg-white p-4 dark:border-white/10 dark:bg-[#0f172a]">
          <h2 className="text-sm font-black">
            Chi tiết {selectedInvoice.invoiceCode}
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-lg border border-[#e2e8f0] dark:border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f8fafc] dark:bg-white/5 text-xs uppercase text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Khoản</th>
                    <th className="px-3 py-2 text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.lines.map((line) => (
                    <tr
                      key={line.id || line.description}
                      className="border-t border-[#e2e8f0] dark:border-white/10"
                    >
                      <td className="px-3 py-2">
                        <p className="font-bold">
                          {line.description || typeLabel(line.lineType)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {typeLabel(line.lineType)}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-right font-black">
                        {formatMoney(line.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="overflow-hidden rounded-lg border border-[#e2e8f0] dark:border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f8fafc] dark:bg-white/5 text-xs uppercase text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Thanh toán</th>
                    <th className="px-3 py-2 text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoicePaymentHistory.length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-4 text-sm font-semibold text-slate-500 dark:text-slate-400"
                        colSpan={2}
                      >
                        Chưa có lịch sử thanh toán.
                      </td>
                    </tr>
                  ) : (
                    selectedInvoicePaymentHistory.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-t border-[#e2e8f0] dark:border-white/10"
                      >
                        <td className="px-3 py-2">
                          <p className="font-bold">
                            {payment.payerName ||
                              payment.provider ||
                              "Thủ công"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {payment.allocatedAt || payment.confirmedAt}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-right font-black">
                          {formatMoney(payment.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
