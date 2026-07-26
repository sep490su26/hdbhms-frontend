import {
  API_BASE_URL,
  ApiError,
  authenticatedFetch,
  getAuthToken,
  refreshTokenApi,
} from "@/services/identityAccessService";
import { normalizePageResponse, readPageItems } from "@/lib/pageResponse";

function authHeaders(extraHeaders = {}) {
  const token = getAuthToken();
  return {
    "X-Client-Type": "web",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

function sanitizeFilenamePart(value, fallback) {
  if (value == null || String(value).trim() === "") return fallback;
  const sanitized = String(value)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");
  return sanitized || fallback;
}

function toDatePart(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function formatDocumentFilenameDate(value) {
  const datePart = toDatePart(value);
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "Chua-Ro-Ngay";
  return `${match[3]}_${match[2]}_${match[1]}`;
}

function withRoomPrefix(roomCode) {
  if (roomCode.startsWith("Phong")) return roomCode;
  if (/^p/i.test(roomCode)) return `P${roomCode.slice(1)}`;
  return `P${roomCode}`;
}

export function buildLeaseContractDocumentFilename(item = {}) {
  const roomCode = withRoomPrefix(
    sanitizeFilenamePart(
      item.roomCode ??
        item.room_code ??
        item.room?.roomCode ??
        item.room?.room_code,
      "Phong-X",
    ),
  );
  const date = formatDocumentFilenameDate(
    item.startDate ??
      item.start_date ??
      item.expectedLeaseSignDate ??
      item.expected_lease_sign_date,
  );
  return `HDT_${roomCode}_${date}.pdf`;
}

const DEFAULT_LEASE_CONTRACT_DOCUMENT_FILENAME =
  buildLeaseContractDocumentFilename();

function extractFilenameFromContentDisposition(headerValue) {
  if (!headerValue) return "";

  const filenameStarMatch = headerValue.match(
    /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i,
  );
  if (filenameStarMatch?.[1]) {
    const encoded = filenameStarMatch[1].trim().replace(/^"|"$/g, "");
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }

  const filenameMatch = headerValue.match(/filename\s*=\s*("[^"]+"|[^;]+)/i);
  if (!filenameMatch?.[1]) return "";
  return filenameMatch[1].trim().replace(/^"|"$/g, "");
}

async function fetchWithAuth(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: authHeaders(options.headers),
  });

  if (response.status !== 401) {
    return response;
  }

  await refreshTokenApi();
  return fetch(url, {
    ...options,
    credentials: "include",
    headers: authHeaders(options.headers),
  });
}

async function parseEnvelope(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.code !== 0) {
    throw new ApiError(payload.message || payload.details || fallbackMessage, {
      code: payload.code,
      details: payload.details,
      status: response.status,
      payload,
    });
  }
  return payload.data ?? null;
}

function normalizeInvoiceLine(line = {}) {
  return {
    id: line.id ?? line.invoiceLineId ?? line.invoice_line_id ?? null,
    lineType: line.lineType ?? line.line_type ?? null,
    description: line.description ?? "",
    quantity: line.quantity ?? null,
    unitPrice: line.unitPrice ?? line.unit_price ?? null,
    amount: line.amount ?? null,
    meterReadingId:
      line.meterReadingId ?? line.meter_reading_id ?? null,
    photoFileId:
      line.photoFileId ?? line.photo_file_id ?? null,
    previousValue:
      line.previousValue ?? line.previous_value ?? null,
    currentValue:
      line.currentValue ?? line.current_value ?? null,
  };
}

export function normalizeLeaseContractItem(item = {}) {
  const contractId =
    item.contractId ??
    item.contract_id ??
    item.leaseContractId ??
    item.lease_contract_id ??
    null;
  const depositCode = item.depositCode ?? item.deposit_code ?? null;
  const contractCode = item.contractCode ?? item.contract_code ?? null;
  const legacyContractCode = contractId
    ? (item.displayCode ?? item.display_code ?? item.code ?? null)
    : null;
  const displayedContractCode = contractCode ?? legacyContractCode ?? "";

  return {
    ...item,
    sourceType: item.sourceType ?? item.source_type ?? null,
    contractId,
    leaseContractId:
      item.leaseContractId ?? item.lease_contract_id ?? contractId,
    depositAgreementId:
      item.depositAgreementId ?? item.deposit_agreement_id ?? null,
    code: displayedContractCode,
    displayCode: displayedContractCode,
    depositCode,
    contractCode,
    propertyId:
      item.propertyId ??
      item.property_id ??
      item.property?.id ??
      item.property?.propertyId ??
      item.property?.property_id ??
      item.room?.propertyId ??
      item.room?.property_id ??
      item.room?.property?.id ??
      item.room?.property?.propertyId ??
      item.room?.property?.property_id ??
      null,
    propertyName: item.propertyName ?? item.property_name ?? null,
    propertyAddress: item.propertyAddress ?? item.property_address ?? null,
    tenantId: item.tenantId ?? item.tenant_id ?? null,
    roomId: item.roomId ?? item.room_id ?? null,
    roomCode: item.roomCode ?? item.room_code ?? null,
    roomStatus: item.roomStatus ?? item.room_status ?? null,
    primaryTenantProfileId:
      item.primaryTenantProfileId ?? item.primary_tenant_profile_id ?? null,
    customerName:
      item.customerName ??
      item.customer_name ??
      item.primaryTenantName ??
      item.primary_tenant_name ??
      null,
    primaryTenantName:
      item.primaryTenantName ??
      item.primary_tenant_name ??
      item.customerName ??
      item.customer_name ??
      null,
    phone:
      item.phone ??
      item.primaryTenantPhone ??
      item.primary_tenant_phone ??
      null,
    email:
      item.email ??
      item.primaryTenantEmail ??
      item.primary_tenant_email ??
      null,
    expectedLeaseSignDate:
      item.expectedLeaseSignDate ?? item.expected_lease_sign_date ?? null,
    expectedMoveInDate:
      item.expectedMoveInDate ?? item.expected_move_in_date ?? null,
    startDate: item.startDate ?? item.start_date ?? null,
    endDate: item.endDate ?? item.end_date ?? null,
    rentStartDate: item.rentStartDate ?? item.rent_start_date ?? null,
    monthlyRent: item.monthlyRent ?? item.monthly_rent ?? null,
    paymentCycleMonths:
      item.paymentCycleMonths ?? item.payment_cycle_months ?? null,
    depositAmount: item.depositAmount ?? item.deposit_amount ?? null,
    contractStatus:
      item.contractStatus ?? item.contract_status ?? item.status ?? null,
    status: item.status ?? item.contractStatus ?? item.contract_status ?? null,
    depositStatus: item.depositStatus ?? item.deposit_status ?? null,
    workflowStatus: item.workflowStatus ?? item.workflow_status ?? null,
    occupantsCount:
      item.occupantsCount ??
      item.occupants_count ??
      item.occupantCount ??
      item.occupant_count ??
      item.peopleCount ??
      item.people_count ??
      item.roomOccupantCount ??
      item.room_occupant_count ??
      (Array.isArray(item.occupants) ? item.occupants.length : null),
    contractFileId:
      item.contractFileId ??
      item.contract_file_id ??
      item.fileId ??
      item.file_id ??
      item.contractFile?.id ??
      item.contract_file?.id ??
      item.contractFile?.fileId ??
      item.contract_file?.file_id ??
      null,
    contractFileName:
      item.contractFileName ??
      item.contract_file_name ??
      item.fileName ??
      item.file_name ??
      item.contractFile?.fileName ??
      item.contract_file?.file_name ??
      null,
    contractFileUploadedAt:
      item.contractFileUploadedAt ??
      item.contract_file_uploaded_at ??
      item.uploadedAt ??
      item.uploaded_at ??
      item.contractFile?.uploadedAt ??
      item.contract_file?.uploaded_at ??
      null,
    signedFileId:
      item.signedFileId ??
      item.signed_file_id ??
      item.signedFile?.id ??
      item.signed_file?.id ??
      null,
    signedFileName:
      item.signedFileName ??
      item.signed_file_name ??
      item.signedFile?.fileName ??
      item.signed_file?.file_name ??
      null,
    signedFileUploadedAt:
      item.signedFileUploadedAt ??
      item.signed_file_uploaded_at ??
      item.signedFile?.uploadedAt ??
      item.signed_file?.uploaded_at ??
      null,
    handoverSignedFileId:
      item.handoverSignedFileId ?? item.handover_signed_file_id ?? null,
    signedAt: item.signedAt ?? item.signed_at ?? null,
    createdAt: item.createdAt ?? item.created_at ?? null,
    accountProvisioned:
      item.accountProvisioned ?? item.account_provisioned ?? false,
    emailAvailable:
      item.emailAvailable ?? item.email_available ?? Boolean(item.email),
    previousContractId:
      item.previousContractId ?? item.previous_contract_id ?? null,
    previousContractCode:
      item.previousContractCode ?? item.previous_contract_code ?? null,
    renewedContractId:
      item.renewedContractId ??
      item.renewed_contract_id ??
      item.nextContractId ??
      item.next_contract_id ??
      null,
    renewedContractCode:
      item.renewedContractCode ??
      item.renewed_contract_code ??
      item.nextContractCode ??
      item.next_contract_code ??
      null,
    tenantIntention: item.tenantIntention ?? item.tenant_intention ?? null,
    expectedVacantDate:
      item.expectedVacantDate ?? item.expected_vacant_date ?? null,
    liquidationId: item.liquidationId ?? item.liquidation_id ?? null,
    liquidationDate:
      item.liquidationDate ?? item.liquidation_date ?? null,
    liquidationReason:
      item.liquidationReason ?? item.liquidation_reason ?? null,
    liquidationDepositAmount:
      item.liquidationDepositAmount ?? item.liquidation_deposit_amount ?? null,
    liquidationDepositDeductionAmount:
      item.liquidationDepositDeductionAmount ??
      item.liquidation_deposit_deduction_amount ??
      null,
    liquidationDepositDeductionReason:
      item.liquidationDepositDeductionReason ??
      item.liquidation_deposit_deduction_reason ??
      null,
    liquidationDepositRefundAmount:
      item.liquidationDepositRefundAmount ??
      item.liquidation_deposit_refund_amount ??
      null,
    liquidationFinalInvoiceId:
      item.liquidationFinalInvoiceId ?? item.liquidation_final_invoice_id ?? null,
    liquidationFinalInvoiceCode:
      item.liquidationFinalInvoiceCode ??
      item.liquidation_final_invoice_code ??
      null,
    liquidationFinalInvoiceStatus:
      item.liquidationFinalInvoiceStatus ??
      item.liquidation_final_invoice_status ??
      null,
    liquidationFinalInvoiceSubtotalAmount:
      item.liquidationFinalInvoiceSubtotalAmount ??
      item.liquidation_final_invoice_subtotal_amount ??
      null,
    liquidationFinalInvoiceDiscountAmount:
      item.liquidationFinalInvoiceDiscountAmount ??
      item.liquidation_final_invoice_discount_amount ??
      null,
    liquidationFinalInvoiceTotalAmount:
      item.liquidationFinalInvoiceTotalAmount ??
      item.liquidation_final_invoice_total_amount ??
      null,
    liquidationFinalInvoiceRemainingAmount:
      item.liquidationFinalInvoiceRemainingAmount ??
      item.liquidation_final_invoice_remaining_amount ??
      null,
    liquidationFinalInvoiceLines: Array.isArray(
      item.liquidationFinalInvoiceLines ?? item.liquidation_final_invoice_lines,
    )
      ? (item.liquidationFinalInvoiceLines ?? item.liquidation_final_invoice_lines).map(
          normalizeInvoiceLine,
        )
      : [],
    liquidationSignedFileId:
      item.liquidationSignedFileId ?? item.liquidation_signed_file_id ?? null,
    liquidationStatus:
      item.liquidationStatus ?? item.liquidation_status ?? null,
    liquidationCreatedAt:
      item.liquidationCreatedAt ?? item.liquidation_created_at ?? null,
    liquidationDepositRefundRequestId:
      item.liquidationDepositRefundRequestId ??
      item.liquidation_deposit_refund_request_id ??
      null,
    liquidationDepositRefundExpenseId:
      item.liquidationDepositRefundExpenseId ??
      item.liquidation_deposit_refund_expense_id ??
      null,
    liquidationDepositRefundExpenseRequestId:
      item.liquidationDepositRefundExpenseRequestId ??
      item.liquidation_deposit_refund_expense_request_id ??
      null,
    liquidationDepositRefundStatus:
      item.liquidationDepositRefundStatus ??
      item.liquidation_deposit_refund_status ??
      null,
    liquidationDepositRefundProofFileId:
      item.liquidationDepositRefundProofFileId ??
      item.liquidation_deposit_refund_proof_file_id ??
      null,
    liquidationDepositRefundedAmount:
      item.liquidationDepositRefundedAmount ??
      item.liquidation_deposit_refunded_amount ??
      null,
    liquidationDepositRefundedAt:
      item.liquidationDepositRefundedAt ??
      item.liquidation_deposit_refunded_at ??
      null,
    liquidationDepositRefundTransactionRef:
      item.liquidationDepositRefundTransactionRef ??
      item.liquidation_deposit_refund_transaction_ref ??
      null,
    transferRequestId: item.transferRequestId ?? null,
    transferRequestCode: item.transferRequestCode ?? null,
    transferStatus: item.transferStatus ?? null,
    transferRequestedDate: item.transferRequestedDate ?? null,
    transferContractRole: item.transferContractRole ?? null,
    transferActivationLocked: item.transferActivationLocked ?? false,
    intentionRecordedAt:
      item.intentionRecordedAt ?? item.intention_recorded_at ?? null,
    intentionNote:
      item.intentionNote ??
      item.intention_note ??
      item.tenantIntentionNote ??
      item.tenant_intention_note ??
      null,
    intentionSource: item.intentionSource ?? item.intention_source ?? null,
  };
}

function normalizeLeaseContractList(data) {
  return readPageItems(data).map(normalizeLeaseContractItem);
}

export async function fetchLeaseContractManagementList({
  page = 0,
  size = 10,
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc",
  });
  const data = await authenticatedFetch(
    `${API_BASE_URL}/lease-contracts/management?${params.toString()}`,
    {
      method: "GET",
    },
  );
  const items = normalizeLeaseContractList(data);
  const pagination = normalizePageResponse(data, {
    page: page + 1,
    size,
    items,
  });
  return {
    ...pagination,
    data: items,
    items,
    currentPage: pagination.page,
    pageSize: pagination.size,
  };
}

