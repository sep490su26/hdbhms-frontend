export function getHandoverDocumentState(handover) {
  const hasHandoverData = Boolean(handover?.electricity && handover?.water);
  const signedDocumentId =
    handover?.signedDocumentId ?? handover?.signed_document_id ?? null;

  if (!hasHandoverData) {
    return {
      key: "NO_DATA",
      hasHandoverData: false,
      signedDocumentId,
      label: "Chưa có dữ liệu bàn giao",
    };
  }

  if (!signedDocumentId) {
    return {
      key: "PENDING_SIGNED_FILE",
      hasHandoverData: true,
      signedDocumentId: null,
      label: "Chờ bổ sung bản ký",
    };
  }

  return {
    key: "COMPLETE",
    hasHandoverData: true,
    signedDocumentId,
    label: "Đã có bản ký",
  };
}
