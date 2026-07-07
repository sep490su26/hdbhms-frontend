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

export function normalizeLeaseContractItem(item = {}) {
  const contractId = item.contractId ?? item.leaseContractId ?? null;
  const depositCode = item.depositCode ?? null;
  const contractCode = item.contractCode ?? null;
  const legacyContractCode = contractId
    ? item.displayCode ?? item.code ?? null
    : null;
  const displayedContractCode = contractCode ?? legacyContractCode ?? "";

  return {
    ...item,
    sourceType: item.sourceType ?? null,
    contractId,
    leaseContractId: item.leaseContractId ?? contractId,
    depositAgreementId: item.depositAgreementId ?? null,
    code: displayedContractCode,
    displayCode: displayedContractCode,
    depositCode,
    contractCode,
    propertyId: item.propertyId ?? null,
    propertyName: item.propertyName ?? null,
    propertyAddress: item.propertyAddress ?? null,
    tenantId: item.tenantId ?? null,
    roomId: item.roomId ?? null,
    roomCode: item.roomCode ?? null,
    roomStatus: item.roomStatus ?? null,
    primaryTenantProfileId: item.primaryTenantProfileId ?? null,
    customerName: item.customerName ?? item.primaryTenantName ?? null,
    primaryTenantName: item.primaryTenantName ?? item.customerName ?? null,
    phone: item.phone ?? item.primaryTenantPhone ?? null,
    email: item.email ?? item.primaryTenantEmail ?? null,
    expectedLeaseSignDate: item.expectedLeaseSignDate ?? null,
    expectedMoveInDate: item.expectedMoveInDate ?? null,
    startDate: item.startDate ?? null,
    endDate: item.endDate ?? null,
    rentStartDate: item.rentStartDate ?? null,
    monthlyRent: item.monthlyRent ?? null,
    paymentCycleMonths: item.paymentCycleMonths ?? null,
    depositAmount: item.depositAmount ?? null,
    contractStatus: item.contractStatus ?? item.status ?? null,
    status: item.status ?? item.contractStatus ?? null,
    depositStatus: item.depositStatus ?? null,
    workflowStatus: item.workflowStatus ?? null,
    occupantsCount:
      item.occupantsCount ??
      item.occupantCount ??
      item.peopleCount ??
      item.roomOccupantCount ??
      (Array.isArray(item.occupants) ? item.occupants.length : null),
    contractFileId:
      item.contractFileId ??
      item.fileId ??
      item.contractFile?.id ??
      item.contractFile?.fileId ??
      null,
    contractFileName:
      item.contractFileName ??
      item.fileName ??
      item.contractFile?.fileName ??
      null,
    contractFileUploadedAt:
      item.contractFileUploadedAt ??
      item.uploadedAt ??
      item.contractFile?.uploadedAt ??
      null,
    depositSignedFileId: item.depositSignedFileId ?? null,
    signedAt: item.signedAt ?? null,
    createdAt: item.createdAt ?? null,
    accountProvisioned: item.accountProvisioned ?? false,
    emailAvailable: item.emailAvailable ?? Boolean(item.email),
    previousContractId: item.previousContractId ?? null,
    previousContractCode: item.previousContractCode ?? null,
    renewedContractId: item.renewedContractId ?? item.nextContractId ?? null,
    renewedContractCode:
      item.renewedContractCode ??
      item.nextContractCode ??
      null,
    tenantIntention: item.tenantIntention ?? null,
    expectedVacantDate: item.expectedVacantDate ?? null,
    transferRequestId: item.transferRequestId ?? null,
    transferRequestCode: item.transferRequestCode ?? null,
    transferStatus: item.transferStatus ?? null,
    transferRequestedDate: item.transferRequestedDate ?? null,
    transferContractRole: item.transferContractRole ?? null,
    transferActivationLocked: item.transferActivationLocked ?? false,
    intentionRecordedAt: item.intentionRecordedAt ?? null,
    intentionNote:
      item.intentionNote ??
      item.tenantIntentionNote ??
      null,
    intentionSource: item.intentionSource ?? null,
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
  const data = await authenticatedFetch(`${API_BASE_URL}/lease-contracts/${encodeURIComponent(leaseContractId)}/liquidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return normalizeLeaseContractItem(data);
}

export async function renewLeaseContract(leaseContractId, payload) {
  if (!leaseContractId) {
    throw new Error("Không xác định được hợp đồng cần tái ký.");
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

export async function recordLeaseContractTenantIntention(leaseContractId, payload) {
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

export async function downloadLeaseContractDraftPdf(contractId) {
  const popup = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
  if (popup) {
    popup.document.write("<!doctype html><title>Đang xử lý PDF</title><p style=\"font-family:Arial,sans-serif;padding:24px\">Đang tải PDF hợp đồng...</p>");
  }

  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/lease-contracts/${encodeURIComponent(contractId)}/draft-pdf`, {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error("Không thể tải file PDF hợp đồng.");
    }
    const blob = await response.blob();
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

function normalizeLeaseContractDetails(details = {}) {
  if (!details || typeof details !== "object") return null;
  const rawContractFile = details.contractFile ?? null;
  const rawOccupants =
    details.occupants ??
    details.contractOccupants ??
    details.occupantInfos ??
    details.residents ??
    [];
  const contractFile = rawContractFile
    ? {
        ...rawContractFile,
        id: rawContractFile.id ?? rawContractFile.fileId ?? null,
        fileName: rawContractFile.fileName ?? rawContractFile.name ?? null,
        uploadedAt: rawContractFile.uploadedAt ?? rawContractFile.createdAt ?? null,
      }
    : null;
  const rawPrimaryTenant = details.primaryTenant ?? {};
  const primaryTenant = rawPrimaryTenant
    ? {
        ...rawPrimaryTenant,
        id: rawPrimaryTenant.id ?? rawPrimaryTenant.tenantProfileId ?? null,
        fullName: rawPrimaryTenant.fullName ?? "",
        phone: rawPrimaryTenant.phone ?? "",
        email: rawPrimaryTenant.email ?? "",
        dob:
          rawPrimaryTenant.dob ??
          rawPrimaryTenant.dateOfBirth ??
          rawPrimaryTenant.birthDate ??
          null,
        dateOfBirth:
          rawPrimaryTenant.dateOfBirth ??
          rawPrimaryTenant.dob ??
          rawPrimaryTenant.birthDate ??
          null,
        permanentAddress: rawPrimaryTenant.permanentAddress ?? "",
        citizenId:
          rawPrimaryTenant.citizenId ??
          rawPrimaryTenant.identityNumber ??
          rawPrimaryTenant.idNumber ??
          rawPrimaryTenant.docNumber ??
          null,
        identityIssuedDate:
          rawPrimaryTenant.identityIssuedDate ??
          rawPrimaryTenant.issuedDate ??
          rawPrimaryTenant.issueDate ??
          null,
        identityIssuedPlace:
          rawPrimaryTenant.identityIssuedPlace ??
          rawPrimaryTenant.issuedPlace ??
          rawPrimaryTenant.issuePlace ??
          "",
      }
    : {};
  return {
    ...details,
    contractId: details.contractId ?? null,
    contractCode: details.contractCode ?? "",
    depositAgreementId: details.depositAgreementId ?? null,
    depositSignedFileId: details.depositSignedFileId ?? null,
    tenantId: details.tenantId ?? null,
    startDate: details.startDate ?? null,
    endDate: details.endDate ?? null,
    rentStartDate: details.rentStartDate ?? null,
    monthlyRent: details.monthlyRent ?? null,
    paymentCycleMonths: details.paymentCycleMonths ?? null,
    depositAmount: details.depositAmount ?? null,
    occupantsCount:
      details.occupantsCount ??
      details.occupantCount ??
      (Array.isArray(rawOccupants) ? rawOccupants.length : null),
    status: details.status ?? null,
    signedAt: details.signedAt ?? null,
    previousContractId: details.previousContractId ?? null,
    previousContractCode: details.previousContractCode ?? null,
    renewedContractId:
      details.renewedContractId ??
      details.nextContractId ??
      null,
    renewedContractCode:
      details.renewedContractCode ??
      details.nextContractCode ??
      null,
    tenantIntention: details.tenantIntention ?? null,
    expectedVacantDate: details.expectedVacantDate ?? null,
    transferRequestId: details.transferRequestId ?? null,
    transferRequestCode: details.transferRequestCode ?? null,
    transferStatus: details.transferStatus ?? null,
    transferRequestedDate: details.transferRequestedDate ?? null,
    transferContractRole: details.transferContractRole ?? null,
    transferActivationLocked: details.transferActivationLocked ?? false,
    intentionRecordedAt: details.intentionRecordedAt ?? null,
    intentionNote:
      details.intentionNote ??
      details.tenantIntentionNote ??
      null,
    intentionSource: details.intentionSource ?? null,
    canRenew: details.canRenew ?? false,
    canRenewBlockedReason: details.canRenewBlockedReason ?? "",
    canLiquidate: details.canLiquidate ?? false,
    canSendAccount: details.canSendAccount ?? false,
    accountProvisioningStatus:
      details.accountProvisioningStatus ??
      "NOT_PROVISIONED",
    room: details.room ?? {},
    property: details.property ?? {},
    primaryTenant,
    contractFile,
    occupants: Array.isArray(rawOccupants)
      ? rawOccupants.map((occupant) => ({
          ...occupant,
          tenantProfileId: occupant.tenantProfileId ?? null,
          fullName: occupant.fullName ?? "",
          phone: occupant.phone ?? "",
          email: occupant.email ?? "",
          dob:
            occupant.dob ??
            occupant.dateOfBirth ??
            occupant.birthDate ??
            null,
          dateOfBirth:
            occupant.dateOfBirth ??
            occupant.dob ??
            occupant.birthDate ??
            null,
          permanentAddress: occupant.permanentAddress ?? "",
          citizenId:
            occupant.citizenId ??
            occupant.cccd ??
            occupant.identityNumber ??
            occupant.idNumber ??
            occupant.docNumber ??
            null,
          identityIssuedDate:
            occupant.identityIssuedDate ??
            occupant.issuedDate ??
            occupant.issueDate ??
            null,
          identityIssuedPlace:
            occupant.identityIssuedPlace ??
            occupant.issuedPlace ??
            occupant.issuePlace ??
            "",
          occupantRole: occupant.occupantRole ?? null,
          moveInDate: occupant.moveInDate ?? null,
          moveOutDate: occupant.moveOutDate ?? null,
          status: occupant.status ?? null,
          accountStatus: occupant.accountStatus ?? "NOT_PROVISIONED",
          accountSentAt: occupant.accountSentAt ?? null,
          lastLoginAt: occupant.lastLoginAt ?? null,
          mustChangePassword:
            occupant.mustChangePassword ??
            null,
        }))
      : [],
    events: Array.isArray(details.events)
      ? details.events.map((event) => ({
          ...event,
          id: event.id ?? null,
          eventType: event.eventType ?? "",
          eventData: event.eventData ?? "",
          createdAt: event.createdAt ?? null,
        }))
      : [],
  };
}

function normalizeRentalHistory(data = {}) {
  return {
    roomId: data.roomId ?? null,
    roomCode: data.roomCode ?? "",
    roomName: data.roomName ?? "",
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
  if (filters.tenantProfileId) params.set("tenantProfileId", String(filters.tenantProfileId));
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
    throw new Error("Không xác định được tenant hoặc phòng để tải lịch sử thuê.");
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
