"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Banknote,
  Bell,
  Check,
  Eye,
  FileSpreadsheet,
  History,
  Loader2,
  MoreVertical,
  RefreshCw,
  Save,
  Settings,
  X,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";
import TimeTreeFilter, { buildTreeFromData } from "@/components/dashboard/TimeTreeFilter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  applyRentOverride,
  confirmManualPayment,
  downloadBillingInvoicesExcel,
  fetchBillingInvoices,
  sendOverdueInvoiceWarning,
} from "@/services/billingService";
import { fetchManagementRoomCatalog } from "@/services/managementRoomsService";
import { sortByNewest } from "@/lib/sortByNewest.mjs";
import { enumLabel } from "@/lib/enumLabels";

const money = new Intl.NumberFormat("vi-VN");
const FORM_CONTROL_CLASS =
  "h-10 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10 dark:border-white/10 dark:bg-[#0f172a] dark:text-white";

const STATUS_LABELS = {
  ISSUED: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  OVERDUE: "Quá hạn",
};

const TYPE_LABELS = {
  RENT: "Tiền phòng",
  UTILITY: "Tiền điện",
  OTHER: "Khác",
  TRANSFER_DIFFERENCE: "Chênh lệch chuyển phòng",
};

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isSpecificBillingPeriod(value) {
  return /^(\d{4})-(0[1-9]|1[0-2])$/.test(String(value || ""));
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
  const text = String(value || "")
    .replace(/[^\d/]/g, "")
    .slice(0, 10);
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

function formatMoneyInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? money.format(Number(digits)) : "";
}



function statusLabel(value) {
  return enumLabel(value, STATUS_LABELS, "Chưa rõ");
}