export async function createDraftLeaseContractFromDeposit(depositAgreementId) {
  if (!depositAgreementId) {
    throw new Error(
      "Không xác định được hợp đồng đặt cọc để tạo hợp đồng thuê.",
    );
  }
  const data = await authenticatedFetch(
    `${API_BASE_URL}/lease-contracts/management/deposits/${encodeURIComponent(depositAgreementId)}/draft`,
    { method: "POST" },
  );
  return normalizeLeaseContractItem(data);
}

export async function uploadSignedLeaseContractFile(
  contract,
  file,
  options = {},
) {
  if (!contract) {
    throw new Error("Vui lòng chọn hợp đồng cần upload.");
  }
  if (!file) {
    throw new Error("Vui lòng chọn file hợp đồng đã ký.");
  }

  const target = normalizeLeaseContractItem(contract);
  if (!target.leaseContractId) {
    throw new Error(
      "Hợp đồng thuê chưa được tạo. Vui lòng tạo hợp đồng thuê trước khi upload file đã ký.",
    );
  }

  const formData = new FormData();
  formData.append("file", file);

  const replace = options.replace ?? Boolean(target.signedFileId);
  const params = new URLSearchParams();
  if (replace) params.set("replace", "true");

  const query = params.toString();
  const endpoint = `${API_BASE_URL}/lease-contracts/${encodeURIComponent(target.leaseContractId)}/signed-file${query ? `?${query}` : ""}`;

  const response = await fetchWithAuth(endpoint, {
    method: "POST",
    body: formData,
  });

  return normalizeLeaseContractItem(
    await parseEnvelope(response, "Không thể upload hợp đồng đã ký."),
  );
}

