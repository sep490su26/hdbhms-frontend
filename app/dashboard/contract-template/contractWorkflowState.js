export function isLeaseSignedUploadDisabled({
  contractId,
  leaseContractId,
  depositSignedFileId,
  hasDeposit = true,
  loadingStep = null,
} = {}) {
  const resolvedContractId = leaseContractId ?? contractId ?? null;
  const depositReady = hasDeposit ? Boolean(depositSignedFileId) : true;
  return !resolvedContractId || !depositReady || loadingStep != null;
}
