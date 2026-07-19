export function isLeaseSignedUploadDisabled({
  contractId,
  leaseContractId,
  loadingStep = null,
} = {}) {
  const resolvedContractId = leaseContractId ?? contractId ?? null;
  return !resolvedContractId || loadingStep != null;
}

export function getContractActivationReadiness({
  hasDeposit = false,
  depositSignedFileId = null,
  leaseSignedFileId = null,
  requiresMoveInHandover = true,
  hasHandoverData = false,
  handoverSignedFileId = null,
} = {}) {
  const requirements = [
    ...(hasDeposit
      ? [
          {
            key: "deposit",
            label: "Hợp đồng đặt cọc đã ký",
            complete: Boolean(depositSignedFileId),
          },
        ]
      : []),
    {
      key: "lease",
      label: "Hợp đồng thuê đã ký",
      complete: Boolean(leaseSignedFileId),
    },
    ...(requiresMoveInHandover
      ? [
          {
            key: "handover-data",
            label: "Thông tin bàn giao đầy đủ",
            complete: Boolean(hasHandoverData),
          },
          {
            key: "handover-signed-file",
            label: "Bien ban ban giao da ky",
            complete: Boolean(handoverSignedFileId),
          },
        ]
      : []),
  ];

  const completedCount = requirements.filter((item) => item.complete).length;

  return {
    requirements,
    completedCount,
    totalCount: requirements.length,
    ready: completedCount === requirements.length,
  };
}
