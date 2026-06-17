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
  const contractId = item.contractId ?? item.contract_id ?? item.leaseContractId ?? item.lease_contract_id ?? null;
  const depositCode = item.depositCode ?? item.deposit_code ?? null;
  const contractCode = item.contractCode ?? item.contract_code ?? null;
  const legacyContractCode = contractId
    ? item.displayCode ?? item.display_code ?? item.code ?? null
    : null;
  const displayedContractCode = contractCode ?? legacyContractCode ?? "";

  return {
    ...item,
    sourceType: item.sourceType ?? item.source_type ?? null,
    contractId,
    leaseContractId: item.leaseContractId ?? item.lease_contract_id ?? contractId,
    depositAgreementId: item.depositAgreementId ?? item.deposit_agreement_id ?? null,
    code: displayedContractCode,
    displayCode: displayedContractCode,
    depositCode,
    contractCode,
    propertyId: item.propertyId ?? item.property_id ?? null,
    propertyName: item.propertyName ?? item.property_name ?? null,
    propertyAddress: item.propertyAddress ?? item.property_address ?? null,
    tenantId: item.tenantId ?? item.tenant_id ?? null,
    roomId: item.roomId ?? item.room_id ?? null,
    roomCode: item.roomCode ?? item.room_code ?? null,
    roomStatus: item.roomStatus ?? item.room_status ?? null,
    primaryTenantProfileId: item.primaryTenantProfileId ?? item.primary_tenant_profile_id ?? null,
    customerName: item.customerName ?? item.customer_name ?? item.primaryTenantName ?? item.primary_tenant_name ?? null,
    primaryTenantName: item.primaryTenantName ?? item.primary_tenant_name ?? item.customerName ?? item.customer_name ?? null,
    phone: item.phone ?? item.primaryTenantPhone ?? item.primary_tenant_phone ?? null,
    email: item.email ?? item.primaryTenantEmail ?? item.primary_tenant_email ?? null,
    expectedLeaseSignDate: item.expectedLeaseSignDate ?? item.expected_lease_sign_date ?? null,
    expectedMoveInDate: item.expectedMoveInDate ?? item.expected_move_in_date ?? null,
    startDate: item.startDate ?? item.start_date ?? null,
    endDate: item.endDate ?? item.end_date ?? null,
    rentStartDate: item.rentStartDate ?? item.rent_start_date ?? null,
    monthlyRent: item.monthlyRent ?? item.monthly_rent ?? null,
    paymentCycleMonths: item.paymentCycleMonths ?? item.payment_cycle_months ?? null,
    depositAmount: item.depositAmount ?? item.deposit_amount ?? null,
    contractStatus: item.contractStatus ?? item.contract_status ?? item.status ?? null,
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
    signedAt: item.signedAt ?? item.signed_at ?? null,
    createdAt: item.createdAt ?? item.created_at ?? null,
    accountProvisioned: item.accountProvisioned ?? item.account_provisioned ?? false,
    emailAvailable: item.emailAvailable ?? item.email_available ?? Boolean(item.email),
    previousContractId: item.previousContractId ?? item.previous_contract_id ?? null,
    previousContractCode: item.previousContractCode ?? item.previous_contract_code ?? null,
    renewedContractId: item.renewedContractId ?? item.renewed_contract_id ?? item.nextContractId ?? item.next_contract_id ?? null,
    renewedContractCode:
      item.renewedContractCode ??
      item.renewed_contract_code ??
      item.nextContractCode ??
      item.next_contract_code ??
      null,
    tenantIntention: item.tenantIntention ?? item.tenant_intention ?? null,
    expectedVacantDate: item.expectedVacantDate ?? item.expected_vacant_date ?? null,
    intentionRecordedAt: item.intentionRecordedAt ?? item.intention_recorded_at ?? null,
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
        start_date: payload.startDate,
        end_date: payload.endDate,
        payment_cycle_months: payload.paymentCycleMonths,
        monthly_rent: payload.monthlyRent,
        deposit_amount: payload.depositAmount,
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
        new_start_date: payload.newStartDate,
        new_end_date: payload.newEndDate,
        monthly_rent: payload.monthlyRent,
        payment_cycle_months: payload.paymentCycleMonths,
        deposit_amount: payload.depositAmount,
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
        expected_move_out_date: payload.expectedMoveOutDate || null,
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
        id: rawContractFile.id ?? rawContractFile.fileId ?? rawContractFile.file_id ?? null,
        fileName: rawContractFile.fileName ?? rawContractFile.file_name ?? rawContractFile.name ?? null,
        uploadedAt: rawContractFile.uploadedAt ?? rawContractFile.uploaded_at ?? rawContractFile.createdAt ?? rawContractFile.created_at ?? null,
      }
    : null;
  const rawPrimaryTenant = details.primaryTenant ?? details.primary_tenant ?? {};
  const primaryTenant = rawPrimaryTenant
    ? {
        ...rawPrimaryTenant,
        id: rawPrimaryTenant.id ?? rawPrimaryTenant.tenantProfileId ?? rawPrimaryTenant.tenant_profile_id ?? null,
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
        permanentAddress: rawPrimaryTenant.permanentAddress ?? rawPrimaryTenant.permanent_address ?? "",
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
    startDate: details.startDate ?? details.start_date ?? null,
    endDate: details.endDate ?? details.end_date ?? null,
    rentStartDate: details.rentStartDate ?? details.rent_start_date ?? null,
    monthlyRent: details.monthlyRent ?? details.monthly_rent ?? null,
    paymentCycleMonths: details.paymentCycleMonths ?? details.payment_cycle_months ?? null,
    depositAmount: details.depositAmount ?? details.deposit_amount ?? null,
    occupantsCount:
      details.occupantsCount ??
      details.occupants_count ??
      details.occupantCount ??
      details.occupant_count ??
      (Array.isArray(rawOccupants) ? rawOccupants.length : null),
    status: details.status ?? null,
    signedAt: details.signedAt ?? details.signed_at ?? null,
    previousContractId: details.previousContractId ?? details.previous_contract_id ?? null,
    previousContractCode: details.previousContractCode ?? details.previous_contract_code ?? null,
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
    tenantIntention: details.tenantIntention ?? details.tenant_intention ?? null,
    expectedVacantDate: details.expectedVacantDate ?? details.expected_vacant_date ?? null,
    intentionRecordedAt: details.intentionRecordedAt ?? details.intention_recorded_at ?? null,
    intentionNote:
      details.intentionNote ??
      details.intention_note ??
      details.tenantIntentionNote ??
      details.tenant_intention_note ??
      null,
    intentionSource: details.intentionSource ?? details.intention_source ?? null,
    canRenew: details.canRenew ?? details.can_renew ?? false,
    canRenewBlockedReason:
      details.canRenewBlockedReason ??
      details.can_renew_blocked_reason ??
      "",
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
    occupants: Array.isArray(rawOccupants)
      ? rawOccupants.map((occupant) => ({
          ...occupant,
          tenantProfileId: occupant.tenantProfileId ?? occupant.tenant_profile_id ?? null,
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
          permanentAddress: occupant.permanentAddress ?? occupant.permanent_address ?? "",
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
          accountSentAt: occupant.accountSentAt ?? occupant.account_sent_at ?? null,
          lastLoginAt: occupant.lastLoginAt ?? occupant.last_login_at ?? null,
          mustChangePassword:
            occupant.mustChangePassword ??
            occupant.must_change_password ??
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
  if (filters.roomId) params.set("room_id", String(filters.roomId));
  if (filters.propertyId) params.set("property_id", String(filters.propertyId));
  if (filters.tenantProfileId) params.set("tenant_profile_id", String(filters.tenantProfileId));
  if (filters.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters.dateTo) params.set("date_to", filters.dateTo);
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
