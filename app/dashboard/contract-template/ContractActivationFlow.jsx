"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import ContractHandoverSection from "./ContractHandoverSection";
import ContractWorkflowStepper from "./ContractWorkflowStepper";

export default function ContractActivationFlow({
  contract,
  details,
  actionLoading = "",
  handoverRefreshKey = 0,
  onCreateDraft,
  onContractUpdated,
  onHandoverSaved,
  onActivate,
}) {
  const contractId = contract?.leaseContractId || contract?.contractId;
  const leaseSignedFileId = contract?.signedFileId ?? contract?.signed_file_id ?? null;
  const creatingDraft = actionLoading === `draft-${contract?.depositAgreementId}`;

  const [showHandoverRequested, setShowHandoverRequested] = useState(false);

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

  const showHandover = showHandoverRequested || Boolean(leaseSignedFileId);

  function handleRequestShowHandover() {
    setShowHandoverRequested(true);
  }

  return (
    <div className="grid gap-4 lg:col-span-2">
      {contractId ? (
        <>
          <ContractWorkflowStepper
            contractDetails={contract}
            refreshKey={handoverRefreshKey}
            onContractUpdated={onContractUpdated}
            onRequestShowHandover={handleRequestShowHandover}
            onActivate={onActivate}
            leaseVersion={leaseVersion}
          />

          <ContractHandoverSection
            key={`${contractId}-${leaseSignedFileId}-${handoverRefreshKey}`}
            contractId={contractId}
            roomId={contract?.roomId || null}
            roomCode={contract?.roomCode || contract?.room?.roomCode}
            readonly={!showHandover && !leaseSignedFileId}
            onSaved={onHandoverSaved}
          />
        </>
      ) : (
        <section className="flex items-center gap-3 rounded-xl border border-[#dfe5ef] dark:border-white/10 bg-white dark:bg-[#0f172a] px-4 py-6 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-blue-300" />
          Đang tạo hợp đồng thuê từ hợp đồng đặt cọc...
        </section>
      )}
    </div>
  );
}
