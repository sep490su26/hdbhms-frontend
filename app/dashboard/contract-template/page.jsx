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
  Phone,
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
  liquidateLeaseContract,
  openLeaseContractFile,
  uploadSignedLeaseContractFile,
} from "@/services/leaseContractsService";
import { sendTenantAccountCredentials } from "@/services/identityAccessService";

const TABS = [
  ["ALL", "Tất cả"],
  ["WAITING_SIGN", "Chờ ký"],
  ["NO_FILE", "Chưa upload file"],
  ["WAITING_ACTIVATE", "Chờ kích hoạt"],
  ["ACTIVE", "Đang hiệu lực"],
  ["ENDED", "Đã kết thúc"],
];

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

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function workflowLabel(status) {
  switch (status) {
    case "WAITING_SIGN":
      return "Chờ ký";
    case "WAITING_ACTIVATE":
      return "Chờ kích hoạt";
    case "ACTIVE":
      return "Đang hiệu lực";
    case "EXPIRING_SOON":
      return "Sắp hết hạn";
    case "LIQUIDATED":
    case "ENDED":
      return "Đã kết thúc";
    default:
      return "Chờ ký";
  }
}

function workflowClass(status) {
  switch (status) {
    case "WAITING_SIGN":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "WAITING_ACTIVATE":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "EXPIRING_SOON":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    case "LIQUIDATED":
    case "ENDED":
      return "border-slate-200 bg-slate-50 text-slate-600";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function workflowIcon(status) {
  if (status === "ACTIVE") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "WAITING_ACTIVATE") return <Clock className="h-4 w-4" />;
  return <AlertTriangle className="h-4 w-4" />;
}

function getWorkflow(item) {
  if (item?.contractStatus === "ACTIVE") return "ACTIVE";
  if (item?.contractStatus === "LIQUIDATED" || item?.contractStatus === "EXPIRED" || item?.contractStatus === "CANCELLED") {
    return "ENDED";
  }
  return item?.workflowStatus || "WAITING_SIGN";
}

function getContractRowKey(item, index = 0) {
  if (item?.sourceType === "CONTRACT" && item?.contractId) {
    return `contract-${item.contractId}`;
  }
  if (item?.sourceType === "DEPOSIT" && item?.depositAgreementId) {
    return `deposit-${item.depositAgreementId}`;
  }
  if (item?.leaseContractId) {
    return `contract-${item.leaseContractId}`;
  }
  if (item?.contractId) {
    return `contract-${item.contractId}`;
  }
  if (item?.depositAgreementId) {
    return `deposit-${item.depositAgreementId}`;
  }
  if (item?.id) {
    return `item-${item.id}`;
  }
  if (item?.displayCode) {
    return `code-${item.displayCode}`;
  }
  if (item?.code) {
    return `code-${item.code}`;
  }
  if (item?.contractCode) {
    return `contract-code-${item.contractCode}`;
  }
  if (item?.depositCode) {
    return `deposit-code-${item.depositCode}`;
  }
  return `row-${index}`;
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

function Badge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${workflowClass(status)}`}>
      {workflowIcon(status)}
      {workflowLabel(status)}
    </span>
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
  const fileInputRef = useRef(null);
  const [contracts, setContracts] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
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

  const summary = useMemo(() => {
    return {
      total: contracts.length,
      waitingSign: contracts.filter((item) => getWorkflow(item) === "WAITING_SIGN").length,
      waitingActivate: contracts.filter((item) => getWorkflow(item) === "WAITING_ACTIVATE").length,
      active: contracts.filter((item) => getWorkflow(item) === "ACTIVE").length,
      missingFile: contracts.filter((item) => !item.contractFileId).length,
    };
  }, [contracts]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectRow(item, index) {
    setSelectedKey(getContractRowKey(item, index));
    setNotice("");
    setError("");
  }

  function openUploadDialog() {
    if (!selected) return;
    fileInputRef.current?.click();
  }

  async function handleCreateDraftContract(target = selected) {
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
    if (!file || !selected) return;

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
      const updated = await uploadSignedLeaseContractFile(selected, file);
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
    if (!selected?.leaseContractId) {
      setError("Vui lòng upload file hợp đồng để tạo hợp đồng thuê trước khi kích hoạt.");
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
      setNotice(`Đã kích hoạt hợp đồng phòng ${updated.roomCode}. Phòng chuyển sang Đang thuê.`);
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
      setError("Chỉ gửi tài khoản sau khi hợp đồng đã đang hiệu lực.");
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
      setNotice(`Đã gửi tài khoản đăng nhập cho ${selected.customerName}.`);
    } catch (accountError) {
      setError(accountError.message || "Không thể gửi tài khoản cho khách.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleViewFile() {
    if (!selected?.contractFileId) {
      setError("Hợp đồng chưa có file để xem.");
      return;
    }
    setError("");
    try {
      await openLeaseContractFile(selected.contractFileId);
    } catch (viewError) {
      setError(viewError.message || "Không thể mở file hợp đồng.");
    }
  }

  async function handleDownloadFile() {
    if (!selected?.contractFileId) {
      setError("Hợp đồng chưa có file để tải.");
      return;
    }
    setError("");
    try {
      await downloadLeaseContractFile(selected.contractFileId, selected.contractFileName || `hop-dong-${selected.roomCode}.pdf`);
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
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleUploadFile}
      />

      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.01em] text-[#091426]">Quản lý hợp đồng thuê</h1>
          <p className="mt-2 text-sm leading-6 text-[#505f76]">
            Upload hợp đồng đã ký sau đặt cọc, kích hoạt hợp đồng thuê và gửi tài khoản mobile cho khách.
          </p>
        </div>
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
              placeholder="Tìm mã cọc/mã HĐ, phòng, tên khách hoặc SĐT"
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

      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        <section className="overflow-hidden rounded-xl border border-[#dbe3ef] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.08)]">
          <div className="border-b border-[#dbe3ef] px-6 py-5">
            <h2 className="text-lg font-extrabold text-[#091426]">Danh sách chờ ký / hợp đồng</h2>
            <p className="mt-1 text-sm text-[#607089]">Dữ liệu lấy từ hợp đồng cọc đã thanh toán và hợp đồng thuê hiện có.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left">
              <thead className="bg-[#f3f6fb] text-xs font-extrabold uppercase tracking-wide text-[#607089]">
                <tr>
                  <th className="px-6 py-4">Mã</th>
                  <th className="px-6 py-4">Phòng</th>
                  <th className="px-6 py-4">Khách</th>
                  <th className="px-6 py-4">SĐT</th>
                  <th className="px-6 py-4">Ngày ký dự kiến</th>
                  <th className="px-6 py-4">Ngày vào ở</th>
                  <th className="px-6 py-4">File</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7edf5]">
                {loading && (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-sm font-bold text-[#607089]">
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
                      <td className="px-6 py-5 align-middle">
                        <div className="font-extrabold text-[#091426]">{item.code || item.contractCode || item.depositCode}</div>
                        <div className="mt-1 text-xs text-[#607089]">{item.contractCode || "Từ đặt cọc"}</div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="inline-flex items-center gap-2 rounded-lg bg-[#091426] px-3 py-2 font-extrabold text-white">
                          <Home className="h-4 w-4" />
                          {item.roomCode}
                        </div>
                        <div className="mt-1 text-xs text-[#607089]">{item.propertyName}</div>
                      </td>
                      <td className="px-6 py-5 align-middle font-bold text-[#091426]">{item.customerName || "Chưa có"}</td>
                      <td className="px-6 py-5 align-middle">
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#091426]">
                          <Phone className="h-4 w-4 text-[#8a98af]" />
                          {item.phone || "Chưa có"}
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle text-sm font-semibold text-[#091426]">
                        {formatDate(item.expectedLeaseSignDate)}
                      </td>
                      <td className="px-6 py-5 align-middle text-sm font-semibold text-[#091426]">
                        {formatDate(item.expectedMoveInDate || item.startDate)}
                      </td>
                      <td className="px-6 py-5 align-middle">
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
                      <td className="px-6 py-5 align-middle">
                        <Badge status={workflow} />
                      </td>
                      <td className="px-6 py-5 text-right align-middle">
                        {!item.contractFileId ? (
                          <div className="inline-flex flex-col gap-2 sm:flex-row">
                            {!item.leaseContractId && (
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
                                setTimeout(openUploadDialog, 0);
                              }}
                              className="rounded-lg bg-[#091426] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#16253a]"
                            >
                              Upload PDF
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              selectRow(item, index);
                            }}
                            className="rounded-lg border border-[#cbd5e1] px-4 py-2 text-sm font-extrabold text-[#091426] hover:bg-[#f8fafc]"
                          >
                            Chi tiết
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!loading && filteredContracts.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-sm font-bold text-[#607089]">
                      Không có hợp đồng thuê phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="overflow-hidden rounded-xl border border-[#dbe3ef] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.08)]">
          {selected ? (
            <>
              <div className="border-b border-[#dbe3ef] bg-[#050b1d] px-6 py-6 text-white">
                <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-300">Chi tiết upload hợp đồng</div>
                <h2 className="mt-3 text-2xl font-extrabold">Phòng {selected.roomCode} - {selected.customerName || "Khách thuê"}</h2>
                <div className="mt-3">
                  <Badge status={selectedWorkflow} />
                </div>
              </div>

              <div className="space-y-5 p-6">
                <Section icon={Home} title="Phòng cần upload">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <InfoItem label="Cơ sở" value={selected.propertyName} />
                    <InfoItem label="Phòng" value={selected.roomCode} strong />
                    <InfoItem label="Room status" value={selected.roomStatus} />
                    <InfoItem label="Mã" value={selected.code || selected.contractCode || selected.depositCode} />
                  </div>
                </Section>

                <Section icon={Users} title="Khách ký hợp đồng">
                  <div className="space-y-3 text-sm">
                    <div className="rounded-lg bg-white p-3">
                      <InfoItem label="Tên khách" value={selected.customerName} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-white p-3">
                        <InfoItem label="SĐT" value={selected.phone} />
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <InfoItem label="Email" value={selected.email || "Chưa có"} />
                      </div>
                    </div>
                  </div>
                </Section>

                <Section icon={CalendarDays} title="Lịch ký và vào ở">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <InfoItem label="Ngày ký dự kiến" value={formatDate(selected.expectedLeaseSignDate)} />
                    <InfoItem label="Ngày vào ở dự kiến" value={formatDate(selected.expectedMoveInDate || selected.startDate)} />
                    <InfoItem label="Giá thuê" value={formatMoney(selected.monthlyRent)} />
                    <InfoItem label="Tiền cọc" value={formatMoney(selected.depositAmount)} />
                  </div>
                </Section>

                <Section icon={FileText} title="File hợp đồng đã ký">
                  {selected.contractFileId ? (
                    <div className="rounded-lg bg-white p-4">
                      <p className="font-extrabold text-[#091426]">{selected.contractFileName || `hop-dong-${selected.roomCode}`}</p>
                      <p className="mt-1 text-sm text-[#607089]">Upload: {formatDate(selected.contractFileUploadedAt)}</p>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={handleViewFile}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 py-3 text-sm font-extrabold hover:bg-[#f8fafc]"
                        >
                          <Eye className="h-4 w-4" />
                          Xem
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadFile}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 py-3 text-sm font-extrabold hover:bg-[#f8fafc]"
                        >
                          <Download className="h-4 w-4" />
                          Tải
                        </button>
                        <button
                          type="button"
                          onClick={openUploadDialog}
                          disabled={selectedWorkflow === "ACTIVE" || actionLoading === "upload"}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] px-3 py-3 text-sm font-extrabold hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Upload className="h-4 w-4" />
                          Thay
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-red-300 bg-white p-5 text-center">
                      <Upload className="mx-auto h-8 w-8 text-red-500" />
                      <p className="mt-2 font-extrabold text-[#091426]">
                        Chưa có file hợp đồng cho phòng {selected.roomCode}
                      </p>
                      <p className="mt-1 text-sm text-[#607089]">
                        Khách: {selected.customerName || "Chưa có"} - SĐT: {selected.phone || "Chưa có"}
                      </p>
                      <button
                        type="button"
                        onClick={openUploadDialog}
                        disabled={actionLoading === "upload"}
                        className="mt-4 rounded-lg bg-[#091426] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#16253a] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoading === "upload" ? "Đang upload..." : "Upload hợp đồng đã ký"}
                      </button>
                    </div>
                  )}
                </Section>

                <div className="grid gap-3">
                  {canCreateDraft && (
                    <button
                      type="button"
                      onClick={() => handleCreateDraftContract()}
                      disabled={actionLoading === "create"}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#16253a] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FileText className="h-4 w-4" />
                      {actionLoading === "create" ? "Đang tạo hợp đồng..." : "Tạo hợp đồng thuê từ cọc"}
                    </button>
                  )}

                  {selectedWorkflow === "WAITING_ACTIVATE" && (
                    <button
                      type="button"
                      onClick={handleActivate}
                      disabled={actionLoading === "activate"}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {actionLoading === "activate" ? "Đang kích hoạt..." : "Kích hoạt hợp đồng"}
                    </button>
                  )}

                  {selectedWorkflow === "ACTIVE" && (
                    <button
                      type="button"
                      onClick={handleSendAccount}
                      disabled={actionLoading === "account" || selected.accountProvisioned}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <KeyRound className="h-4 w-4" />
                      {selected.accountProvisioned ? "Tài khoản đã được cấp" : actionLoading === "account" ? "Đang gửi tài khoản..." : "Gửi tài khoản cho khách"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (!canLiquidate) return;
                      setLiquidationDate(new Date().toISOString().slice(0, 10));
                      setLiquidationReason("Khách không tiếp tục thuê phòng.");
                      setLiquidationModalOpen(true);
                    }}
                    disabled={!canLiquidate || actionLoading === "liquidate"}
                    title={
                      canLiquidate
                        ? "Thanh lý hợp đồng đang hiệu lực và trả phòng về trạng thái trống."
                        : "Chỉ thanh lý được hợp đồng đang hiệu lực, sắp hết hạn hoặc đang chờ kết thúc."
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Thanh lý hợp đồng
                  </button>

                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 py-3 text-sm font-extrabold opacity-60"
                    title="Tái ký/Gia hạn sẽ làm ở nghiệp vụ hợp đồng thuê riêng."
                  >
                    <RefreshCw className="h-4 w-4" />
                    Tái ký / Gia hạn
                  </button>
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 py-3 text-sm font-extrabold opacity-60"
                    title="Nhắc lịch ký hợp đồng sẽ làm sau khi có kịch bản gửi email/SMS."
                  >
                    <Mail className="h-4 w-4" />
                    Nhắc lịch ký hợp đồng
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm font-bold text-[#607089]">
              Chọn một dòng để xem chi tiết.
            </div>
          )}
        </aside>
      </div>

      {liquidationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4">
          <section className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-[#dbe3ef] px-6 py-5">
              <h2 className="text-xl font-extrabold text-[#091426]">Thanh lý hợp đồng thuê</h2>
              <p className="mt-1 text-sm text-[#607089]">
                Hợp đồng phòng {selected?.roomCode}. Sau khi thanh lý, phòng sẽ được trả về trạng thái trống.
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <label className="block">
                <span className="text-sm font-extrabold text-[#091426]">Ngày thanh lý</span>
                <input
                  type="date"
                  value={liquidationDate}
                  onChange={(event) => setLiquidationDate(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-[#cbd5e1] px-3 text-sm font-semibold outline-none focus:border-indigo-500"
                />
              </label>

              <label className="block">
                <span className="text-sm font-extrabold text-[#091426]">Lý do thanh lý</span>
                <textarea
                  value={liquidationReason}
                  onChange={(event) => setLiquidationReason(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-[#cbd5e1] px-3 py-3 text-sm font-semibold outline-none focus:border-indigo-500"
                  placeholder="Nhập lý do thanh lý hợp đồng"
                />
              </label>

              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Thao tác này kết thúc hợp đồng thuê hiện tại và mở lại phòng cho khách mới.
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[#dbe3ef] px-6 py-4">
              <button
                type="button"
                onClick={() => setLiquidationModalOpen(false)}
                className="rounded-lg border border-[#cbd5e1] px-5 py-2 text-sm font-extrabold text-[#091426] hover:bg-[#f8fafc]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleLiquidateContract}
                disabled={actionLoading === "liquidate"}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-extrabold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading === "liquidate" ? "Đang thanh lý..." : "Xác nhận thanh lý"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