function typeLabel(value) {
  return enumLabel(value, TYPE_LABELS, "Khác");
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

const invoiceActionItemClass =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white";

function InvoiceActionsMenu({
  invoice,
  saving,
  onViewDetails,
  onAdjustPrice,
  onConfirmPayment,
  onSendWarning,
}) {
  const canAdjustDiscount = invoice?.invoiceType === "RENT";
  const canConfirmPayment = isPendingInvoice(invoice);
  const canSendWarning = isExpiredInvoice(invoice);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(event) => event.stopPropagation()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#cbd3df] text-slate-600 transition hover:border-[#1e40af] hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
          aria-label={`Thao tác hóa đơn ${invoice.invoiceCode || ""}`}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 max-w-[calc(100vw-1rem)] rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)] dark:border-white/10 dark:bg-[#0f172a]"
      >
        <DropdownMenuItem asChild className="rounded-lg p-0 focus:bg-transparent">
          <button type="button" onClick={() => onViewDetails(invoice)} className={invoiceActionItemClass}>
            <Eye className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            Xem chi tiết
          </button>
        </DropdownMenuItem>
        {canAdjustDiscount ? <DropdownMenuItem asChild className="rounded-lg p-0 focus:bg-transparent">
          <button type="button" onClick={() => onAdjustPrice(invoice)} className={invoiceActionItemClass}>
            <Settings className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            Giảm giá tiền phòng
          </button>
        </DropdownMenuItem> : null}
        {canConfirmPayment ? (
          <DropdownMenuItem asChild className="rounded-lg p-0 focus:bg-transparent">
            <button type="button" onClick={() => onConfirmPayment(invoice)} className={invoiceActionItemClass}>
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
              Xác nhận thanh toán
            </button>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild className="rounded-lg p-0 focus:bg-transparent">
          <button
            type="button"
            disabled={!canSendWarning || saving === `warning-${invoice.id}`}
            onClick={() => onSendWarning(invoice)}
            title={canSendWarning ? "Gửi cảnh báo quá hạn" : "Chỉ gửi được khi hóa đơn quá hạn còn dư nợ"}
            className={`${invoiceActionItemClass} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {saving === `warning-${invoice.id}` ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-300" />
            ) : (
              <Bell className="h-4 w-4 text-amber-600 dark:text-amber-300" />
            )}
            Gửi cảnh báo
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
    floorId: "",
    roomId: "",
  });
  const [billingPeriodText, setBillingPeriodText] = useState(() =>
    billingPeriodToVietnameseDate(initialBillingPeriod),
  );
  const [timeFilter, setTimeFilter] = useState(null);
  const [billingTreeInvoices, setBillingTreeInvoices] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [overrideForm, setOverrideForm] = useState({
    roomId: "",
    billingPeriod: currentMonth(),
    discountAmount: "",
    reason: "",
  });
  const [overrideInvoice, setOverrideInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    propertyId: "",
    roomId: "",
    invoiceId: "",
    amount: "",
    note: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [warningInvoice, setWarningInvoice] = useState(null);
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
    () => {
      let result = invoices;
      if (filters.floorId) {
        result = result.filter((invoice) => {
          const room = rooms.find((r) => String(r.id ?? r.roomId) === String(invoice.roomId));
          const fId = room?.floorId ?? room?.floor?.id;
          return String(fId) === String(filters.floorId);
        });
      }
      return sortByNewest(result, [
        "createdAt",
        "created_at",
        "issueDate",
        "issue_date",
        "billingPeriod",
      ]);
    },
    [invoices, filters.floorId, rooms],
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
  const overrideRentLine = overrideInvoice?.lines?.find(
    (line) => line.lineType === "ROOM_RENT",
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

  const floors = useMemo(() => {
    if (!filters.propertyId) return [];
    const floorMap = new Map();
    filterRooms.forEach((room) => {
      const fId = room.floorId ?? room.floor?.id;
      if (!fId) return;
      const fName = room.floorName ?? room.floor?.name ?? `Tầng ${fId}`;
      if (!floorMap.has(String(fId))) {
        floorMap.set(String(fId), { id: String(fId), name: fName });
      }
    });
    return Array.from(floorMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filterRooms, filters.propertyId]);

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

  const totals = visibleInvoices.reduce(
    (summary, invoice) => ({
      count: summary.count + 1,
      totalAmount: summary.totalAmount + Number(invoice.totalAmount || 0),
      paidAmount: summary.paidAmount + Number(invoice.paidAmount || 0),
      remainingAmount: summary.remainingAmount + Number(invoice.remainingAmount || 0),
    }),
    { count: 0, totalAmount: 0, paidAmount: 0, remainingAmount: 0 },
  );

  const totalElements = visibleInvoices.length;
  const totalPages = Math.ceil(totalElements / size);
  const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const paginatedInvoices = useMemo(() => {
    const firstIndex = (safePage - 1) * size;
    return visibleInvoices.slice(firstIndex, firstIndex + size);
  }, [visibleInvoices, safePage, size]);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchBillingInvoices(filters);
      const sortedInvoices = sortByNewest(data, [
        "createdAt",
        "created_at",
        "issueDate",
        "issue_date",
        "billingPeriod",
      ]);
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

  // Keep the time tree independent from the active month/status filters.
  useEffect(() => {
    let cancelled = false;

    fetchBillingInvoices({ propertyId: filters.propertyId })
      .then((data) => {
        if (!cancelled) setBillingTreeInvoices(data);
      })
      .catch(() => {
        if (!cancelled) setBillingTreeInvoices([]);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.propertyId]);

  useEffect(() => {
    fetchManagementRoomCatalog()
      .then(setRooms)
      .catch(() => setRooms([]));
  }, []);

  /* Build the billing tree from all invoices, not only the active list filter. */
  const billingFullTree = useMemo(
    () => buildTreeFromData(billingTreeInvoices, (inv) => {
      const period = inv.billingPeriod; // "YYYY-MM"
      if (!period) return null;
      return `${period}-01`; // make a full date so Date() can parse it
    }),
    [billingTreeInvoices],
  );

  /** Converts a tree selection (year / quarter / month) to a billingPeriod string "YYYY-MM". */
  const handleTimeFilterSelect = useCallback((dateSelection) => {
    setTimeFilter(dateSelection);
    if (!dateSelection) {
      setBillingPeriodText("");
      setFilters((prev) => ({ ...prev, status: "ALL", billingPeriod: "" }));
      return;
    }
    const { year, quarter, month } = dateSelection;
    if (month === "all" || month == null) {
      // Year or Quarter selected – clear month filter so all invoices in that range show
      setBillingPeriodText("");
      setFilters((prev) => ({ ...prev, status: "ALL", billingPeriod: "" }));
    } else {
      // Specific month selected → filter by that billing period
      const mm = String(month).padStart(2, "0");
      const period = `${year}-${mm}`;
      setBillingPeriodText(billingPeriodToVietnameseDate(period));
      setFilters((prev) => ({ ...prev, status: "ALL", billingPeriod: period }));
    }
    setPage(1);
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
          ? "Đã lưu giảm giá và cập nhật hóa đơn tiền phòng."
          : "Đã lưu giảm giá cho kỳ đã chọn.",
      );
      setIsOverrideModalOpen(false);
      setOverrideInvoice(null);
      await loadInvoices();
    } catch (saveError) {
      setError(saveError?.message || "Không lưu được giảm giá.");
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

  function openInvoiceDetails(invoice) {
    if (!invoice?.id) return;
    setSelectedInvoiceId(invoice.id);
    setIsInvoiceDetailOpen(true);
  }

  function openOverrideModal(invoice) {
    if (!invoice || invoice.invoiceType !== "RENT") return;
    const billingPeriod = invoice.billingPeriod || currentMonth();

    setSelectedInvoiceId(invoice.id || "");
    setOverrideInvoice(invoice);
    setOverrideForm({
      roomId: invoice.roomId ? String(invoice.roomId) : "",
      billingPeriod,
      discountAmount:
        Number(invoice.discountAmount) > 0
          ? String(Math.trunc(Number(invoice.discountAmount)))
          : "",
      reason: invoice.discountReason || "",
    });
    setIsOverrideModalOpen(true);
  }

  function closeOverrideModal() {
    setIsOverrideModalOpen(false);
    setOverrideInvoice(null);
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
      setError(
        warningError?.message || "Không gửi được cảnh báo thanh toán quá hạn.",
      );
    } finally {
      setSaving("");
    }
  }

  async function exportInvoicesExcel() {
    if (!isSpecificBillingPeriod(filters.billingPeriod)) {
      setError("Vui long chon mot thang cu the truoc khi xuat Excel.");
      return;
    }
    if (invoices.length === 0) {
      setError("Chưa có hóa đơn phù hợp với bộ lọc để xuất.");
      return;
    }
    setExporting(true);
    setError("");
    try {
      await downloadBillingInvoicesExcel(filters);
    } catch (exportError) {
      setError(exportError?.message || "Xuất file Excel thất bại.");
    } finally {
      setExporting(false);
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

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 text-slate-900 dark:text-white">
      <DashboardPageHeader
        title="Hóa đơn & Thu tiền"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportInvoicesExcel}
              disabled={
                exporting ||
                loading ||
                invoices.length === 0 ||
                !isSpecificBillingPeriod(filters.billingPeriod)
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Xuất Excel
            </button>
            <Link
              href="/dashboard/billing/history"
              className="inline-flex h-10 items-center bg-[#1e40af] text-white gap-2 rounded-lg border border-[#cbd5e1] dark:border-white/10 px-4 text-sm font-bold text-slate-700 dark:text-slate-200"
            >
              Lịch sử thanh toán
            </Link>
          </div>
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

      {/* ── Body: Sidebar + Main ── */}
      <div className="flex gap-6">
        {/* Sidebar – Time Tree Filter (Năm → Quý → Tháng) */}
        <TimeTreeFilter
          treeData={billingFullTree}
          selectedDate={timeFilter}
          onDateSelect={handleTimeFilterSelect}
          maxDepth="month"
          className="hidden lg:flex"
        />

        {/* Main content */}
        <div className="w-full min-w-0 flex-1 flex flex-col gap-1">

      <section className="rounded-lg border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a] flex flex-col">
        <div className="flex flex-wrap items-center gap-3 p-3">
          <select
            value={filters.invoiceType}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                invoiceType: event.target.value,
              }))
            }
            className={FORM_CONTROL_CLASS}
            aria-label="Lọc theo loại hóa đơn"
          >
            <option value="ALL">Tất cả loại</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={filters.propertyId}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                propertyId: event.target.value,
                floorId: "",
                roomId: "",
              }))
            }
            className={FORM_CONTROL_CLASS}
            aria-label="Lọc theo cơ sở"
          >
            <option value="">Tất cả cơ sở</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>

          <select
            value={filters.floorId || ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                floorId: event.target.value,
                roomId: "",
              }))
            }
            className={FORM_CONTROL_CLASS}
            aria-label="Lọc theo tầng"
            disabled={!filters.propertyId}
          >
            <option value="">Tất cả tầng</option>
            {floors.map((floor) => (
              <option key={floor.id} value={floor.id}>
                {floor.name}
              </option>
            ))}
          </select>
        </div>
      </section>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3 dark:border-white/5">
          {[["ALL", "Tất cả"], ...Object.entries(STATUS_LABELS)].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilters((current) => ({ ...current, status: value }))}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                filters.status === value
                  ? "bg-[#1e40af] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
              }`}
            >
              {label}
            </button>
          ))}
        </div>


      <section className="w-full overflow-hidden rounded-lg border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-[#f2f4f6] dark:bg-white/5 text-xs uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Hóa đơn</th>
                <th className="px-4 py-3 text-center">Phòng</th>
                <th className="px-4 py-3 text-center">Khách thuê</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-center">Tổng tiền</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400"
                    colSpan={6}
                  >
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Đang tải hóa đơn...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400"
                    colSpan={6}
                  >
                    Chưa có hóa đơn phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-t border-[#e2e8f0] bg-white transition hover:bg-slate-50 dark:border-white/10 dark:bg-[#0f172a] dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-3">
                      <p className="font-black">
                        {typeLabel(invoice.invoiceType)}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {invoice.invoiceCode}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-center">
                      {displayRoomCode(invoice.roomCode)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {invoice.tenantName || "Chưa có"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${invoiceStatusClasses(invoice.status)}`}
                      >
                        {statusLabel(invoice.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-black">
                      {formatMoney(invoice.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <InvoiceActionsMenu
                          invoice={invoice}
                          saving={saving}
                          onViewDetails={openInvoiceDetails}
                          onAdjustPrice={openOverrideModal}
                          onConfirmPayment={openManualPayment}
                          onSendWarning={setWarningInvoice}
                        />
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

        </div>
      </div>

      <Dialog
        open={isOverrideModalOpen}
        onOpenChange={(open) => {
          if (!open && saving !== "override") closeOverrideModal();
        }}
      >
        <DialogContent
          lockScroll={false}
          showCloseButton={false}
          overlayClassName="bg-slate-950/55 backdrop-blur-sm"
          className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] gap-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-[#0f172a] sm:max-w-lg"
        >
          <form onSubmit={submitOverride}>
            <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left dark:border-white/10">
              <DialogTitle className="flex items-center gap-2 pr-8 text-base font-black text-slate-900 dark:text-white">
                <RefreshCw className="h-4 w-4 text-[#3156b6]" />
                Giảm giá tiền phòng
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 px-5 py-5">
              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Cơ sở
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                    {overrideInvoice?.propertyName || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Phòng
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                    {displayRoomCode(overrideInvoice?.roomCode)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Kỳ áp dụng
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                    {formatBillingPeriod(overrideInvoice?.billingPeriod)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Giá niêm yết
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                    {overrideRentLine?.unitPrice != null
                      ? formatMoney(overrideRentLine.unitPrice)
                      : "-"}
                  </p>
                </div>
              </div>

              <label className="grid gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                Số tiền giảm
                <div className="relative">
                  <input
                    required
                    min="0"
                    step="1000"
                    type="text"
                    inputMode="numeric"
                    value={formatMoneyInput(overrideForm.discountAmount)}
                    onChange={(event) =>
                      setOverrideForm((current) => ({
                        ...current,
                        discountAmount: event.target.value.replace(/\D/g, ""),
                      }))
                    }
                    className={`${FORM_CONTROL_CLASS} w-full pr-16`}
                    placeholder="Ví dụ: 300.000"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-slate-400">
                    VNĐ
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Không được lớn hơn tiền phòng của hóa đơn.
                </span>
              </label>

              <label className="grid gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                Ghi chú giảm giá
                <textarea
                  rows={3}
                  value={overrideForm.reason}
                  onChange={(event) =>
                    setOverrideForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  className={`${FORM_CONTROL_CLASS} h-auto resize-none py-2.5`}
                  placeholder="Ví dụ: Ưu đãi khách thuê dài hạn"
                />
              </label>
            </div>

            <DialogFooter className="border-t border-slate-200 px-5 py-4 dark:border-white/10 sm:flex-row">
              <button
                type="button"
                onClick={closeOverrideModal}
                disabled={saving === "override"}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving === "override" || !overrideForm.roomId}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#3156b6] px-4 text-sm font-bold text-white transition hover:bg-[#26489c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving === "override" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Lưu giảm giá
              </button>
            </DialogFooter>
          </form>
          <button
            type="button"
            onClick={closeOverrideModal}
            disabled={saving === "override"}
            className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogContent>
      </Dialog>

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
                        {invoice.invoiceCode} -{" "}
                        {displayRoomCode(invoice.roomCode)}
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

      {warningInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl dark:bg-[#0f172a]">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              Xác nhận gửi cảnh báo
            </h2>
            <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Bạn có chắc chắn muốn gửi cảnh báo thanh toán quá hạn cho phòng
              này không?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setWarningInvoice(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-200 dark:hover:bg-white/5"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving === `warning-${warningInvoice.id}`}
                onClick={async () => {
                  await sendOverdueWarning(warningInvoice);
                  setWarningInvoice(null);
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-60"
              >
                {saving === `warning-${warningInvoice.id}` && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Gửi cảnh báo
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={isInvoiceDetailOpen && Boolean(selectedInvoice)}
        onOpenChange={setIsInvoiceDetailOpen}
      >
        {selectedInvoice ? (
          <DialogContent
            lockScroll={false}
            className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-[#0f172a] sm:max-w-5xl"
          >
          <DialogHeader className="border-b border-slate-200 px-5 py-4 text-left dark:border-white/10">
            <DialogTitle className="pr-8 text-base font-black text-slate-900 dark:text-white">
              Chi tiết {selectedInvoice.invoiceCode}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {displayRoomCode(selectedInvoice.roomCode)} · {typeLabel(selectedInvoice.invoiceType)} · Kỳ {formatBillingPeriod(selectedInvoice.billingPeriod)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 p-5 lg:grid-cols-2">
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
                  {selectedInvoice.invoiceType === "RENT" && selectedInvoice.discountAmount > 0 ? (
                    <tr className="border-t border-[#e2e8f0] dark:border-white/10">
                      <td className="px-3 py-2 font-bold text-emerald-700 dark:text-emerald-300">
                        Giảm giá tiền phòng
                        {selectedInvoice.discountReason ? (
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {selectedInvoice.discountReason}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right font-black text-emerald-700 dark:text-emerald-300">
                        -{formatMoney(selectedInvoice.discountAmount)}
                      </td>
                    </tr>
                  ) : null}
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
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
