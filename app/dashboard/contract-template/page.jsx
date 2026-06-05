"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Home,
  KeyRound,
  Mail,
  RefreshCw,
  Search,
  Upload,
  Users,
} from "lucide-react";
import {
  activateLeaseContract,
  createDraftLeaseContractFromDeposit,
  downloadLeaseContractFile,
  fetchLeaseContractManagementList,
  fetchManagementLeaseContractDetails,
  liquidateLeaseContract,
  openLeaseContractFile,
  uploadSignedLeaseContractFile,
} from "@/services/leaseContractsService";
import { sendTenantAccountCredentials } from "@/services/identityAccessService";
import { useAuth } from "../_contexts/AuthContext";

const TABS = [
  ["ALL", "Tất cả"],
  ["WAITING_SIGN", "Chờ ký"],
  ["NO_FILE", "Chưa upload file"],
  ["WAITING_ACTIVATE", "Chờ kích hoạt"],
  ["ACTIVE", "Đang hiệu lực"],
  ["ENDED", "Đã kết thúc"],
];

const OCCUPANT_ROLE_LABELS = {
  PRIMARY: "Người ký chính",
  CO_OCCUPANT: "Người ở cùng",
};

const EVENT_LABELS = {
  CREATED: "Tạo hợp đồng",
  SIGNED: "Ký hợp đồng",
  LIQUIDATED: "Thanh lý hợp đồng",
  FILE_UPLOADED: "Upload file",
};

function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "Chưa có";
  return `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)} đ`;
}

function formatDate(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return date.toLocaleDateString("vi-VN");
}

function formatDateTime(value) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatCycle(value) {
  const cycle = Number(value);
  if (cycle === 1) return "1 tháng/lần";
  if (cycle === 3) return "3 tháng/lần";
  return "Chưa có";
}

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function getWorkflow(item) {
  if (!item) return "WAITING_SIGN";
  const status = item.contractStatus || item.status;
  if (status === "ACTIVE") return "ACTIVE";
  if (["LIQUIDATED", "EXPIRED", "CANCELLED", "RENEWED"].includes(status)) return "ENDED";
  if (item.leaseContractId && item.contractFileId) return "WAITING_ACTIVATE";
  return item.workflowStatus || "WAITING_SIGN";
}

function workflowLabel(status) {
  switch (status) {
    case "WAITING_ACTIVATE":
      return "Chờ kích hoạt";
    case "ACTIVE":
      return "Đang hiệu lực";
    case "ENDED":
      return "Đã kết thúc";
    case "WAITING_SIGN":
    default:
      return "Chờ ký";
  }
}

