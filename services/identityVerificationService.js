import { authenticatedFetch } from "@/services/identityAccessService";

const readFirst = (source = {}, keys = []) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return value;
    }
  }
  return "";
};

const normalizeDateValue = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const slashDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashDate) {
    return `${slashDate[3]}-${slashDate[2]}-${slashDate[1]}`;
  }

  const compactDate = text.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compactDate) {
    return `${compactDate[3]}-${compactDate[2]}-${compactDate[1]}`;
  }

  return "";
};

export function normalizeCccdScanResult(payload = {}) {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const rawIdentity = data?.extractedIdentity || data?.identity || {};
  const idNumber = String(readFirst(rawIdentity, ["idNumber", "id_number", "citizenId", "citizen_id", "cccdNumber"])).trim();

  return {
    success: Boolean(data?.success ?? idNumber),
    code: data?.code || "",
    message: data?.message || "",
    qrExtracted: Boolean(data?.qrExtracted),
    ocrExtracted: Boolean(data?.ocrExtracted),
    extractionMethod: data?.extractionMethod || "",
    rawQrPayload: data?.rawQrPayload || "",
    identity: {
      idNumber,
      oldIdNumber: String(readFirst(rawIdentity, ["oldIdNumber", "old_id_number"])).trim(),
      fullName: String(readFirst(rawIdentity, ["fullName", "full_name", "name"])).trim(),
      dob: normalizeDateValue(readFirst(rawIdentity, ["dob", "birthDate", "dateOfBirth", "date_of_birth"])),
      gender: String(readFirst(rawIdentity, ["gender", "sex"])).trim(),
      address: String(readFirst(rawIdentity, ["address", "permanentAddress", "permanent_address"])).trim(),
      issuedDate: normalizeDateValue(readFirst(rawIdentity, ["issuedDate", "issued_date", "idIssueDate", "id_issue_date"])),
    },
  };
}

export async function scanCccdQrImage(cccdImage) {
  const formData = new FormData();
  formData.append("cccdImage", cccdImage);

  const data = await authenticatedFetch("/identity-verification/cccd/qr/scan", {
    method: "POST",
    body: formData,
  });

  return normalizeCccdScanResult(data);
}