export async function activateLeaseContract(leaseContractId) {
  if (!leaseContractId) {
    throw new Error(
      "Hợp đồng chưa được tạo. Vui lòng upload file hợp đồng trước.",
    );
  }
  const data = await authenticatedFetch(
    `${API_BASE_URL}/lease-contracts/${encodeURIComponent(leaseContractId)}/activate`,
    {
      method: "POST",
      headers: { Accept: "application/json" },
    },
  );
  return normalizeLeaseContractItem(data);
}

export async function updateLeaseContractTerms(leaseContractId, payload) {
  if (!leaseContractId) {
    throw new Error("Không xác định được hợp đồng cần cập nhật.");
  }
  const data = await authenticatedFetch(
    `${API_BASE_URL}/lease-contracts/${encodeURIComponent(leaseContractId)}/terms`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: payload.startDate,
        endDate: payload.endDate,
        paymentCycleMonths: payload.paymentCycleMonths,
        monthlyRent: payload.monthlyRent,
        depositAmount: payload.depositAmount,
      }),
    },
  );
  return normalizeLeaseContractItem(data);
}

export async function liquidateLeaseContract(leaseContractId, payload = {}) {
  if (!leaseContractId) {
    throw new Error("Hợp đồng chưa được tạo, không thể thanh lý.");
  }
  const data = await authenticatedFetch(
    `${API_BASE_URL}/lease-contracts/${encodeURIComponent(leaseContractId)}/liquidate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return normalizeLeaseContractItem(data);
}

export async function updateLeaseContractLiquidationDraft(leaseContractId, payload = {}) {
  if (!leaseContractId) {
    throw new Error("Không xác định được hợp đồng cần cập nhật hồ sơ thanh lý.");
  }
  const data = await authenticatedFetch(
    `${API_BASE_URL}/lease-contracts/${encodeURIComponent(leaseContractId)}/liquidation`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        liquidationDate: payload.liquidationDate,
        reason: payload.reason,
        charges: payload.charges,
      }),
    },
  );
  return normalizeLeaseContractItem(data);
}

export async function renewLeaseContract(leaseContractId, payload) {
  if (!leaseContractId) {
    throw new Error("Không xác định được hợp đồng cần gia hạn.");
  }
  return authenticatedFetch(
    `${API_BASE_URL}/lease-contracts/${encodeURIComponent(leaseContractId)}/renew`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newStartDate: payload.newStartDate,
        newEndDate: payload.newEndDate,
        monthlyRent: payload.monthlyRent,
        paymentCycleMonths: payload.paymentCycleMonths,
        depositAmount: payload.depositAmount,
        note: payload.note,
      }),
    },
  );
}

export async function recordLeaseContractTenantIntention(
  leaseContractId,
  payload,
) {
  if (!leaseContractId) {
    throw new Error("Không xác định được hợp đồng cần ghi nhận ý định.");
  }
  const data = await authenticatedFetch(
    `${API_BASE_URL}/lease-contracts/${encodeURIComponent(leaseContractId)}/tenant-intention`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intention: payload.intention,
        expectedMoveOutDate: payload.expectedMoveOutDate || null,
        note: payload.note,
      }),
    },
  );
  return normalizeLeaseContractItem(data);
}

async function fetchPrivateFileBlob(fileId) {
  if (!fileId) {
    throw new Error("Hợp đồng chưa có file.");
  }
  const response = await fetchWithAuth(
    `${API_BASE_URL}/files/private/${encodeURIComponent(fileId)}`,
    {
      method: "GET",
    },
  );
  if (!response.ok) {
    throw new Error("Không thể tải file hợp đồng.");
  }
  return response.blob();
}

export async function fetchLeaseContractFileObjectUrl(fileId) {
  const blob = await fetchPrivateFileBlob(fileId);
  return URL.createObjectURL(blob);
}

export async function fetchLeaseContractDraftPdfFile(leaseContractId) {
  if (!leaseContractId) {
    throw new Error("Không xác định được hợp đồng cần tải.");
  }

  const response = await fetchWithAuth(
    `${API_BASE_URL}/lease-contracts/${encodeURIComponent(leaseContractId)}/draft-pdf`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error("Không thể tải PDF hợp đồng.");
  }

  const contentDisposition =
    response.headers?.get?.("content-disposition") ||
    response.headers?.get?.("Content-Disposition") ||
    "";

  return {
    blob: await response.blob(),
    filename: extractFilenameFromContentDisposition(contentDisposition),
  };
}

export async function fetchLeaseContractDraftPdfBlob(leaseContractId) {
  const file = await fetchLeaseContractDraftPdfFile(leaseContractId);
  return file.blob;
}

export async function downloadLeaseContractDraftPdf(
  leaseContractId,
  filename = DEFAULT_LEASE_CONTRACT_DOCUMENT_FILENAME,
) {
  const { blob, filename: serverFilename } =
    await fetchLeaseContractDraftPdfFile(leaseContractId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = serverFilename || filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function fetchLeaseContractSignedFile(leaseContractId) {
  if (!leaseContractId) {
    throw new Error("Không xác định được hợp đồng thuê cần tải.");
  }

  const response = await fetchWithAuth(
    `${API_BASE_URL}/lease-contracts/${encodeURIComponent(leaseContractId)}/signed-file`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error("Không thể tải hợp đồng thuê đã ký.");
  }

  const contentDisposition =
    response.headers?.get?.("content-disposition") ||
    response.headers?.get?.("Content-Disposition") ||
    "";

  return {
    blob: await response.blob(),
    filename: extractFilenameFromContentDisposition(contentDisposition),
  };
}

export async function fetchLeaseContractSignedFileBlob(leaseContractId) {
  const file = await fetchLeaseContractSignedFile(leaseContractId);
  return file.blob;
}

export async function downloadLeaseContractSignedFile(
  leaseContractId,
  filename = DEFAULT_LEASE_CONTRACT_DOCUMENT_FILENAME,
) {
  const { blob, filename: serverFilename } =
    await fetchLeaseContractSignedFile(leaseContractId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = serverFilename || filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function openLeaseContractFile(fileId) {
  const popup =
    typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
  if (popup) {
    popup.document.write(
      '<!doctype html><title>Đang tải hợp đồng</title><p style="font-family:Arial,sans-serif;padding:24px">Đang tải hợp đồng thuê...</p>',
    );
  }

  try {
    const blob = await fetchPrivateFileBlob(fileId);
    const url = URL.createObjectURL(blob);
    if (popup) {
      popup.opener = null;
      popup.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    popup?.close();
    throw error;
  }
}

export async function downloadLeaseContractFile(
  fileId,
  filename = DEFAULT_LEASE_CONTRACT_DOCUMENT_FILENAME,
) {
  const blob = await fetchPrivateFileBlob(fileId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function normalizeLeaseContractDetails(details = {}) {
  if (!details || typeof details !== "object") return null;
  const rawContractFile = details.contractFile ?? details.contract_file ?? null;
  const rawOccupants =
    details.occupants ??
    details.contractOccupants ??
    details.contract_occupants ??
    details.occupantInfos ??
    details.occupant_infos ??
    details.residents ??
    [];
  const contractFile = rawContractFile
    ? {
        ...rawContractFile,
        id:
          rawContractFile.id ??
          rawContractFile.fileId ??
          rawContractFile.file_id ??
          null,
        fileName:
          rawContractFile.fileName ??
          rawContractFile.file_name ??
          rawContractFile.name ??
          null,
        uploadedAt:
          rawContractFile.uploadedAt ??
          rawContractFile.uploaded_at ??
          rawContractFile.createdAt ??
          rawContractFile.created_at ??
          null,
      }
    : null;
  const rawSignedFile = details.signedFile ?? details.signed_file ?? null;
  const signedFile = rawSignedFile
    ? {
        ...rawSignedFile,
        id:
          rawSignedFile.id ??
          rawSignedFile.fileId ??
          rawSignedFile.file_id ??
          null,
        fileName:
          rawSignedFile.fileName ??
          rawSignedFile.file_name ??
          rawSignedFile.name ??
          null,
        uploadedAt:
          rawSignedFile.uploadedAt ??
          rawSignedFile.uploaded_at ??
          rawSignedFile.createdAt ??
          rawSignedFile.created_at ??
          null,
      }
    : null;
  const rawPrimaryTenant =
    details.primaryTenant ?? details.primary_tenant ?? {};
  const primaryTenant = rawPrimaryTenant
    ? {
        ...rawPrimaryTenant,
        id:
          rawPrimaryTenant.id ??
          rawPrimaryTenant.tenantProfileId ??
          rawPrimaryTenant.tenant_profile_id ??
          null,
        fullName: rawPrimaryTenant.fullName ?? rawPrimaryTenant.full_name ?? "",
        phone: rawPrimaryTenant.phone ?? "",
        email: rawPrimaryTenant.email ?? "",
        dob:
          rawPrimaryTenant.dob ??
          rawPrimaryTenant.dateOfBirth ??
          rawPrimaryTenant.date_of_birth ??
          rawPrimaryTenant.birthDate ??
          rawPrimaryTenant.birth_date ??
          null,
        dateOfBirth:
          rawPrimaryTenant.dateOfBirth ??
          rawPrimaryTenant.date_of_birth ??
          rawPrimaryTenant.dob ??
          rawPrimaryTenant.birthDate ??
          rawPrimaryTenant.birth_date ??
          null,
        permanentAddress:
          rawPrimaryTenant.permanentAddress ??
          rawPrimaryTenant.permanent_address ??
          "",
        citizenId:
          rawPrimaryTenant.citizenId ??
          rawPrimaryTenant.citizen_id ??
          rawPrimaryTenant.identityNumber ??
          rawPrimaryTenant.identity_number ??
          rawPrimaryTenant.idNumber ??
          rawPrimaryTenant.id_number ??
          rawPrimaryTenant.docNumber ??
          rawPrimaryTenant.doc_number ??
          null,
        identityIssuedDate:
          rawPrimaryTenant.identityIssuedDate ??
          rawPrimaryTenant.identity_issued_date ??
          rawPrimaryTenant.issuedDate ??
          rawPrimaryTenant.issued_date ??
          rawPrimaryTenant.issueDate ??
          rawPrimaryTenant.issue_date ??
          null,
        identityIssuedPlace:
          rawPrimaryTenant.identityIssuedPlace ??
          rawPrimaryTenant.identity_issued_place ??
          rawPrimaryTenant.issuedPlace ??
          rawPrimaryTenant.issued_place ??
          rawPrimaryTenant.issuePlace ??
          rawPrimaryTenant.issue_place ??
          "",
      }
    : {};
  return {
    ...details,
    contractId: details.contractId ?? details.contract_id ?? null,
    contractCode: details.contractCode ?? details.contract_code ?? "",
    tenantId: details.tenantId ?? details.tenant_id ?? null,
    propertyId:
      details.propertyId ??
      details.property_id ??
      details.property?.id ??
      details.property?.propertyId ??
      details.property?.property_id ??
      details.room?.propertyId ??
      details.room?.property_id ??
      details.room?.property?.id ??
      details.room?.property?.propertyId ??
      details.room?.property?.property_id ??
      null,
    startDate: details.startDate ?? details.start_date ?? null,
    endDate: details.endDate ?? details.end_date ?? null,
    rentStartDate: details.rentStartDate ?? details.rent_start_date ?? null,
    monthlyRent: details.monthlyRent ?? details.monthly_rent ?? null,
    paymentCycleMonths:
      details.paymentCycleMonths ?? details.payment_cycle_months ?? null,
    depositAmount: details.depositAmount ?? details.deposit_amount ?? null,
    occupantsCount:
      details.occupantsCount ??
      details.occupants_count ??
      details.occupantCount ??
      details.occupant_count ??
      (Array.isArray(rawOccupants) ? rawOccupants.length : null),
    status: details.status ?? null,
    signedFileId:
      details.signedFileId ?? details.signed_file_id ?? signedFile?.id ?? null,
    signedFileName:
      details.signedFileName ??
      details.signed_file_name ??
      signedFile?.fileName ??
      null,
    signedFileUploadedAt:
      details.signedFileUploadedAt ??
      details.signed_file_uploaded_at ??
      signedFile?.uploadedAt ??
      null,
    signedAt: details.signedAt ?? details.signed_at ?? null,
    previousContractId:
      details.previousContractId ?? details.previous_contract_id ?? null,
    liquidationDepositRefundRequestId:
      details.liquidationDepositRefundRequestId ??
      details.liquidation_deposit_refund_request_id ??
      null,
    liquidationDepositRefundExpenseId:
      details.liquidationDepositRefundExpenseId ??
      details.liquidation_deposit_refund_expense_id ??
      null,
    liquidationDepositRefundExpenseRequestId:
      details.liquidationDepositRefundExpenseRequestId ??
      details.liquidation_deposit_refund_expense_request_id ??
      null,
    liquidationDepositRefundStatus:
      details.liquidationDepositRefundStatus ??
      details.liquidation_deposit_refund_status ??
      null,
    liquidationDepositRefundProofFileId:
      details.liquidationDepositRefundProofFileId ??
      details.liquidation_deposit_refund_proof_file_id ??
      null,
    liquidationDepositRefundedAmount:
      details.liquidationDepositRefundedAmount ??
      details.liquidation_deposit_refunded_amount ??
      null,
    liquidationDepositRefundedAt:
      details.liquidationDepositRefundedAt ??
      details.liquidation_deposit_refunded_at ??
      null,
    liquidationDepositRefundTransactionRef:
      details.liquidationDepositRefundTransactionRef ??
      details.liquidation_deposit_refund_transaction_ref ??
      null,
    previousContractCode:
      details.previousContractCode ?? details.previous_contract_code ?? null,
    renewedContractId:
      details.renewedContractId ??
      details.renewed_contract_id ??
      details.nextContractId ??
      details.next_contract_id ??
      null,
    renewedContractCode:
      details.renewedContractCode ??
      details.renewed_contract_code ??
      details.nextContractCode ??
      details.next_contract_code ??
      null,
    tenantIntention:
      details.tenantIntention ?? details.tenant_intention ?? null,
    expectedVacantDate:
      details.expectedVacantDate ?? details.expected_vacant_date ?? null,
    liquidationId: details.liquidationId ?? details.liquidation_id ?? null,
    liquidationDate:
      details.liquidationDate ?? details.liquidation_date ?? null,
    liquidationReason:
      details.liquidationReason ?? details.liquidation_reason ?? null,
    liquidationDepositAmount:
      details.liquidationDepositAmount ??
      details.liquidation_deposit_amount ??
      null,
    liquidationDepositDeductionAmount:
      details.liquidationDepositDeductionAmount ??
      details.liquidation_deposit_deduction_amount ??
      null,
    liquidationDepositDeductionReason:
      details.liquidationDepositDeductionReason ??
      details.liquidation_deposit_deduction_reason ??
      null,
    liquidationDepositRefundAmount:
      details.liquidationDepositRefundAmount ??
      details.liquidation_deposit_refund_amount ??
      null,
    liquidationFinalInvoiceId:
      details.liquidationFinalInvoiceId ??
      details.liquidation_final_invoice_id ??
      null,
    liquidationFinalInvoiceCode:
      details.liquidationFinalInvoiceCode ??
      details.liquidation_final_invoice_code ??
      null,
    liquidationFinalInvoiceStatus:
      details.liquidationFinalInvoiceStatus ??
      details.liquidation_final_invoice_status ??
      null,
    liquidationFinalInvoiceSubtotalAmount:
      details.liquidationFinalInvoiceSubtotalAmount ??
      details.liquidation_final_invoice_subtotal_amount ??
      null,
    liquidationFinalInvoiceDiscountAmount:
      details.liquidationFinalInvoiceDiscountAmount ??
      details.liquidation_final_invoice_discount_amount ??
      null,
    liquidationFinalInvoiceTotalAmount:
      details.liquidationFinalInvoiceTotalAmount ??
      details.liquidation_final_invoice_total_amount ??
      null,
    liquidationFinalInvoiceRemainingAmount:
      details.liquidationFinalInvoiceRemainingAmount ??
      details.liquidation_final_invoice_remaining_amount ??
      null,
    liquidationFinalInvoiceLines: Array.isArray(
      details.liquidationFinalInvoiceLines ??
        details.liquidation_final_invoice_lines,
    )
      ? (
          details.liquidationFinalInvoiceLines ??
          details.liquidation_final_invoice_lines
        ).map(normalizeInvoiceLine)
      : [],
    liquidationSignedFileId:
      details.liquidationSignedFileId ??
      details.liquidation_signed_file_id ??
      null,
    liquidationStatus:
      details.liquidationStatus ?? details.liquidation_status ?? null,
    liquidationCreatedAt:
      details.liquidationCreatedAt ?? details.liquidation_created_at ?? null,
    transferRequestId: details.transferRequestId ?? null,
    transferRequestCode: details.transferRequestCode ?? null,
    transferStatus: details.transferStatus ?? null,
    transferRequestedDate: details.transferRequestedDate ?? null,
    transferContractRole: details.transferContractRole ?? null,
    transferActivationLocked: details.transferActivationLocked ?? false,
    intentionRecordedAt:
      details.intentionRecordedAt ?? details.intention_recorded_at ?? null,
    intentionNote:
      details.intentionNote ??
      details.intention_note ??
      details.tenantIntentionNote ??
      details.tenant_intention_note ??
      null,
    intentionSource:
      details.intentionSource ?? details.intention_source ?? null,
    canRenew: details.canRenew ?? details.can_renew ?? false,
    canRenewBlockedReason:
      details.canRenewBlockedReason ?? details.can_renew_blocked_reason ?? "",
    canLiquidate: details.canLiquidate ?? details.can_liquidate ?? false,
    canSendAccount: details.canSendAccount ?? details.can_send_account ?? false,
    accountProvisioningStatus:
      details.accountProvisioningStatus ??
      details.account_provisioning_status ??
      "NOT_PROVISIONED",
    room: details.room ?? {},
    property: details.property ?? {},
    primaryTenant,
    contractFile,
    signedFile,
    occupants: Array.isArray(rawOccupants)
      ? rawOccupants.map((occupant) => ({
          ...occupant,
          tenantProfileId:
            occupant.tenantProfileId ?? occupant.tenant_profile_id ?? null,
          fullName: occupant.fullName ?? occupant.full_name ?? "",
          phone: occupant.phone ?? "",
          email: occupant.email ?? "",
          dob:
            occupant.dob ??
            occupant.dateOfBirth ??
            occupant.date_of_birth ??
            occupant.birthDate ??
            occupant.birth_date ??
            null,
          dateOfBirth:
            occupant.dateOfBirth ??
            occupant.date_of_birth ??
            occupant.dob ??
            occupant.birthDate ??
            occupant.birth_date ??
            null,
          permanentAddress:
            occupant.permanentAddress ?? occupant.permanent_address ?? "",
          citizenId:
            occupant.citizenId ??
            occupant.citizen_id ??
            occupant.cccd ??
            occupant.citizen_id ??
            occupant.identityNumber ??
            occupant.identity_number ??
            occupant.idNumber ??
            occupant.id_number ??
            occupant.docNumber ??
            occupant.doc_number ??
            null,
          identityIssuedDate:
            occupant.identityIssuedDate ??
            occupant.identity_issued_date ??
            occupant.issuedDate ??
            occupant.issued_date ??
            occupant.issueDate ??
            occupant.issue_date ??
            null,
          identityIssuedPlace:
            occupant.identityIssuedPlace ??
            occupant.identity_issued_place ??
            occupant.issuedPlace ??
            occupant.issued_place ??
            occupant.issuePlace ??
            occupant.issue_place ??
            "",
          occupantRole: occupant.occupantRole ?? occupant.occupant_role ?? null,
          moveInDate: occupant.moveInDate ?? occupant.move_in_date ?? null,
          moveOutDate: occupant.moveOutDate ?? occupant.move_out_date ?? null,
          status: occupant.status ?? null,
          accountStatus:
            occupant.accountStatus ??
            occupant.account_status ??
            "NOT_PROVISIONED",
          accountSentAt:
            occupant.accountSentAt ?? occupant.account_sent_at ?? null,
          lastLoginAt: occupant.lastLoginAt ?? occupant.last_login_at ?? null,
          mustChangePassword:
            occupant.mustChangePassword ??
            occupant.must_change_password ??
            null,
          occupantIntention:
            occupant.occupantIntention ??
            occupant.occupant_intention ??
            null,
          occupantIntentionNote:
            occupant.occupantIntentionNote ??
            occupant.occupant_intention_note ??
            null,
          occupantIntentionRecordedAt:
            occupant.occupantIntentionRecordedAt ??
            occupant.occupant_intention_recorded_at ??
            null,
        }))
      : [],
    events: Array.isArray(details.events)
      ? details.events.map((event) => ({
          ...event,
          id: event.id ?? null,
          eventType: event.eventType ?? event.event_type ?? "",
          eventData: event.eventData ?? event.event_data ?? "",
          createdAt: event.createdAt ?? event.created_at ?? null,
        }))
      : [],
  };
}

function normalizeRentalHistory(data = {}) {
  return {
    roomId: data.roomId ?? data.room_id ?? null,
    roomCode: data.roomCode ?? data.room_code ?? "",
    roomName: data.roomName ?? data.room_name ?? "",
    contracts: Array.isArray(data.contracts)
      ? data.contracts.map(normalizeLeaseContractDetails).filter(Boolean)
      : [],
  };
}

function buildContractQueryParams(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.roomId) params.set("roomId", String(filters.roomId));
  if (filters.propertyId) params.set("propertyId", String(filters.propertyId));
  if (filters.tenantProfileId)
    params.set("tenantProfileId", String(filters.tenantProfileId));
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.keyword?.trim()) params.set("keyword", filters.keyword.trim());
  return params.toString();
}

export async function fetchTenantLeaseContracts(tenantId, filters = {}) {
  if (!tenantId) {
    throw new Error("Không xác định được tenant để tải hợp đồng thuê.");
  }
  const query = buildContractQueryParams(filters);
  const data = await authenticatedFetch(
    `${API_BASE_URL}/tenants/${encodeURIComponent(tenantId)}/contracts${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
  return normalizeLeaseContractList(data);
}

export async function fetchTenantLeaseContractDetails(tenantId, contractId) {
  if (!tenantId || !contractId) {
    throw new Error("Không xác định được tenant hoặc hợp đồng thuê.");
  }
  const data = await authenticatedFetch(
    `${API_BASE_URL}/tenants/${encodeURIComponent(tenantId)}/contracts/${encodeURIComponent(contractId)}`,
    { method: "GET" },
  );
  return normalizeLeaseContractDetails(data);
}

export async function fetchManagementLeaseContractDetails(contractId) {
  if (!contractId) {
    throw new Error("Không xác định được hợp đồng thuê.");
  }
  const data = await authenticatedFetch(
    `${API_BASE_URL}/lease-contracts/management/${encodeURIComponent(contractId)}`,
    { method: "GET" },
  );
  return normalizeLeaseContractDetails(data);
}

export async function fetchTenantRoomRentalHistory(tenantId, roomId) {
  if (!tenantId || !roomId) {
    throw new Error(
      "Không xác định được tenant hoặc phòng để tải lịch sử thuê.",
    );
  }
  const data = await authenticatedFetch(
    `${API_BASE_URL}/tenants/${encodeURIComponent(tenantId)}/rooms/${encodeURIComponent(roomId)}/rental-history`,
    { method: "GET" },
  );
  return normalizeRentalHistory(data);
}

export async function fetchManagementRoomRentalHistory(roomId) {
  if (!roomId) {
    throw new Error("Không xác định được phòng để tải lịch sử thuê.");
  }
  const data = await authenticatedFetch(
    `${API_BASE_URL}/lease-contracts/management/rooms/${encodeURIComponent(roomId)}/rental-history`,
    { method: "GET" },
  );
  return normalizeRentalHistory(data);
}
