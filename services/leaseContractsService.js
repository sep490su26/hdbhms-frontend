import {
  API_BASE_URL,
  ApiError,
  authenticatedFetch,
  getAuthToken,
  refreshTokenApi,
} from "@/services/identityAccessService";

function authHeaders(extraHeaders = {}) {
  const token = getAuthToken();
  return {
    "X-Client-Type": "web",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
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

function normalizeLeaseContractItem(item = {}) {
  return {
    ...item,
    sourceType: item.sourceType ?? item.source_type ?? null,
    leaseContractId: item.leaseContractId ?? item.lease_contract_id ?? null,
    depositAgreementId: item.depositAgreementId ?? item.deposit_agreement_id ?? null,
    depositCode: item.depositCode ?? item.deposit_code ?? null,
    contractCode: item.contractCode ?? item.contract_code ?? null,
    propertyId: item.propertyId ?? item.property_id ?? null,
    propertyName: item.propertyName ?? item.property_name ?? null,
    propertyAddress: item.propertyAddress ?? item.property_address ?? null,
    roomId: item.roomId ?? item.room_id ?? null,
    roomCode: item.roomCode ?? item.room_code ?? null,
    roomStatus: item.roomStatus ?? item.room_status ?? null,
    primaryTenantProfileId: item.primaryTenantProfileId ?? item.primary_tenant_profile_id ?? null,
    customerName: item.customerName ?? item.customer_name ?? null,
    expectedLeaseSignDate: item.expectedLeaseSignDate ?? item.expected_lease_sign_date ?? null,
    expectedMoveInDate: item.expectedMoveInDate ?? item.expected_move_in_date ?? null,
    startDate: item.startDate ?? item.start_date ?? null,
    endDate: item.endDate ?? item.end_date ?? null,
    monthlyRent: item.monthlyRent ?? item.monthly_rent ?? null,
    paymentCycleMonths: item.paymentCycleMonths ?? item.payment_cycle_months ?? null,
    depositAmount: item.depositAmount ?? item.deposit_amount ?? null,
    contractStatus: item.contractStatus ?? item.contract_status ?? null,
    depositStatus: item.depositStatus ?? item.deposit_status ?? null,
    workflowStatus: item.workflowStatus ?? item.workflow_status ?? null,
    contractFileId: item.contractFileId ?? item.contract_file_id ?? null,
    contractFileName: item.contractFileName ?? item.contract_file_name ?? null,
    contractFileUploadedAt: item.contractFileUploadedAt ?? item.contract_file_uploaded_at ?? null,
    signedAt: item.signedAt ?? item.signed_at ?? null,
    createdAt: item.createdAt ?? item.created_at ?? null,
    accountProvisioned: item.accountProvisioned ?? item.account_provisioned ?? false,
    emailAvailable: item.emailAvailable ?? item.email_available ?? false,
  };
}

function normalizeLeaseContractList(data) {
  return Array.isArray(data) ? data.map(normalizeLeaseContractItem) : [];
}

export async function fetchLeaseContractManagementList() {
  const data = await authenticatedFetch(`${API_BASE_URL}/lease-contracts/management`, {
    method: "GET",
  });
  return normalizeLeaseContractList(data);
}

export async function createDraftLeaseContractFromDeposit(depositAgreementId) {
  if (!depositAgreementId) {
    throw new Error("Không xác định được hợp đồng đặt cọc để tạo hợp đồng thuê.");
  }
  const data = await authenticatedFetch(
    `${API_BASE_URL}/lease-contracts/management/deposits/${encodeURIComponent(depositAgreementId)}/draft`,
    { method: "POST" },
  );
  return normalizeLeaseContractItem(data);
}

export async function uploadSignedLeaseContractFile(contract, file) {
  if (!contract) {
    throw new Error("Vui lòng chọn hợp đồng cần upload.");
  }
  if (!file) {
    throw new Error("Vui lòng chọn file hợp đồng đã ký.");
  }

  const target = normalizeLeaseContractItem(contract);
  if (!target.leaseContractId && !target.depositAgreementId) {
    throw new Error("Không xác định được mã cọc hoặc mã hợp đồng để upload file.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const endpoint = target.leaseContractId
    ? `${API_BASE_URL}/lease-contracts/${encodeURIComponent(target.leaseContractId)}/signed-file`
    : `${API_BASE_URL}/lease-contracts/management/deposits/${encodeURIComponent(target.depositAgreementId)}/signed-file`;

  const response = await fetchWithAuth(endpoint, {
    method: "POST",
    body: formData,
  });

  return normalizeLeaseContractItem(await parseEnvelope(response, "Không thể upload hợp đồng đã ký."));
}

export async function activateLeaseContract(leaseContractId) {
  if (!leaseContractId) {
    throw new Error("Hợp đồng chưa được tạo. Vui lòng upload file hợp đồng trước.");
  }
  const data = await authenticatedFetch(`${API_BASE_URL}/lease-contracts/${encodeURIComponent(leaseContractId)}/activate`, {
    method: "POST",
  });
  return normalizeLeaseContractItem(data);
}

export async function liquidateLeaseContract(leaseContractId, payload = {}) {
  if (!leaseContractId) {
    throw new Error("Hợp đồng chưa được tạo, không thể thanh lý.");
  }
  const data = await authenticatedFetch(`${API_BASE_URL}/lease-contracts/${encodeURIComponent(leaseContractId)}/liquidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return normalizeLeaseContractItem(data);
}

async function fetchPrivateFileBlob(fileId) {
  if (!fileId) {
    throw new Error("Hợp đồng chưa có file.");
  }
  const response = await fetchWithAuth(`${API_BASE_URL}/files/private/${encodeURIComponent(fileId)}`, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error("Không thể tải file hợp đồng.");
  }
  return response.blob();
}

export async function openLeaseContractFile(fileId) {
  const popup = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
  if (popup) {
    popup.document.write("<!doctype html><title>Đang tải hợp đồng</title><p style=\"font-family:Arial,sans-serif;padding:24px\">Đang tải hợp đồng thuê...</p>");
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

export async function downloadLeaseContractFile(fileId, filename = "hop-dong-thue.pdf") {
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