function workflowClass(status) {
  switch (status) {
    case "WAITING_ACTIVATE":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "ENDED":
      return "border-slate-200 bg-slate-50 text-slate-600";
    case "WAITING_SIGN":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function workflowIcon(status) {
  if (status === "ACTIVE") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "WAITING_ACTIVATE") return <Clock className="h-4 w-4" />;
  return <AlertTriangle className="h-4 w-4" />;
}

function getContractRowKey(item, index = 0) {
  if (item?.sourceType === "CONTRACT" && item?.contractId) return `contract-${item.contractId}`;
  if (item?.sourceType === "DEPOSIT" && item?.depositAgreementId) return `deposit-${item.depositAgreementId}`;
  if (item?.leaseContractId) return `contract-${item.leaseContractId}`;
  if (item?.contractId) return `contract-${item.contractId}`;
  if (item?.depositAgreementId) return `deposit-${item.depositAgreementId}`;
  if (item?.id) return `item-${item.id}`;
  if (item?.displayCode) return `code-${item.displayCode}`;
  if (item?.code) return `code-${item.code}`;
  return `row-${index}`;
}

function Badge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${workflowClass(status)}`}>
      {workflowIcon(status)}
      {workflowLabel(status)}
    </span>
  );
}

function StatCard({ label, value, tone = "slate" }) {
  const color = {
    slate: "text-[#091426]",
    amber: "text-amber-600",
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    red: "text-red-600",
  }[tone];

  return (
    <section className="rounded-xl border border-[#dbe3ef] bg-white p-5 shadow-[0_1px_2px_rgba(9,20,38,0.08)]">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6b7280]">{label}</p>
      <p className={`mt-3 text-3xl font-extrabold ${color}`}>{value}</p>
    </section>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-xl border border-[#dbe3ef] bg-[#f8fafc] p-4">
      <div className="mb-3 flex items-center gap-2 font-extrabold text-[#091426]">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      {children}
    </section>
  );
}

function InfoItem({ label, value, strong = false }) {
  return (
    <div>
      <p className="text-sm text-[#607089]">{label}</p>
      <p className={`mt-1 ${strong ? "font-extrabold text-indigo-700" : "font-bold text-[#091426]"}`}>{value || "Chưa có"}</p>
    </div>
  );
}

export default function LeaseContractManagementPage() {
  const { user } = useAuth();
  const canManageLeaseContracts = user?.role === "OWNER";
  const fileInputRef = useRef(null);
  const uploadTargetRef = useRef(null);
  const [contracts, setContracts] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [tab, setTab] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [liquidationModalOpen, setLiquidationModalOpen] = useState(false);
  const [liquidationDate, setLiquidationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [liquidationReason, setLiquidationReason] = useState("Khách không tiếp tục thuê phòng.");

  const selected = useMemo(() => {
    if (!contracts.length) return null;
    return contracts.find((item, index) => getContractRowKey(item, index) === selectedKey) || contracts[0];
  }, [contracts, selectedKey]);

  const mergedSelected = useMemo(() => {
    if (!selected) return null;
    if (!selectedDetails) return selected;
    return {
      ...selected,
      ...selectedDetails,
      roomCode: selectedDetails.room?.roomCode ?? selected.roomCode,
      propertyName: selectedDetails.property?.name ?? selected.propertyName,
      customerName: selectedDetails.primaryTenant?.fullName ?? selected.customerName,
      phone: selectedDetails.primaryTenant?.phone ?? selected.phone,
      contractFileId: selectedDetails.contractFile?.fileId ?? selected.contractFileId,
      contractFileName: selectedDetails.contractFile?.fileName ?? selected.contractFileName,
    };
  }, [selected, selectedDetails]);

  const summary = useMemo(() => ({
    total: contracts.length,
    waitingSign: contracts.filter((item) => getWorkflow(item) === "WAITING_SIGN").length,
    waitingActivate: contracts.filter((item) => getWorkflow(item) === "WAITING_ACTIVATE").length,
    active: contracts.filter((item) => getWorkflow(item) === "ACTIVE").length,
    missingFile: contracts.filter((item) => !item.contractFileId).length,
  }), [contracts]);

  const filteredContracts = useMemo(() => {
    const search = normalizeText(keyword);
    return contracts.filter((item) => {
      const workflow = getWorkflow(item);
      const matchesKeyword =
        !search ||
        normalizeText(item.code).includes(search) ||
        normalizeText(item.contractCode).includes(search) ||
        normalizeText(item.depositCode).includes(search) ||
        normalizeText(item.roomCode).includes(search) ||
        normalizeText(item.propertyName).includes(search) ||
        normalizeText(item.customerName).includes(search) ||
        normalizeText(item.phone).includes(search);

      const matchesTab =
        tab === "ALL" ||
        (tab === "NO_FILE" && !item.contractFileId) ||
        (tab === "ENDED" && workflow === "ENDED") ||
        workflow === tab;

      return matchesKeyword && matchesTab;
    });
  }, [contracts, keyword, tab]);

  async function loadContracts({ silent = false } = {}) {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const data = await fetchLeaseContractManagementList();
      const nextContracts = Array.isArray(data) ? data : [];
      setContracts(nextContracts);
      if (!selectedKey && nextContracts.length) {
        setSelectedKey(getContractRowKey(nextContracts[0], 0));
      }
    } catch (loadError) {
      setError(loadError.message || "Không tải được danh sách hợp đồng thuê.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadContracts();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadDetails() {
      if (!selected?.leaseContractId) {
        setSelectedDetails(null);
        return;
      }
      setDetailLoading(true);
      try {
        const details = await fetchManagementLeaseContractDetails(selected.leaseContractId);
        if (!ignore) setSelectedDetails(details);
      } catch {
        if (!ignore) setSelectedDetails(null);
      } finally {
        if (!ignore) setDetailLoading(false);
      }
    }

    loadDetails();
    return () => {
      ignore = true;
    };
  }, [selected?.leaseContractId]);

  function selectRow(item, index) {
    setSelectedKey(getContractRowKey(item, index));
    setNotice("");
    setError("");
  }

  function openUploadDialog(target = selected) {
    if (!canManageLeaseContracts) {
      setError("Chỉ chủ trọ được upload hoặc thay thế hợp đồng thuê.");
      return;
    }
    if (!target) return;
    uploadTargetRef.current = target;
    fileInputRef.current?.click();
  }

  async function handleCreateDraftContract(target = selected) {
    if (!canManageLeaseContracts) {
      setError("Chỉ chủ trọ được tạo hợp đồng thuê.");
      return;
    }
    if (!target?.depositAgreementId) {
      setError("Không xác định được hợp đồng đặt cọc để tạo hợp đồng thuê.");
      return;
    }
    setActionLoading("create");
    setError("");
    setNotice("");
    try {
      const updated = await createDraftLeaseContractFromDeposit(target.depositAgreementId);
      await loadContracts({ silent: true });
      setSelectedKey(getContractRowKey(updated, 0));
      setNotice(`Đã tạo hợp đồng thuê cho phòng ${updated.roomCode}.`);
    } catch (createError) {
      setError(createError.message || "Không thể tạo hợp đồng thuê.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleUploadFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    const target = uploadTargetRef.current || selected;
    uploadTargetRef.current = null;
    if (!canManageLeaseContracts) {
      setError("Chỉ chủ trọ được upload hoặc thay thế hợp đồng thuê.");
      return;
    }
    if (!file || !target) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      setError("Chỉ cho phép upload PDF, JPG hoặc PNG.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File hợp đồng không được vượt quá 10MB.");
      return;
    }
    setActionLoading("upload");
    setError("");
    setNotice("");
    try {
      const updated = await uploadSignedLeaseContractFile(target, file);
      await loadContracts({ silent: true });
      setSelectedKey(getContractRowKey(updated, 0));
      setNotice(`Đã upload file hợp đồng cho phòng ${updated.roomCode}.`);
    } catch (uploadError) {
      setError(uploadError.message || "Không thể upload hợp đồng đã ký.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleActivate() {
    if (!canManageLeaseContracts) {
      setError("Chỉ chủ trọ được kích hoạt hợp đồng thuê.");
      return;
    }
    if (!selected?.leaseContractId) {
      setError("Vui lòng tạo hợp đồng thuê và upload file hợp đồng trước khi kích hoạt.");
      return;
    }
    if (!selected.contractFileId) {
      setError("Cần upload file hợp đồng đã ký trước khi kích hoạt.");
      return;
    }
    setActionLoading("activate");
    setError("");
    setNotice("");
    try {
      const updated = await activateLeaseContract(selected.leaseContractId);
      await loadContracts({ silent: true });
      setSelectedKey(getContractRowKey(updated, 0));
      setNotice(`Đã kích hoạt hợp đồng phòng ${updated.roomCode}. Phòng chuyển sang đang thuê.`);
    } catch (activateError) {
      setError(activateError.message || "Không thể kích hoạt hợp đồng thuê.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleSendAccount() {
    if (!selected?.leaseContractId) {
      setError("Hợp đồng thuê chưa được tạo.");
      return;
    }
    if (getWorkflow(selected) !== "ACTIVE") {
      setError("Chỉ gửi tài khoản sau khi hợp đồng đang hiệu lực.");
      return;
    }
    if (!selected.emailAvailable) {
      setError("Khách chưa có email, không thể gửi tài khoản.");
      return;
    }
    setActionLoading("account");
    setError("");
    setNotice("");
    try {
      await sendTenantAccountCredentials(selected.leaseContractId);
      await loadContracts({ silent: true });
      setNotice(`Đã gửi tài khoản đăng nhập cho ${selected.customerName || "khách thuê"}.`);
    } catch (accountError) {
      setError(accountError.message || "Không thể gửi tài khoản cho khách.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleViewFile() {
    const fileId = mergedSelected?.contractFileId;
    if (!fileId) {
      setError("Hợp đồng chưa có file để xem.");
      return;
    }
    setError("");
    try {
      await openLeaseContractFile(fileId);
    } catch (viewError) {
      setError(viewError.message || "Không thể mở file hợp đồng.");
    }
  }

  async function handleDownloadFile() {
    const fileId = mergedSelected?.contractFileId;
    if (!fileId) {
      setError("Hợp đồng chưa có file để tải.");
      return;
    }
    setError("");
    try {
      await downloadLeaseContractFile(fileId, mergedSelected.contractFileName || `hop-dong-${mergedSelected.roomCode}.pdf`);
    } catch (downloadError) {
      setError(downloadError.message || "Không thể tải file hợp đồng.");
    }
  }

  const selectedWorkflow = getWorkflow(selected);
  const canCreateDraft = Boolean(selected?.depositAgreementId && !selected?.leaseContractId);
  const canLiquidate = Boolean(
    selected?.leaseContractId &&
      ["ACTIVE", "EXPIRING_SOON", "TERMINATION_PENDING"].includes(selected.contractStatus || selectedWorkflow),
  );

  async function handleLiquidateContract() {
    if (!canManageLeaseContracts) {
      setError("Chỉ chủ trọ được thanh lý hợp đồng thuê.");
      return;
    }
    if (!selected?.leaseContractId) {
      setError("Hợp đồng chưa được tạo, không thể thanh lý.");
      return;
    }
    setActionLoading("liquidate");
    setError("");
    setNotice("");
    try {
      const updated = await liquidateLeaseContract(selected.leaseContractId, {
        liquidationDate,
        reason: liquidationReason,
      });
      await loadContracts({ silent: true });
      setSelectedKey(getContractRowKey(updated, 0));
      setNotice(`Đã thanh lý hợp đồng phòng ${updated.roomCode}. Phòng đã chuyển về trạng thái trống.`);
      setLiquidationModalOpen(false);
    } catch (liquidateError) {
      setError(liquidateError.message || "Không thể thanh lý hợp đồng.");
    } finally {
      setActionLoading("");
    }
  }

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUploadFile} />

      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.01em] text-[#091426]">Quản lý hợp đồng thuê</h1>
          <p className="mt-2 text-sm leading-6 text-[#505f76]">
            Theo dõi lịch ký, upload hợp đồng đã ký, kích hoạt hợp đồng thuê và quản lý người ở trong phòng.
          </p>
        </div>
        {canManageLeaseContracts && (
          <button
            type="button"
            onClick={() => handleCreateDraftContract()}
            disabled={!canCreateDraft || actionLoading === "create"}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-5 text-sm font-bold text-white hover:bg-[#16253a] disabled:cursor-not-allowed disabled:bg-slate-500 disabled:opacity-70"
            title={canCreateDraft ? "Tạo hợp đồng thuê từ hợp đồng đặt cọc đã chọn." : "Chọn một hợp đồng cọc chưa tạo hợp đồng thuê."}
          >
            <FileText className="h-4 w-4" />
            {actionLoading === "create" ? "Đang tạo..." : "Tạo hợp đồng từ cọc"}
          </button>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <StatCard label="Tổng" value={summary.total} />
        <StatCard label="Chờ ký" value={summary.waitingSign} tone="amber" />
        <StatCard label="Chờ kích hoạt" value={summary.waitingActivate} tone="blue" />
        <StatCard label="Đang hiệu lực" value={summary.active} tone="emerald" />
        <StatCard label="Chưa có file" value={summary.missingFile} tone="red" />
      </section>

      <section className="rounded-xl border border-[#dbe3ef] bg-white p-5 shadow-[0_1px_2px_rgba(9,20,38,0.08)]">
        <div className="grid gap-4 md:grid-cols-[1fr_150px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8a98af]" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm mã cọc/mã HĐ, cơ sở, phòng, tên khách hoặc SĐT"
              className="h-12 w-full rounded-lg border border-[#cbd5e1] bg-white pl-12 pr-4 text-sm font-semibold outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={() => loadContracts()}
            className="rounded-lg bg-indigo-600 text-sm font-extrabold text-white hover:bg-indigo-700"
          >
            Lọc
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {TABS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`rounded-full border px-4 py-2 text-sm font-extrabold ${
                tab === value
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-[#cbd5e1] bg-white text-[#2b3d58] hover:bg-[#f8fafc]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">{notice}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        <section className="overflow-hidden rounded-xl border border-[#dbe3ef] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.08)]">
          <div className="border-b border-[#dbe3ef] px-6 py-5">
            <h2 className="text-lg font-extrabold text-[#091426]">Danh sách hợp đồng thuê</h2>
            <p className="mt-1 text-sm text-[#607089]">Dữ liệu lấy từ hợp đồng cọc đã thanh toán và hợp đồng thuê hiện có.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-left">
              <thead className="bg-[#f3f6fb] text-xs font-extrabold uppercase tracking-wide text-[#607089]">
                <tr>
                  <th className="px-5 py-4">Mã HĐ</th>
                  <th className="px-5 py-4">Cơ sở</th>
                  <th className="px-5 py-4">Phòng</th>
                  <th className="px-5 py-4">Người thuê chính</th>
                  <th className="px-5 py-4">Số người ở</th>
                  <th className="px-5 py-4">Ngày bắt đầu</th>
                  <th className="px-5 py-4">Ngày kết thúc</th>
                  <th className="px-5 py-4">Ngày tính tiền</th>
                  <th className="px-5 py-4">Giá HĐ</th>
                  <th className="px-5 py-4">Chu kỳ</th>
                  <th className="px-5 py-4">File</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7edf5]">
                {loading && (
                  <tr>
                    <td colSpan={13} className="px-6 py-16 text-center text-sm font-bold text-[#607089]">
                      Đang tải danh sách hợp đồng thuê...
                    </td>
                  </tr>
                )}

                {!loading && filteredContracts.map((item, index) => {
                  const workflow = getWorkflow(item);
                  const itemKey = getContractRowKey(item, index);
                  return (
                    <tr
                      key={itemKey}
                      onClick={() => selectRow(item, index)}
                      className={`cursor-pointer hover:bg-[#f8fafc] ${selectedKey === itemKey ? "bg-indigo-50/70" : ""}`}
                    >
                      <td className="px-5 py-5 align-middle">
                        <div className="font-extrabold text-[#091426]">{item.contractCode || item.depositCode || item.code || "Chưa có"}</div>
                        <div className="mt-1 text-xs text-[#607089]">{item.contractCode ? "Hợp đồng thuê" : "Từ đặt cọc"}</div>
                      </td>
                      <td className="px-5 py-5 align-middle text-sm font-semibold text-[#091426]">{item.propertyName || "Chưa có"}</td>
                      <td className="px-5 py-5 align-middle">
                        <div className="inline-flex items-center gap-2 rounded-lg bg-[#091426] px-3 py-2 font-extrabold text-white">
                          <Home className="h-4 w-4" />
                          {item.roomCode || "Chưa có"}
                        </div>
                      </td>
                      <td className="px-5 py-5 align-middle font-bold text-[#091426]">{item.customerName || item.primaryTenantName || "Chưa có"}</td>
                      <td className="px-5 py-5 align-middle text-sm font-black text-[#091426]">{item.occupantsCount || 1}</td>
                      <td className="px-5 py-5 align-middle text-sm font-semibold text-[#091426]">{formatDate(item.startDate || item.expectedMoveInDate)}</td>
                      <td className="px-5 py-5 align-middle text-sm font-semibold text-[#091426]">{formatDate(item.endDate)}</td>
                      <td className="px-5 py-5 align-middle text-sm font-semibold text-[#091426]">{formatDate(item.rentStartDate)}</td>
                      <td className="px-5 py-5 align-middle text-sm font-black text-indigo-700">{formatMoney(item.monthlyRent)}</td>
                      <td className="px-5 py-5 align-middle text-sm font-semibold text-[#091426]">{formatCycle(item.paymentCycleMonths)}</td>
                      <td className="px-5 py-5 align-middle">
                        {item.contractFileId ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                            Đã upload
                          </span>
                        ) : (
                          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-extrabold text-red-700">
                            Chưa upload
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-5 align-middle"><Badge status={workflow} /></td>
                      <td className="px-5 py-5 text-right align-middle">
                        <div className="inline-flex flex-col gap-2 sm:flex-row">
                          {canManageLeaseContracts && !item.leaseContractId && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                selectRow(item, index);
                                handleCreateDraftContract(item);
                              }}
                              disabled={actionLoading === "create"}
                              className="rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-extrabold text-[#091426] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Tạo HĐ
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              selectRow(item, index);
                              if (canManageLeaseContracts && !item.contractFileId) openUploadDialog(item);
                            }}
                            className="rounded-lg bg-[#091426] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#16253a]"
                          >
                            {canManageLeaseContracts && !item.contractFileId ? "Upload PDF" : "Chi tiết"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && filteredContracts.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-6 py-16 text-center text-sm font-bold text-[#607089]">
                      Không có hợp đồng thuê phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="overflow-hidden rounded-xl border border-[#dbe3ef] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.08)]">
          {mergedSelected ? (
            <>
              <div className="border-b border-[#dbe3ef] bg-[#050b1d] px-6 py-6 text-white">
                <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-300">Chi tiết hợp đồng thuê</div>
                <h2 className="mt-3 text-2xl font-extrabold">Phòng {mergedSelected.roomCode || "Chưa có"} - {mergedSelected.customerName || "Khách thuê"}</h2>
                <div className="mt-3"><Badge status={selectedWorkflow} /></div>
              </div>

              <div className="space-y-5 p-6">
                <Section icon={Home} title="Thông tin phòng">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <InfoItem label="Cơ sở" value={mergedSelected.propertyName} />
                    <InfoItem label="Phòng" value={mergedSelected.roomCode} strong />
                    <InfoItem label="Trạng thái phòng" value={mergedSelected.roomStatus} />
                    <InfoItem label="Mã" value={mergedSelected.contractCode || mergedSelected.depositCode || mergedSelected.code} />
                  </div>
                </Section>

                <Section icon={Users} title="Người ở trong hợp đồng">
                  {detailLoading ? (
                    <div className="h-16 animate-pulse rounded-lg bg-white" />
                  ) : selectedDetails?.occupants?.length ? (
                    <div className="space-y-2">
                      {selectedDetails.occupants.map((occupant, index) => (
                        <div
                          key={occupant.tenantProfileId || `${occupant.occupantRole}-${occupant.fullName}-${index}`}
                          className="rounded-lg bg-white p-3 text-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-extrabold text-[#091426]">{occupant.fullName || "Chưa có tên"}</p>
                              <p className="mt-1 text-[#607089]">{occupant.phone || "Chưa có SĐT"}</p>
                            </div>
                            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                              {OCCUPANT_ROLE_LABELS[occupant.occupantRole] || occupant.occupantRole || "Chưa rõ"}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-semibold text-[#607089]">
                            <span>Vào: {formatDate(occupant.moveInDate)}</span>
                            <span>Rời: {occupant.moveOutDate ? formatDate(occupant.moveOutDate) : "Đang ở"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-white p-3 text-sm">
                      <InfoItem label="Người ký chính" value={mergedSelected.customerName} />
                      <p className="mt-2 text-[#607089]">Chưa có dữ liệu danh sách người ở chi tiết.</p>
                    </div>
                  )}
                </Section>

                <Section icon={CalendarDays} title="Thời hạn và tiền thuê">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <InfoItem label="Ngày bắt đầu ở" value={formatDate(mergedSelected.startDate || mergedSelected.expectedMoveInDate)} />
                    <InfoItem label="Ngày kết thúc" value={formatDate(mergedSelected.endDate)} />
                    <InfoItem label="Ngày bắt đầu tính tiền" value={formatDate(mergedSelected.rentStartDate)} />
                    <InfoItem label="Chu kỳ thanh toán" value={formatCycle(mergedSelected.paymentCycleMonths)} />
                    <InfoItem label="Giá thuê theo HĐ" value={formatMoney(mergedSelected.monthlyRent)} />
                    <InfoItem label="Tiền cọc" value={formatMoney(mergedSelected.depositAmount)} />
                    <InfoItem label="Số người ở" value={`${mergedSelected.occupantsCount || selectedDetails?.occupants?.length || 1} người`} />
                    <InfoItem label="Ngày ký" value={formatDate(mergedSelected.signedAt)} />
                  </div>
                </Section>

                <Section icon={FileText} title="File hợp đồng đã ký">
                  {mergedSelected.contractFileId ? (
                    <div className="rounded-lg bg-white p-4">
                      <p className="font-extrabold text-[#091426]">{mergedSelected.contractFileName || `hop-dong-${mergedSelected.roomCode}`}</p>
                      <p className="mt-1 text-sm text-[#607089]">Upload: {formatDate(mergedSelected.contractFileUploadedAt)}</p>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <button type="button" onClick={handleViewFile} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 py-3 text-sm font-extrabold hover:bg-[#f8fafc]">
                          <Eye className="h-4 w-4" /> Xem
                        </button>
                        <button type="button" onClick={handleDownloadFile} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 py-3 text-sm font-extrabold hover:bg-[#f8fafc]">
                          <Download className="h-4 w-4" /> Tải
                        </button>
                        {canManageLeaseContracts && (
                          <button type="button" onClick={() => openUploadDialog(selected)} disabled={selectedWorkflow === "ACTIVE" || actionLoading === "upload"} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 py-3 text-sm font-extrabold hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50">
                            <Upload className="h-4 w-4" /> Thay
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-red-300 bg-white p-5 text-center">
                      <Upload className="mx-auto h-8 w-8 text-red-500" />
                      <p className="mt-2 font-extrabold text-[#091426]">Chưa có file hợp đồng cho phòng {mergedSelected.roomCode}</p>
                      <p className="mt-1 text-sm text-[#607089]">Khách: {mergedSelected.customerName || "Chưa có"} - SĐT: {mergedSelected.phone || "Chưa có"}</p>
                      {canManageLeaseContracts && (
                        <button type="button" onClick={() => openUploadDialog(selected)} disabled={actionLoading === "upload"} className="mt-4 rounded-lg bg-[#091426] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#16253a] disabled:cursor-not-allowed disabled:opacity-60">
                          {actionLoading === "upload" ? "Đang upload..." : "Upload hợp đồng đã ký"}
                        </button>
                      )}
                    </div>
                  )}
                </Section>

                {selectedDetails?.events?.length > 0 && (
                  <Section icon={Clock} title="Lịch sử sự kiện">
                    <div className="space-y-2">
                      {selectedDetails.events.map((event, index) => (
                        <div key={event.id || `${event.eventType}-${event.createdAt}-${index}`} className="rounded-lg bg-white p-3 text-sm">
                          <p className="font-extrabold text-[#091426]">{EVENT_LABELS[event.eventType] || event.eventType}</p>
                          <p className="mt-1 text-[#607089]">{formatDateTime(event.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                <div className="grid gap-3">
                  {canManageLeaseContracts && canCreateDraft && (
                    <button type="button" onClick={() => handleCreateDraftContract()} disabled={actionLoading === "create"} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#16253a] disabled:cursor-not-allowed disabled:opacity-60">
                      <FileText className="h-4 w-4" />
                      {actionLoading === "create" ? "Đang tạo hợp đồng..." : "Tạo hợp đồng thuê từ cọc"}
                    </button>
                  )}
                  {canManageLeaseContracts && selectedWorkflow === "WAITING_ACTIVATE" && (
                    <button type="button" onClick={handleActivate} disabled={actionLoading === "activate"} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                      <CheckCircle2 className="h-4 w-4" />
                      {actionLoading === "activate" ? "Đang kích hoạt..." : "Kích hoạt hợp đồng"}
                    </button>
                  )}
                  {selectedWorkflow === "ACTIVE" && (
                    <button type="button" onClick={handleSendAccount} disabled={actionLoading === "account" || selected.accountProvisioned} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                      <KeyRound className="h-4 w-4" />
                      {selected.accountProvisioned ? "Tài khoản đã được cấp" : actionLoading === "account" ? "Đang gửi tài khoản..." : "Gửi tài khoản cho khách"}
                    </button>
                  )}
                  {canManageLeaseContracts && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canLiquidate) return;
                        setLiquidationDate(new Date().toISOString().slice(0, 10));
                        setLiquidationReason("Khách không tiếp tục thuê phòng.");
                        setLiquidationModalOpen(true);
                      }}
                      disabled={!canLiquidate || actionLoading === "liquidate"}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <AlertTriangle className="h-4 w-4" /> Thanh lý hợp đồng
                    </button>
                  )}
                  <button type="button" disabled className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 py-3 text-sm font-extrabold opacity-60">
                    <RefreshCw className="h-4 w-4" /> Tái ký / Gia hạn
                  </button>
                  <button type="button" disabled className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 py-3 text-sm font-extrabold opacity-60">
                    <Mail className="h-4 w-4" /> Nhắc lịch ký hợp đồng
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm font-bold text-[#607089]">Chọn một dòng để xem chi tiết.</div>
          )}
        </aside>
      </div>

      {liquidationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4">
          <section className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-[#dbe3ef] px-6 py-5">
              <h2 className="text-xl font-extrabold text-[#091426]">Thanh lý hợp đồng thuê</h2>
              <p className="mt-1 text-sm text-[#607089]">
                Hợp đồng phòng {mergedSelected?.roomCode}. Sau khi thanh lý, phòng sẽ được trả về trạng thái trống.
              </p>
            </div>
            <div className="space-y-4 px-6 py-5">
              <label className="block">
                <span className="text-sm font-extrabold text-[#091426]">Ngày thanh lý</span>
                <input type="date" value={liquidationDate} onChange={(event) => setLiquidationDate(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#cbd5e1] px-3 text-sm font-semibold outline-none focus:border-indigo-500" />
              </label>
              <label className="block">
                <span className="text-sm font-extrabold text-[#091426]">Lý do thanh lý</span>
                <textarea value={liquidationReason} onChange={(event) => setLiquidationReason(event.target.value)} rows={4} className="mt-2 w-full rounded-lg border border-[#cbd5e1] px-3 py-3 text-sm font-semibold outline-none focus:border-indigo-500" placeholder="Nhập lý do thanh lý hợp đồng" />
              </label>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Thao tác này kết thúc hợp đồng thuê hiện tại và mở lại phòng cho khách mới.
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-[#dbe3ef] px-6 py-4">
              <button type="button" onClick={() => setLiquidationModalOpen(false)} className="rounded-lg border border-[#cbd5e1] px-5 py-2 text-sm font-extrabold text-[#091426] hover:bg-[#f8fafc]">
                Hủy
              </button>
              <button type="button" onClick={handleLiquidateContract} disabled={actionLoading === "liquidate"} className="rounded-lg bg-red-600 px-5 py-2 text-sm font-extrabold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">
                {actionLoading === "liquidate" ? "Đang thanh lý..." : "Xác nhận thanh lý"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
