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

  const separatedDate = text.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (separatedDate) {
    return `${separatedDate[3]}-${separatedDate[2]}-${separatedDate[1]}`;
  }

  const compactDate = text.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compactDate) {
    return `${compactDate[3]}-${compactDate[2]}-${compactDate[1]}`;
  }

  return "";
};

const titleCaseName = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("vi-VN")
    .replace(/\s+/g, " ")
    .replace(/(^|\s)(\S)/gu, (match, prefix, char) => `${prefix}${char.toLocaleUpperCase("vi-VN")}`);

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
      fullName: titleCaseName(readFirst(rawIdentity, ["fullName", "full_name", "name"])),
      dob: normalizeDateValue(readFirst(rawIdentity, ["dob", "birthDate", "dateOfBirth", "date_of_birth"])),
      gender: String(readFirst(rawIdentity, ["gender", "sex"])).trim(),
      address: String(readFirst(rawIdentity, ["address", "permanentAddress", "permanent_address"])).trim(),
      issuedDate: normalizeDateValue(readFirst(rawIdentity, ["issuedDate", "issued_date", "idIssueDate", "id_issue_date"])),
      issuedPlace: String(readFirst(rawIdentity, ["issuedPlace", "issued_place", "idIssuePlace", "id_issue_place"])).trim(),
    },
  };
}

export async function extractCccdImages(frontImage, backImage) {
  const formData = new FormData();
  formData.append("frontImage", frontImage);
  formData.append("backImage", backImage);

  if (process.env.NODE_ENV !== "production") {
    console.debug("[identityVerification] POST /identity-verification/cccd/extract");
  }

  const data = await authenticatedFetch("/identity-verification/cccd/extract", {
    method: "POST",
    body: formData,
  });

  return normalizeCccdScanResult(data);
}
