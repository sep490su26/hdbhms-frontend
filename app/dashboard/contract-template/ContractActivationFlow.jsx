"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import ContractHandoverSection from "./ContractHandoverSection";
import ContractWorkflowStepper from "./ContractWorkflowStepper";

export default function ContractActivationFlow({
  contract,
  actionLoading = "",
  handoverRefreshKey = 0,
  onCreateDraft,
  onContractUpdated,
  onHandoverSaved,
  onActivate,
  onReadinessChange,
}) {
  const contractId = contract?.leaseContractId || contract?.contractId;
  const leaseSignedFileId = contract?.signedFileId ?? contract?.signed_file_id ?? null;
  const creatingDraft = actionLoading === `draft-${contract?.depositAgreementId}`;

  const [activeView, setActiveView] = useState("workflow");

  // Incremented every time the signed lease file changes (re-upload).
  // The stepper uses this to invalidate handover completion state,
  // forcing the user to re-confirm steps 3–5 after a lease change.
  const [leaseVersion, setLeaseVersion] = useState(0);
  const prevFileIdRef = useRef(null);

  // Auto-create draft lease contract when entering activation flow without one
  const draftCreatedRef = useRef(false);
  useEffect(() => {
    if (!contractId && contract?.depositAgreementId && !draftCreatedRef.current && !creatingDraft) {
      draftCreatedRef.current = true;
      onCreateDraft?.(contract);
    }
  }, [contractId, contract?.depositAgreementId, creatingDraft, onCreateDraft, contract]);

  useEffect(() => {
    const prev = prevFileIdRef.current;
    if (prev != null && leaseSignedFileId != null && prev !== leaseSignedFileId) {
      setLeaseVersion((v) => v + 1);
    }
    prevFileIdRef.current = leaseSignedFileId;
  }, [leaseSignedFileId]);

  function handleRequestShowHandover() {
    setActiveView("handover");
  }

  function handleBackToWorkflow() {
    setActiveView("workflow");
  }

  function handleHandoverSaved() {
    onHandoverSaved?.();
    setActiveView("workflow");
  }

  useEffect(() => {
    document
      .getElementById("contract-detail-dialog")
      ?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeView]);

  return (
    <div className="lg:col-span-2">
      {contractId ? (
        activeView === "workflow" ? (
          <ContractWorkflowStepper
            contractDetails={contract}
            refreshKey={handoverRefreshKey}
            onContractUpdated={onContractUpdated}
            onRequestShowHandover={handleRequestShowHandover}
            onActivate={onActivate}
            onReadinessChange={onReadinessChange}
            leaseVersion={leaseVersion}
            isActivating={actionLoading === `activate-${contractId}`}
          />
        ) : (
          <div className="bg-[#f7f8fb] p-4 dark:bg-[#081225] sm:p-6">
            <section className="mb-4 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-[#0d182c] sm:flex-row sm:px-5">
              <div>
                <button
                  type="button"
                  onClick={handleBackToWorkflow}
                  className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-blue-700 hover:text-blue-800 dark:text-blue-300"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Quay lại hồ sơ
                </button>
                <h2 className="mt-2 text-xl font-extrabold tracking-[-0.025em] text-slate-950 dark:text-white">
                  Nhập thông tin bàn giao
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Chốt số đo đầu vào và xác nhận hiện trạng thiết bị. Dữ liệu
                  này sẽ được đưa vào biên bản bàn giao.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                Phòng {contract?.roomCode || contract?.room?.roomCode || "—"}
              </span>
            </section>

            <ContractHandoverSection
              key={`${contractId}-${leaseSignedFileId}-${handoverRefreshKey}`}
              contractId={contractId}
              roomId={contract?.roomId || null}
              roomCode={contract?.roomCode || contract?.room?.roomCode}
              onSaved={handleHandoverSaved}
            />
          </div>
        )
      ) : (
        <section className="flex items-center gap-3 rounded-xl border border-[#dfe5ef] dark:border-white/10 bg-white dark:bg-[#0f172a] px-4 py-6 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-blue-300" />
          Đang tạo hợp đồng thuê từ hợp đồng đặt cọc...
        </section>
      )}
    </div>
  );
}
