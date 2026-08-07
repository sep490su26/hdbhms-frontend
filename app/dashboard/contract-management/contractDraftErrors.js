export function formatDraftCreationError(error, item, contracts = []) {
  const depositFormId =
    item?.depositFormId ?? item?.depositAgreementId ?? item?.deposit_form_id ?? null;
  const rawError = [error?.message, error?.details]
    .filter(Boolean)
    .join(" ");

  if (rawError.includes("FUTURE_CONTRACT_EXISTS")) {
    const blockingContract = contracts.find((contract) => {
      const status = contract?.status || contract?.contractStatus;
      return (
        contract?.leaseContractId &&
        String(contract.roomId) === String(item?.roomId) &&
        ["DRAFT", "PENDING_SIGNATURE"].includes(status) &&
        String(
          contract.depositFormId ?? contract.depositAgreementId ?? "",
        ) !== String(depositFormId || "")
      );
    });
    const roomCode = item?.roomCode || item?.room?.roomCode || "đã chọn";
    const contractCode =
      blockingContract?.contractCode ||
      blockingContract?.displayCode ||
      "khác";
    const customerName =
      blockingContract?.customerName ||
      blockingContract?.primaryTenantName ||
      blockingContract?.tenantName;

    return `Phòng ${roomCode} đang có hợp đồng ${contractCode}${
      customerName ? ` của ${customerName}` : ""
    } ở trạng thái chờ xử lý. Vui lòng xử lý hợp đồng này trước rồi thử lại.`;
  }

  if (rawError.includes("EXPECTED_VACANT_DATE_MISSING")) {
    return "Phòng sắp trống nhưng chưa có ngày bàn giao dự kiến. Vui lòng cập nhật ngày trả phòng trước khi tạo hợp đồng mới.";
  }

  return error?.message || "Không tạo được hợp đồng thuê từ cọc.";
}
