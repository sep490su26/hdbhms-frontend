import { useState, useRef, useEffect } from "react";
import {
  Download,
  Upload,
  CheckCircle2,
  FileText,
  AlertCircle,
  Loader2,
  ClipboardEdit,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { downloadLeaseContractDraftPdf, uploadSignedLeaseContractFile } from "@/services/leaseContractsService";
import { downloadHandoverDraftPdf, uploadHandoverSignedDocument, fetchContractHandover } from "@/services/contractHandoverService";
import { downloadDepositContractPdf, uploadSignedDepositContractFile, openDepositContractPdf } from "@/services/depositContractsService";
import { toast } from "sonner";

function unwrapHandoverResponse(response) {
  return response?.data || response || null;
}

function hasSignedHandoverDocument(handover) {
  return Boolean(handover?.signedDocumentId || handover?.signed_document_id);
}

export default function ContractWorkflowStepper({ contractDetails, refreshKey = 0, onContractUpdated, onRequestShowHandover, onActivate, leaseVersion = 0, isActivating = false }) {
  const fileInputRef0 = useRef(null);
  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);
  const [loadingStep, setLoadingStep] = useState(null);
  const [handoverData, setHandoverData] = useState(null);
  const [handoverLoading, setHandoverLoading] = useState(true);

  // After a lease re-upload, the backend still holds the old handover
  // record. We track which leaseVersion the handover was last confirmed
  // against. Steps 3–5 are only "done" when this matches the current
  // leaseVersion, forcing the user to re-confirm after a lease change.
  const [confirmedLeaseVersion, setConfirmedLeaseVersion] = useState(0);
  const prevLeaseVersionRef = useRef(0);
  // Track refreshKey changes so the load effect can distinguish a
  // handover-save trigger (refreshKey bumped) from other triggers.
  const prevRefreshKeyRef = useRef(0);
  // True only on the very first render, used to auto-confirm handover
  // when opening a contract that was already completed before.
  const isInitialMountRef = useRef(true);

  const contractId = contractDetails?.contractId || contractDetails?.leaseContractId;
  const depositAgreementId = contractDetails?.depositAgreementId;
  const currentFileId = contractDetails?.contractFileId ?? null;
  const depositSignedFileId = contractDetails?.depositSignedFileId ?? contractDetails?.deposit_signed_file_id ?? null;
  const step0Done = !!depositSignedFileId;
  const step1Done = !!depositSignedFileId;
  const step2Done = !!currentFileId;
  const step3Done = Boolean(handoverData?.electricity && handoverData?.water) && confirmedLeaseVersion === leaseVersion;
  const step5Done = hasSignedHandoverDocument(handoverData) && confirmedLeaseVersion === leaseVersion;

  // Debug logging
  console.log("[ContractWorkflowStepper] Contract details:", {
    contractId,
    depositAgreementId,
    hasDeposit: !!depositAgreementId,
    depositSignedFileId,
    step0Done,
    step1Done,
    step2Done,
  });

  // Reset confirmed version when the lease version changes (re-upload).
  useEffect(() => {
    if (leaseVersion > 0 && leaseVersion !== prevLeaseVersionRef.current) {
      setConfirmedLeaseVersion(0);
      setHandoverData(null);
      toast.info("Hợp đồng đã thay đổi — vui lòng xác nhận lại bàn giao phòng.");
    }
    prevLeaseVersionRef.current = leaseVersion;
  }, [leaseVersion]);

  useEffect(() => {
    let ignore = false;
    const wasSaveTriggered = refreshKey > prevRefreshKeyRef.current;
    prevRefreshKeyRef.current = refreshKey;

    async function loadHandover() {
      if (!contractId) return;
      setHandoverLoading(true);
      try {
        const data = await fetchContractHandover(contractId, "MOVE_IN");
        if (!ignore) {
          setHandoverData(unwrapHandoverResponse(data));
          // When the load was triggered by a handover save (refreshKey
          // bump), confirm the current leaseVersion so steps 3–5 show done.
          if (wasSaveTriggered) {
            setConfirmedLeaseVersion(leaseVersion);
          }
          // On initial mount with existing handover data, auto-confirm
          // so previously-completed contracts show the correct state.
          if (isInitialMountRef.current) {
            isInitialMountRef.current = false;
            const h = unwrapHandoverResponse(data);
            if (h?.electricity && h?.water) {
              setConfirmedLeaseVersion(leaseVersion);
            }
          }
        }
      } catch (err) {
        if (!ignore) {
          setHandoverData(null);
          if (isInitialMountRef.current) isInitialMountRef.current = false;
        }
      } finally {
        if (!ignore) setHandoverLoading(false);
      }
    }
    loadHandover();
    return () => { ignore = true; };
  }, [contractId, refreshKey, currentFileId, leaseVersion]);

  const handlePrintDeposit = async () => {
    console.log("[ContractWorkflowStepper] handlePrintDeposit called", { depositAgreementId, contractDetails });
    if (!depositAgreementId) {
      toast.error("Hợp đồng này không có mã hợp đồng đặt cọc. Vui lòng tạo hợp đồng thuê từ hợp đồng đặt cọc trước.");
      console.error("[ContractWorkflowStepper] depositAgreementId is missing for Step 0");
      return;
    }
    console.log("[ContractWorkflowStepper] Opening deposit contract PDF from backend:", depositAgreementId);
    try {
      setLoadingStep(0);
      await openDepositContractPdf(depositAgreementId);
      toast.success("Đã mở PDF hợp đồng đặt cọc. Vui lòng in và ký.");
    } catch (err) {
      console.error("[ContractWorkflowStepper] Open deposit PDF error:", err);
      toast.error(err.message || "Lỗi tải PDF hợp đồng đặt cọc");
    } finally {
      setLoadingStep(null);
    }
  };

  const handleUploadDeposit = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!depositAgreementId) {
      toast.error("Không tìm thấy mã hợp đồng đặt cọc. Vui lòng đảm bảo hợp đồng này được tạo từ hợp đồng đặt cọc.");
      console.error("[ContractWorkflowStepper] depositAgreementId is missing:", contractDetails);
      return;
    }
    console.log("[ContractWorkflowStepper] Uploading deposit contract:", { depositAgreementId, fileName: file.name });
    try {
      setLoadingStep(1);
      await uploadSignedDepositContractFile(depositAgreementId, file);
      toast.success("Upload hợp đồng đặt cọc đã ký thành công.");
      onContractUpdated();
    } catch (err) {
      console.error("[ContractWorkflowStepper] Upload deposit error:", err);
      toast.error(err.message || "Lỗi upload file hợp đồng đặt cọc");
    } finally {
      setLoadingStep(null);
      if (fileInputRef0.current) fileInputRef0.current.value = "";
    }
  };

  const handlePrintLease = async () => {
    try {
      setLoadingStep(2);
      await downloadLeaseContractDraftPdf(contractId);
      toast.success("Tải xuống PDF hợp đồng thuê thành công. Vui lòng in và ký.");
    } catch (err) {
      toast.error(err.message || "Lỗi tải PDF hợp đồng");
    } finally {
      setLoadingStep(null);
    }
  };

  const handleUploadLease = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoadingStep(3);
      await uploadSignedLeaseContractFile(contractDetails, file);
      toast.success("Upload hợp đồng thuê đã ký thành công.");
      onContractUpdated();
    } catch (err) {
      toast.error(err.message || "Lỗi upload file hợp đồng");
    } finally {
      setLoadingStep(null);
      if (fileInputRef1.current) fileInputRef1.current.value = "";
    }
  };

  const handlePrintHandover = async () => {
    try {
      setLoadingStep(4);
      await downloadHandoverDraftPdf(contractId, "MOVE_IN");
      toast.success("Tải xuống PDF biên bản bàn giao thành công. Vui lòng in và ký.");
    } catch (err) {
      toast.error(err.message || "Lỗi tải PDF bàn giao. Có thể bạn chưa hoàn thành nhập chỉ số điện nước.");
    } finally {
      setLoadingStep(null);
    }
  };

  const handleUploadHandover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoadingStep(5);
      await uploadHandoverSignedDocument(contractId, file, "MOVE_IN");
      toast.success("Upload biên bản bàn giao đã ký thành công.");
      const data = await fetchContractHandover(contractId, "MOVE_IN");
      setHandoverData(unwrapHandoverResponse(data));
      setConfirmedLeaseVersion(leaseVersion);
      onContractUpdated();
    } catch (err) {
      toast.error(err.message || "Lỗi upload biên bản bàn giao");
    } finally {
      setLoadingStep(null);
      if (fileInputRef2.current) fileInputRef2.current.value = "";
    }
  };

  // Static step metadata — no refs or handlers, safe to define outside render.
  // Phase 1 (Steps 0-1) only shows if depositAgreementId exists
  const hasDeposit = !!depositAgreementId;
  const STEP_META = hasDeposit ? [
    { num: 0, phase: "deposit", title: "Cấp HĐ đặt cọc", desc: "Tải file PDF hợp đồng đặt cọc nháp để in và ký", accent: "amber" },
    { num: 1, phase: "deposit", title: "Ký HĐ đặt cọc", desc: "Upload bản scan hợp đồng đặt cọc có chữ ký", accent: "amber" },
    { num: 2, phase: "contract", title: "Cấp HĐ thuê", desc: "Tải file PDF hợp đồng thuê nháp để in và ký", accent: "blue" },
    { num: 3, phase: "contract", title: "Ký HĐ thuê", desc: "Upload bản scan hợp đồng thuê có chữ ký", accent: "blue" },
    { num: 4, phase: "handover", title: "Nhập bàn giao", desc: "Nhập chỉ số điện, nước & hiện trạng thiết bị", accent: "indigo" },
    { num: 5, phase: "handover", title: "Cấp BB bàn giao", desc: "Tải file PDF biên bản bàn giao phòng", accent: "indigo" },
    { num: 6, phase: "handover", title: "Ký BB bàn giao", desc: "Upload biên bản bàn giao có chữ ký", accent: "indigo" },
  ] : [
    { num: 2, phase: "contract", title: "Cấp HĐ thuê", desc: "Tải file PDF hợp đồng thuê nháp để in và ký", accent: "blue" },
    { num: 3, phase: "contract", title: "Ký HĐ thuê", desc: "Upload bản scan hợp đồng thuê có chữ ký", accent: "blue" },
    { num: 4, phase: "handover", title: "Nhập bàn giao", desc: "Nhập chỉ số điện, nước & hiện trạng thiết bị", accent: "indigo" },
    { num: 5, phase: "handover", title: "Cấp BB bàn giao", desc: "Tải file PDF biên bản bàn giao phòng", accent: "indigo" },
    { num: 6, phase: "handover", title: "Ký BB bàn giao", desc: "Upload biên bản bàn giao có chữ ký", accent: "indigo" },
  ];

  function getStepState(num) {
    switch (num) {
      case 0: return { done: step0Done, disabled: loadingStep != null, loading: loadingStep === 0, actionLabel: "Tải HĐ cọc", icon: <Download className="w-4 h-4" /> };
      case 1: return { done: step1Done, disabled: loadingStep != null, loading: loadingStep === 1, actionLabel: step1Done ? "Upload lại HĐ cọc" : "Upload HĐ cọc ký", icon: <Upload className="w-4 h-4" /> };
      case 2: return { done: step2Done, disabled: !step1Done, loading: loadingStep === 2, actionLabel: "Tải HĐ thuê", icon: <Download className="w-4 h-4" /> };
      case 3: return { done: step2Done, disabled: !step1Done || loadingStep != null, loading: loadingStep === 3, actionLabel: step2Done ? "Upload lại HĐ thuê" : "Upload HĐ thuê ký", icon: <Upload className="w-4 h-4" /> };
      case 4: return { done: step3Done, disabled: !step2Done, loading: false, actionLabel: step3Done ? "Sửa thông tin" : "Nhập thông tin", icon: <ClipboardEdit className="w-4 h-4" /> };
      case 5: return { done: step5Done, disabled: loadingStep != null || !step3Done, loading: loadingStep === 4, actionLabel: "Tải bàn giao", icon: <Download className="w-4 h-4" /> };
      case 6: return { done: step5Done, disabled: loadingStep != null || !step3Done, loading: loadingStep === 5, actionLabel: step5Done ? "Upload lại BB" : "Upload BB ký", icon: <Upload className="w-4 h-4" /> };
      default: return {};
    }
  }

  function handleStepClick(num) {
    console.log(`[ContractWorkflowStepper] Step ${num} clicked`, { depositAgreementId, contractId });
    switch (num) {
      case 0:
        if (!depositAgreementId) return;
        return handlePrintDeposit();
      case 1: {
        if (!depositAgreementId) return;
        console.log("[ContractWorkflowStepper] Triggering file input for deposit upload");
        fileInputRef0.current?.click();
        break;
      }
      case 2: return handlePrintLease();
      case 3: return fileInputRef1.current?.click();
      case 4:
        if (onRequestShowHandover) onRequestShowHandover();
        setTimeout(() => {
          const el = document.getElementById("handover-entry-section");
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      case 5: return handlePrintHandover();
      case 6: return fileInputRef2.current?.click();
      default: return;
    }
  }

  const completedCount = STEP_META.filter((m) => getStepState(m.num).done).length;
  const progressPercent = Math.round((completedCount / STEP_META.length) * 100);
  // All required steps done (skip deposit steps if no deposit)
  const allDone = hasDeposit 
    ? step0Done && step1Done && step2Done && step5Done
    : step2Done && step5Done;
  const stepsGridClass = hasDeposit ? "md:grid-cols-7" : "md:grid-cols-5";
  const phaseGridClass = hasDeposit ? "md:grid-cols-[1fr_1fr_1.5fr]" : "md:grid-cols-[1fr_1.5fr]";
  const phaseLabels = {
    deposit: "Hợp đồng đặt cọc",
    contract: "Hợp đồng thuê",
    handover: "Bàn giao phòng",
  };
  const phaseStyles = {
    deposit: { dot: "bg-amber-600", text: "text-amber-700" },
    contract: { dot: "bg-blue-600", text: "text-blue-700" },
    handover: { dot: "bg-indigo-600", text: "text-indigo-700" },
  };
  const phaseBands = STEP_META.reduce((bands, step, index) => {
    const displayStep = index + 1;
    const last = bands[bands.length - 1];
    if (last?.phase === step.phase) {
      last.end = displayStep;
      return bands;
    }
    return [...bands, { phase: step.phase, start: displayStep, end: displayStep }];
  }, []);
  const phaseEndIndexes = new Set(phaseBands.slice(0, -1).map((band) => band.end - 1));

  const accentStyles = {
    amber: {
      ring: "ring-amber-500/20",
      circle: "bg-amber-600",
      circleLight: "bg-amber-50 text-amber-700",
      btn: "bg-amber-600 hover:bg-amber-700 text-white",
      btnDone: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
      tag: "bg-amber-600",
    },
    blue: {
      ring: "ring-blue-500/20",
      circle: "bg-blue-600",
      circleLight: "bg-blue-50 text-blue-700",
      btn: "bg-blue-600 hover:bg-blue-700 text-white",
      btnDone: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
      tag: "bg-blue-600",
    },
    indigo: {
      ring: "ring-indigo-500/20",
      circle: "bg-indigo-600",
      circleLight: "bg-indigo-50 text-indigo-700",
      btn: "bg-indigo-600 hover:bg-indigo-700 text-white",
      btnDone: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
      tag: "bg-indigo-600",
    },
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/60 to-white shadow-sm mb-6 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex flex-col gap-5 border-b border-slate-100 bg-white px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex items-center gap-3.5">
          <div className={`grid h-10 w-10 place-items-center rounded-xl shadow-sm transition-colors ${allDone ? "bg-emerald-600" : "bg-slate-900"}`}>
            {allDone
              ? <ShieldCheck className="h-5 w-5 text-white" />
              : <FileText className="h-5 w-5 text-white" />
            }
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 md:text-lg">
              Quy trình kích hoạt & Bàn giao
            </h2>
            <p className="text-sm text-slate-500">
              Hoàn thành {hasDeposit ? '7' : '5'} bước để kích hoạt hợp đồng và đưa khách vào ở.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress pill */}
          <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5">
            <span className="text-xs font-bold text-slate-500">Tiến độ</span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${allDone ? "bg-emerald-500" : "bg-blue-600"}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className={`text-xs font-extrabold ${allDone ? "text-emerald-600" : "text-slate-700"}`}>
              {completedCount}/{STEP_META.length}
            </span>
          </div>

          {/* Activate button — only shown when stepper is visible */}
          {(() => {
            // All steps done → activate
            if (allDone) {
              return (
                <button
                  onClick={onActivate}
                  disabled={isActivating || handoverLoading}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-60 disabled:shadow-none"
                >
                  {isActivating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {isActivating ? "Đang kích hoạt..." : "Kích hoạt & Cấp tài khoản"}
                </button>
              );
            }

            // Steps incomplete → disabled with progress
            return (
              <button
                disabled
                className="flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-extrabold text-slate-400 cursor-not-allowed"
              >
                <Zap className="h-4 w-4 opacity-40" />
                Kích hoạt hợp đồng ({completedCount}/{STEP_META.length})
              </button>
            );
          })()}
        </div>
      </div>

      {/* ── Phase labels ── */}
      <div className={`hidden md:grid ${phaseGridClass} gap-0 border-b border-slate-100 bg-white px-8`}>
        {phaseBands.map((band, index) => {
          const styles = phaseStyles[band.phase];
          const rangeLabel = band.start === band.end
            ? `Bước ${band.start}`
            : `Bước ${band.start} - ${band.end}`;
          return (
            <div
              key={band.phase}
              className={`flex items-center gap-2 py-3 ${index === 0 ? "pr-4" : "border-l border-slate-200 pl-6"}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
              <span className={`text-[11px] font-extrabold uppercase tracking-widest ${styles.text}`}>
                {phaseLabels[band.phase]}
              </span>
              <span className="ml-auto text-[11px] font-bold text-slate-400">{rangeLabel}</span>
            </div>
          );
        })}
      </div>

      {/* ── Steps ── */}
      <div className="relative px-4 py-6 md:px-8 md:py-8">
        {/* Connector track (desktop) */}
        <div className="absolute left-8 right-8 top-1/2 hidden h-0.5 -translate-y-1/2 md:block">
          <div className="h-full rounded-full bg-slate-200" />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className={`grid grid-cols-1 gap-4 ${stepsGridClass} md:gap-3 relative z-10`}>
          {STEP_META.map((meta, idx) => {
            const accent = accentStyles[meta.accent];
            const state = getStepState(meta.num);
            const displayStepNumber = idx + 1;
            const isLastInPhase = phaseEndIndexes.has(idx);
            return (
              <div
                key={meta.num}
                className={`relative rounded-xl border bg-white p-4 flex flex-col transition-all duration-200 ${
                  state.done
                    ? "border-emerald-300 shadow-[0_0_0_3px_rgba(16,185,129,0.08)]"
                    : state.disabled
                      ? "border-slate-100 opacity-60"
                      : "border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
                } ${isLastInPhase ? "md:mr-2" : ""}`}
              >
                {/* Step circle + title */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold transition-colors ${
                      state.done
                        ? `${accent.circle} text-white ring-4 ring-emerald-100`
                        : state.disabled
                          ? "bg-slate-100 text-slate-400"
                          : `${accent.circleLight} ring-4 ${accent.ring}`
                    }`}
                  >
                    {state.done ? <CheckCircle2 className="h-5 w-5" /> : displayStepNumber}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-sm font-extrabold leading-tight ${state.done ? "text-emerald-800" : "text-slate-800"}`}>
                      {meta.title}
                    </h3>
                    <p className="text-[11px] leading-snug text-slate-500 mt-0.5 line-clamp-2">
                      {meta.desc}
                    </p>
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => handleStepClick(meta.num)}
                  disabled={state.disabled}
                  className={`mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-extrabold transition-all ${
                    state.done
                      ? `border ${accent.btnDone}`
                      : state.disabled
                        ? "cursor-not-allowed bg-slate-50 text-slate-300"
                        : `${accent.btn} shadow-sm`
                  }`}
                >
                  {state.loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : state.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    state.icon
                  )}
                  <span className="truncate">{state.actionLabel}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Hidden file inputs (rendered in JSX, not referenced during render) */}
        <input type="file" className="hidden" ref={fileInputRef0} accept="application/pdf,image/*" onChange={handleUploadDeposit} />
        <input type="file" className="hidden" ref={fileInputRef1} accept="application/pdf,image/*" onChange={handleUploadLease} />
        <input type="file" className="hidden" ref={fileInputRef2} accept="application/pdf,image/*" onChange={handleUploadHandover} />
      </div>

      {/* ── Footer note ── */}
      {!allDone && (
        <div className="mx-4 mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 md:mx-8 md:mb-6">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-xs leading-relaxed text-amber-800">
            <p className="font-bold mb-1">Lưu ý</p>
            <ul className="list-disc space-y-0.5 pl-4 text-amber-700/90">
              {hasDeposit && (
                <li>In và ký hợp đồng đặt cọc trước, sau đó upload file đã ký.</li>
              )}
              <li>Chỉnh sửa nội dung hợp đồng thuê ở phần thông tin chi tiết trước khi tải PDF.</li>
              <li>Nhập chỉ số điện/nước ở phần Bàn Giao Phòng bên dưới trước khi tải và ký PDF biên bản bàn giao.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
