"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  FileText,
  Home,
  Mail,
  MapPin,
  Phone,
  Ruler,
  RotateCcw,
  ShieldCheck,
  Wifi,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ROOM_HOLD_DURATION_MS,
  clearRoomHold,
  createRoomHold,
  formatHoldCountdown,
} from "../../../lib/roomHoldStorage";
import {
  cancelDepositPayment,
  checkoutDeposit,
  fetchDepositPaymentStatus,
  fetchDepositRoomHoldStatus,
  fetchPublicRoomById,
  normalizeApiRoom,
} from "../../../services/roomsService";
import {
  fetchMyTenantProfile,
  fetchPrivateFile,
  lookupPersonProfileByPhone,
} from "../../../services/tenantProfilesService";
import { previewDepositContract } from "../../../services/depositContractsService";
import { getAuthToken } from "../../../services/identityAccessService";
import CameraCapture from "../../../components/CameraCapture";
import DateInput from "../../../components/DateInput";
import PortraitUploadZone from "../../../components/deposit/PortraitUploadZone";
import CccdUploadFlow from "../../../components/identity/CccdUploadFlow";
import IdentityEntryModeSelector from "../../../components/identity/IdentityEntryModeSelector";
import { extractCccdImages, normalizeGenderLabel } from "../../../services/identityVerificationService";

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;
}

const resolvePaymentExpiresAtMs = (paymentIntent) => {
  const expiresAt = paymentIntent?.expiresAt ?? paymentIntent?.expires_at;
  if (!expiresAt) return null;

  const parsed = new Date(expiresAt).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

const readPaymentIntentId = (paymentIntent) =>
  paymentIntent?.paymentIntentId ??
  paymentIntent?.payment_intent_id ??
  paymentIntent?.id ??
  null;

const readPaymentContent = (paymentIntent) =>
  paymentIntent?.paymentContent ??
  paymentIntent?.payment_content ??
  paymentIntent?.description ??
  "";

const readTransferDescription = (paymentIntent) =>
  paymentIntent?.transferDescription ??
  paymentIntent?.transfer_description ??
  paymentIntent?.description ??
  "";

const readCheckoutUrl = (paymentIntent) =>
  paymentIntent?.checkoutUrl ??
  paymentIntent?.checkout_url ??
  paymentIntent?.checkOutUrl ??
  paymentIntent?.check_out_url ??
  "";

const readQrPayload = (paymentIntent) =>
  paymentIntent?.qrPayload ??
  paymentIntent?.qr_payload ??
  paymentIntent?.qrCode ??
  paymentIntent?.qr_code ??
  "";

const isPaidPaymentStatus = (status) => {
  const paymentStatus = String(status?.status ?? "").toUpperCase();
  const depositStatus = String(
    status?.depositStatus ?? status?.deposit_status ?? "",
  ).toUpperCase();

  return (
    paymentStatus === "SUCCEEDED" ||
    depositStatus === "PAID" ||
    depositStatus === "CONFIRMED"
  );
};

const isTerminalFailedPaymentStatus = (status) => {
  const paymentStatus = String(status?.status ?? "").toUpperCase();

  return (
    paymentStatus === "EXPIRED" ||
    paymentStatus === "FAILED" ||
    paymentStatus === "CANCELLED"
  );
};

const copyTextToClipboard = async (value) => {
  const text = String(value ?? "").trim();
  if (!text) return false;

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
};

const normalizeHoldStatus = (status) => {
  if (!status) return null;

  const remainingSeconds = Number(
    status.remainingSeconds ?? status.remaining_seconds ?? 0,
  );

  return {
    canBook: Boolean(status.canBook ?? status.can_book),
    roomStatus: status.roomStatus ?? status.room_status ?? "",
    holdStatus: status.holdStatus ?? status.hold_status ?? null,
    holdExpiresAt: status.holdExpiresAt ?? status.hold_expires_at ?? null,
    remainingSeconds: Number.isFinite(remainingSeconds) ? remainingSeconds : 0,
    message: status.message ?? "",
  };
};

const toBlockingStatus = (status) => {
  const normalizedStatus = normalizeHoldStatus(status);
  if (!normalizedStatus || normalizedStatus.canBook) return null;
  if (
    String(normalizedStatus.roomStatus || "").toUpperCase() === "SOON_VACANT" &&
    !normalizedStatus.holdStatus &&
    normalizedStatus.remainingSeconds <= 0
  ) {
    return null;
  }

  return {
    ...normalizedStatus,
    remainingMs: Math.max(0, normalizedStatus.remainingSeconds * 1000),
  };
};

const toBlockingStatusFromMessage = (message) => {
  const text = String(message || "");
  const match = text.match(/(\d+)\s*giây/i);
  if (!match) return null;

  const remainingSeconds = Number(match[1]);
  if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 0) return null;

  return {
    canBook: false,
    roomStatus: "ON_HOLD",
    holdStatus: "ACTIVE",
    remainingSeconds,
    remainingMs: remainingSeconds * 1000,
    message: text,
  };
};

const DATE_IN_PAST_ERROR_MESSAGE =
  "Ngày chọn không được là ngày trong quá khứ.";
const DATE_TOO_FAR_ERROR_MESSAGE =
  "Ngày chọn chỉ được tối đa 14 ngày kể từ hôm nay.";
const MOVE_IN_BEFORE_LEASE_SIGN_DATE_ERROR_MESSAGE =
  "Ngày dự kiến vào ở không được trước ngày hẹn ký hợp đồng.";
const MAX_DEPOSIT_SCHEDULE_DAYS = 14;
const MAX_DEPOSIT_UPLOAD_FILE_BYTES = 10 * 1024 * 1024;
const MAX_DEPOSIT_UPLOAD_TOTAL_BYTES = 30 * 1024 * 1024;

const cccdFilesSignature = (frontFile, backFile) =>
  [frontFile, backFile]
    .map((file) => (file ? `${file.name || "cccd"}:${file.size || 0}:${file.lastModified || 0}` : ""))
    .join("|");

const toLocalDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateStringWithOffset = (days) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toLocalDateInputValue(date);
};

const getTodayDateString = () => getDateStringWithOffset(0);
const getMaxDepositScheduleDateString = () =>
  getDateStringWithOffset(MAX_DEPOSIT_SCHEDULE_DAYS);

const normalizeDateInputString = (value) => {
  const text = String(value || "").trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const displayMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const match = isoMatch || displayMatch;
  if (!match) return "";

  const year = Number(isoMatch ? match[1] : match[3]);
  const month = Number(isoMatch ? match[2] : match[2]);
  const day = Number(isoMatch ? match[3] : match[1]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const addDaysToDateString = (value, days) => {
  const normalizedValue = normalizeDateInputString(value);
  if (!normalizedValue) return "";

  const [year, month, day] = normalizedValue.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toLocalDateInputValue(date);
};

const formatDateForMessage = (value) => {
  const normalizedValue = normalizeDateInputString(value);
  if (!normalizedValue) return "";

  const [year, month, day] = normalizedValue.split("-");
  return `${day}/${month}/${year}`;
};

const getLaterDateString = (...values) =>
  values
    .map((value) => normalizeDateInputString(value))
    .filter(Boolean)
    .sort()
    .pop() || "";

const buildDepositScheduleWindow = (room) => {
  const todayDate = getTodayDateString();
  const defaultMaxDate = getMaxDepositScheduleDateString();
  const isSoonVacant = room?.status === "soonVacant";
  const expectedVacantDate = normalizeDateInputString(room?.expectedVacantDate);

  if (!isSoonVacant || !expectedVacantDate) {
    return {
      isSoonVacant: false,
      expectedVacantDate: "",
      minDate: todayDate,
      maxDate: defaultMaxDate,
    };
  }

  return {
    isSoonVacant: true,
    expectedVacantDate,
    minDate: addDaysToDateString(expectedVacantDate, 1),
    maxDate: addDaysToDateString(expectedVacantDate, MAX_DEPOSIT_SCHEDULE_DAYS),
  };
};

const REQUIRED_DEPOSIT_MESSAGES = {
  contractTermMonths: "Vui lòng nhập thời hạn hợp đồng.",
  fullName: "Vui lòng nhập họ và tên.",
  birthDate: "Vui lòng chọn ngày sinh.",
  gender: "Vui lòng chọn giới tính.",
  phone: "Vui lòng nhập số điện thoại.",
  citizenId: "Vui lòng nhập số CCCD.",
  idIssueDate: "Vui lòng chọn ngày cấp CCCD.",
  idIssuePlace: "Vui lòng nhập nơi cấp CCCD.",
  permanentAddress: "Vui lòng nhập địa chỉ thường trú.",
  paymentCycleMonths: "Vui lòng chọn chu kỳ thanh toán.",
  contractDate: "Vui lòng chọn ngày hẹn ký hợp đồng.",
  moveInDate: "Vui lòng chọn ngày dự kiến vào ở.",
  citizenIdFront: "Vui lòng tải lên ảnh mặt trước CCCD.",
  citizenIdBack: "Vui lòng tải lên ảnh mặt sau CCCD.",
  portraitImage: "Vui lòng tải lên ảnh chân dung.",
  occupantCount: "Vui lòng chọn số lượng người ở.",
  coOccupant1FullName: "Vui lòng nhập họ tên người ở cùng 1.",
  coOccupant1Phone: "Vui lòng nhập số điện thoại người ở cùng 1.",
  coOccupant2FullName: "Vui lòng nhập họ tên người ở cùng 2.",
  coOccupant2Phone: "Vui lòng nhập số điện thoại người ở cùng 2.",
  terms: "Vui lòng xác nhận cam kết thông tin.",
};

const BACKEND_DEPOSIT_FIELD_MAP = {
  contractTermMonths: "contractTermMonths",
  contract_term_months: "contractTermMonths",
  roomId: "roomId",
  room_id: "roomId",
  fullName: "fullName",
  full_name: "fullName",
  dob: "birthDate",
  birthDate: "birthDate",
  gender: "gender",
  phone: "phone",
  email: "email",
  idNumber: "citizenId",
  id_number: "citizenId",
  citizenId: "citizenId",
  idIssueDate: "idIssueDate",
  id_issue_date: "idIssueDate",
  idIssuePlace: "idIssuePlace",
  id_issue_place: "idIssuePlace",
  permanentAddress: "permanentAddress",
  permanent_address: "permanentAddress",
  paymentCycleMonths: "paymentCycleMonths",
  payment_cycle_months: "paymentCycleMonths",
  expectedLeaseSignDate: "contractDate",
  expected_lease_sign_date: "contractDate",
  expectedMoveInDate: "moveInDate",
  expected_move_in_date: "moveInDate",
  idFrontFile: "citizenIdFront",
  id_front_file: "citizenIdFront",
  idBackFile: "citizenIdBack",
  id_back_file: "citizenIdBack",
  portraitFile: "portraitImage",
  portrait_file: "portraitImage",
  occupantCount: "occupantCount",
  occupant_count: "occupantCount",
  coOccupants: "coOccupants",
  co_occupants: "coOccupants",
  coOccupantInformationValid: "occupantCount",
  co_occupant_information_valid: "occupantCount",
  metadata: "_form",
  files: "_form",
};

const API_ERROR_HINTS = [
  {
    pattern: /contract\s*term|contractTermMonths|contract_term_months/i,
    field: "contractTermMonths",
  },
  {
    pattern: /full\s*name|fullName|full_name|họ\s*và\s*tên/i,
    field: "fullName",
  },
  { pattern: /dob|birth|ngày\s*sinh|age|tuổi/i, field: "birthDate" },
  { pattern: /gender|sex|giới\s*tính/i, field: "gender" },
  { pattern: /phone|số\s*điện\s*thoại/i, field: "phone" },
  { pattern: /email/i, field: "email" },
  {
    pattern: /id\s*number|idNumber|id_number|citizen|cccd|cmnd/i,
    field: "citizenId",
  },
  {
    pattern: /id\s*issue\s*date|idIssueDate|id_issue_date|ngày\s*cấp/i,
    field: "idIssueDate",
  },
  {
    pattern: /id\s*issue\s*place|idIssuePlace|id_issue_place|nơi\s*cấp/i,
    field: "idIssuePlace",
  },
  {
    pattern:
      /permanent\s*address|permanentAddress|permanent_address|địa\s*chỉ/i,
    field: "permanentAddress",
  },
  {
    pattern:
      /payment\s*cycle|paymentCycleMonths|payment_cycle_months|chu\s*kỳ\s*thanh\s*toán/i,
    field: "paymentCycleMonths",
  },
  {
    pattern:
      /lease\s*sign|expectedLeaseSignDate|expected_lease_sign_date|ký\s*hợp\s*đồng/i,
    field: "contractDate",
  },
  {
    pattern: /move\s*in|expectedMoveInDate|expected_move_in_date|vào\s*ở/i,
    field: "moveInDate",
  },
  {
    pattern: /idFrontFile|id_front_file|mặt\s*trước/i,
    field: "citizenIdFront",
  },
  { pattern: /idBackFile|id_back_file|mặt\s*sau/i, field: "citizenIdBack" },
  {
    pattern: /portraitFile|portrait_file|portrait|chân\s*dung/i,
    field: "portraitImage",
  },
  {
    pattern: /occupant|coOccupants|co_occupants|người\s*ở/i,
    field: "occupantCount",
  },
];

const DEPOSIT_FIELD_LABELS = {
  contractTermMonths: "thời hạn hợp đồng",
  fullName: "họ và tên",
  birthDate: "ngày sinh",
  gender: "giới tính",
  phone: "số điện thoại",
  email: "email",
  citizenId: "số CCCD",
  idIssueDate: "ngày cấp CCCD",
  idIssuePlace: "nơi cấp CCCD",
  permanentAddress: "địa chỉ thường trú",
  paymentCycleMonths: "chu kỳ thanh toán",
  contractDate: "ngày hẹn ký hợp đồng",
  moveInDate: "ngày dự kiến vào ở",
  citizenIdFront: "ảnh mặt trước CCCD",
  citizenIdBack: "ảnh mặt sau CCCD",
  portraitImage: "ảnh chân dung",
  occupantCount: "số lượng người ở",
  coOccupants: "thông tin người ở cùng",
  terms: "hợp đồng đặt cọc",
};

const buildRetryFieldMessage = (fieldName, fallbackMessage) => {
  const label = DEPOSIT_FIELD_LABELS[fieldName];
  if (!label) return fallbackMessage || "Vui lòng nhập lại trường này.";

  return `Vui lòng nhập lại ${label}.`;
};

const normalizeBackendFieldName = (fieldName) => {
  const normalizedFieldName = String(fieldName || "").replace(
    /^metadata\.?/,
    "",
  );
  return (
    BACKEND_DEPOSIT_FIELD_MAP[normalizedFieldName] ||
    BACKEND_DEPOSIT_FIELD_MAP[fieldName] ||
    ""
  );
};

const collectErrorText = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value))
    return value.map(collectErrorText).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return [
      value.field,
      value.name,
      value.message,
      value.defaultMessage,
      value.details,
      value.error,
    ]
      .map(collectErrorText)
      .filter(Boolean)
      .join(" ");
  }
  return String(value);
};

const getCheckoutErrorMessage = (error) => {
  const payload = error?.payload || {};
  const message = [payload.details, payload.message, error?.message]
    .map(collectErrorText)
    .map((value) => value.trim())
    .find((value) => value && value.toLowerCase() !== "undefined");

  return (
    message ||
    "Không thể gửi thông tin đặt cọc. Vui lòng kiểm tra lại thông tin và thử lại."
  );
};

const extractDepositApiFieldErrors = (error) => {
  const payload = error?.payload || {};
  const candidates = [
    payload.errors,
    payload.fieldErrors,
    payload.violations,
    payload.data?.errors,
    payload.data?.fieldErrors,
  ].filter(Boolean);
  const nextErrors = {};

  candidates.forEach((candidate) => {
    if (Array.isArray(candidate)) {
      candidate.forEach((item) => {
        const fieldName = normalizeBackendFieldName(
          item?.field || item?.name || item?.propertyPath,
        );
        if (fieldName)
          nextErrors[fieldName] = buildRetryFieldMessage(
            fieldName,
            collectErrorText(item),
          );
      });
      return;
    }

    if (typeof candidate === "object") {
      Object.entries(candidate).forEach(([key, value]) => {
        const fieldName = normalizeBackendFieldName(key);
        if (fieldName)
          nextErrors[fieldName] = buildRetryFieldMessage(
            fieldName,
            collectErrorText(value),
          );
      });
    }
  });

  const combinedMessage = [error?.message, payload.message, payload.details]
    .map(collectErrorText)
    .filter(Boolean)
    .join(" ");
  if (!Object.keys(nextErrors).length && combinedMessage) {
    const hintedField = API_ERROR_HINTS.find(({ pattern }) =>
      pattern.test(combinedMessage),
    )?.field;
    if (hintedField)
      nextErrors[hintedField] = buildRetryFieldMessage(
        hintedField,
        combinedMessage,
      );
  }

  return nextErrors;
};

const FULL_NAME_PATTERN = /^[\p{L}\s]+$/u;
const VIETNAM_PHONE_PATTERN = /^0\d{9}$/;
const CITIZEN_ID_PATTERN = /^(?:\d{9}|\d{10}|\d{12})$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENDER_OPTIONS = ["Nam", "Nữ", "Khác"];
const DEPOSIT_DRAFT_COOKIE_NAME = "hdbhmsDepositFormDraft";
const LEGACY_DEPOSIT_DRAFT_COOKIE_NAME = "hdbhms_deposit_form_draft";
const DEPOSIT_DRAFT_MAX_AGE_SECONDS = 30 * 60;
const DEPOSIT_DRAFT_FIELDS = [
  "contractTermMonths",
  "fullName",
  "birthDate",
  "gender",
  "phone",
  "email",
  "citizenId",
  "idIssueDate",
  "idIssuePlace",
  "permanentAddress",
  "paymentCycleMonths",
  "contractDate",
  "moveInDate",
  "note",
  "occupantCount",
  "coOccupant1FullName",
  "coOccupant1Phone",
  "coOccupant2FullName",
  "coOccupant2Phone",
];
const IDENTITY_FIELD_DEFAULTS = {
  fullName: "",
  birthDate: "",
  gender: "",
  citizenId: "",
  idIssueDate: "",
  idIssuePlace: "",
  permanentAddress: "",
};
const IDENTITY_FIELD_NAMES = Object.keys(IDENTITY_FIELD_DEFAULTS);
const DEPOSIT_DATE_FIELDS = new Set([
  "birthDate",
  "idIssueDate",
  "contractDate",
  "moveInDate",
]);
const CO_OCCUPANT_FULL_NAME_FIELDS = new Set([
  "coOccupant1FullName",
  "coOccupant2FullName",
]);
const CO_OCCUPANT_PHONE_FIELDS = new Set([
  "coOccupant1Phone",
  "coOccupant2Phone",
]);
const CO_OCCUPANT_NAME_PATTERN_MESSAGE =
  "Họ tên người ở cùng chỉ được chứa chữ cái và khoảng trắng.";
const CO_OCCUPANT_PHONE_PATTERN_MESSAGE =
  "Số điện thoại người ở cùng phải là số Việt Nam gồm 10 chữ số và bắt đầu bằng 0.";
const CO_OCCUPANT_DUPLICATE_MAIN_PHONE_MESSAGE =
  "Số điện thoại người ở cùng không được trùng với số điện thoại người đặt cọc chính.";
const CO_OCCUPANT_DUPLICATE_PHONE_MESSAGE =
  "Số điện thoại người ở cùng không được trùng nhau.";
const EXISTING_PERSON_PROFILE_HINT =
  "Hồ sơ với số điện thoại này đã có trong hệ thống. Khi lập hợp đồng, hệ thống sẽ dùng lại hồ sơ phù hợp.";
const DepositFormErrorContext = createContext({
  errors: {},
  setError: () => {},
});

const canUseDocumentCookie = () => typeof document !== "undefined";

const readCookie = (name) => {
  if (!canUseDocumentCookie()) return "";

  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`))
      ?.split("=")
      .slice(1)
      .join("=") || ""
  );
};

const readDepositDraftCookie = () => {
  const rawValue =
    readCookie(DEPOSIT_DRAFT_COOKIE_NAME) ||
    readCookie(LEGACY_DEPOSIT_DRAFT_COOKIE_NAME);
  if (!rawValue) return {};

  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};

    return DEPOSIT_DRAFT_FIELDS.reduce((safeDraft, fieldName) => {
      safeDraft[fieldName] =
        typeof parsed[fieldName] === "string" ? parsed[fieldName] : "";
      return safeDraft;
    }, {});
  } catch {
    return {};
  }
};

const writeDepositDraftCookie = (draft) => {
  if (!canUseDocumentCookie()) return;

  const safeDraft = DEPOSIT_DRAFT_FIELDS.reduce((nextDraft, fieldName) => {
    const value = String(draft[fieldName] || "");
    nextDraft[fieldName] = DEPOSIT_DATE_FIELDS.has(fieldName)
      ? normalizeDateInputString(value) || value
      : value;
    return nextDraft;
  }, {});
  const hasValue = Object.values(safeDraft).some((value) => value.trim());

  if (!hasValue) {
    document.cookie = `${DEPOSIT_DRAFT_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }

  document.cookie = `${DEPOSIT_DRAFT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(safeDraft))}; Max-Age=${DEPOSIT_DRAFT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
};

const clearDepositDraftCookie = () => {
  if (!canUseDocumentCookie()) return;

  document.cookie = `${DEPOSIT_DRAFT_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
};

const buildDepositDraftFromForm = (form) => {
  if (!form) return {};

  const formData = new FormData(form);
  const draft = DEPOSIT_DRAFT_FIELDS.reduce((nextDraft, fieldName) => {
    const value = String(formData.get(fieldName) || "");
    nextDraft[fieldName] = DEPOSIT_DATE_FIELDS.has(fieldName)
      ? normalizeDateInputString(value) || value
      : value;
    return nextDraft;
  }, {});
  const occupantCount = Number(draft.occupantCount || 1);
  if (occupantCount < 2) {
    draft.coOccupant1FullName = "";
    draft.coOccupant1Phone = "";
  }
  if (occupantCount < 3) {
    draft.coOccupant2FullName = "";
    draft.coOccupant2Phone = "";
  }
  return draft;
};

const collectDepositFormData = (form) => {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  DEPOSIT_DATE_FIELDS.forEach((fieldName) => {
    const value = String(data[fieldName] || "");
    data[fieldName] = normalizeDateInputString(value) || value.trim();
  });
  const occupantCount = Number(data.occupantCount || 1);
  if (occupantCount < 2) {
    data.coOccupant1FullName = "";
    data.coOccupant1Phone = "";
  }
  if (occupantCount < 3) {
    data.coOccupant2FullName = "";
    data.coOccupant2Phone = "";
  }
  return data;
};

const hasDepositDraftValue = (draft) =>
  Object.values(draft || {}).some((value) => String(value || "").trim());

const normalizePhoneValue = (value) => {
  return String(value || "").replace(/[\s.\-()]/g, "");
};

const validateDepositValue = (
  name,
  value,
  scheduleWindow = null,
  relatedValues = {},
) => {
  const rawValue = String(value || "").trim();
  const isDateField = DEPOSIT_DATE_FIELDS.has(name);
  const normalizedValue = isDateField
    ? normalizeDateInputString(rawValue)
    : rawValue;
  const todayDate = getTodayDateString();
  const maxScheduleDate =
    scheduleWindow?.maxDate || getMaxDepositScheduleDateString();
  const minScheduleDate = scheduleWindow?.minDate || todayDate;
  const isSoonVacantSchedule = Boolean(
    scheduleWindow?.isSoonVacant && scheduleWindow?.expectedVacantDate,
  );
  const expectedVacantDateLabel = formatDateForMessage(
    scheduleWindow?.expectedVacantDate,
  );

  if (name !== "email" && !rawValue) {
    return REQUIRED_DEPOSIT_MESSAGES[name] || "";
  }

  if (isDateField && rawValue && !normalizedValue) {
    return "Vui lòng nhập ngày theo định dạng dd/mm/yyyy.";
  }

  if (name === "fullName" && !FULL_NAME_PATTERN.test(normalizedValue)) {
    return "Họ và tên chỉ được chứa chữ cái và khoảng trắng.";
  }

  if (
    CO_OCCUPANT_FULL_NAME_FIELDS.has(name) &&
    !FULL_NAME_PATTERN.test(normalizedValue)
  ) {
    return CO_OCCUPANT_NAME_PATTERN_MESSAGE;
  }

  if (name === "phone" && !VIETNAM_PHONE_PATTERN.test(normalizedValue)) {
    return "Số điện thoại phải là số Việt Nam gồm 10 chữ số và bắt đầu bằng 0.";
  }

  if (name === "occupantCount" && !["1", "2", "3"].includes(normalizedValue)) {
    return "Số lượng người ở chỉ được chọn từ 1 đến 3.";
  }

  if (name === "contractTermMonths" && (!/^\d+$/.test(normalizedValue) || Number(normalizedValue) < 6)) {
    return "Thời hạn hợp đồng tối thiểu là 6 tháng.";
  }

  if (name === "paymentCycleMonths" && !["1", "3"].includes(normalizedValue)) {
    return "Chu kỳ thanh toán chỉ được chọn 1 hoặc 3 tháng.";
  }

  if (name === "gender" && !GENDER_OPTIONS.includes(normalizedValue)) {
    return REQUIRED_DEPOSIT_MESSAGES.gender;
  }

  if (
    CO_OCCUPANT_PHONE_FIELDS.has(name) &&
    !VIETNAM_PHONE_PATTERN.test(normalizePhoneValue(normalizedValue))
  ) {
    return CO_OCCUPANT_PHONE_PATTERN_MESSAGE;
  }

  if (
    name === "email" &&
    normalizedValue &&
    !EMAIL_PATTERN.test(normalizedValue)
  ) {
    return "Email không đúng định dạng.";
  }

  if (name === "citizenId" && !CITIZEN_ID_PATTERN.test(normalizedValue)) {
    return "Số CCCD phải gồm 9, 10 hoặc 12 chữ số.";
  }

  if (name === "birthDate" && normalizedValue > todayDate) {
    return "Ngày sinh không được lớn hơn ngày hiện tại.";
  }

  if (name === "idIssueDate" && normalizedValue > todayDate) {
    return "Ngày cấp CCCD không được lớn hơn ngày hiện tại.";
  }

  if (
    (name === "contractDate" || name === "moveInDate") &&
    normalizedValue < minScheduleDate
  ) {
    if (isSoonVacantSchedule) {
      return `${DATE_FIELD_LABELS[name]} phải sau ngày khách cũ trả phòng (${expectedVacantDateLabel}).`;
    }
    return DATE_IN_PAST_ERROR_MESSAGE;
  }

  if (
    (name === "contractDate" || name === "moveInDate") &&
    normalizedValue > maxScheduleDate
  ) {
    if (isSoonVacantSchedule) {
      return `${DATE_FIELD_LABELS[name]} chỉ được tối đa 14 ngày kể từ ngày khách cũ trả phòng.`;
    }
    return DATE_TOO_FAR_ERROR_MESSAGE;
  }

  if (name === "moveInDate") {
    const expectedLeaseSignDate = normalizeDateInputString(
      relatedValues?.contractDate || relatedValues?.expectedLeaseSignDate,
    );
    if (
      normalizedValue &&
      expectedLeaseSignDate &&
      normalizedValue < expectedLeaseSignDate
    ) {
      return MOVE_IN_BEFORE_LEASE_SIGN_DATE_ERROR_MESSAGE;
    }
  }

  return "";
};

const validateCoOccupantGroup = ({ occupantCount, coOccupants, mainPhone }) => {
  const nextErrors = {};
  const count = Number(occupantCount || 0);

  if (![1, 2, 3].includes(count)) {
    nextErrors.occupantCount = "Số lượng người ở chỉ được chọn từ 1 đến 3.";
    return nextErrors;
  }

  const normalizedMainPhone = normalizePhoneValue(mainPhone);
  const seenPhones = new Map();

  for (let displayOrder = 1; displayOrder < count; displayOrder += 1) {
    const fullNameField = `coOccupant${displayOrder}FullName`;
    const phoneField = `coOccupant${displayOrder}Phone`;
    const occupant = coOccupants[displayOrder] || {};
    const fullName = String(occupant.fullName || "").trim();
    const phone = normalizePhoneValue(occupant.phone);

    if (!fullName) {
      nextErrors[fullNameField] = REQUIRED_DEPOSIT_MESSAGES[fullNameField];
    } else if (!FULL_NAME_PATTERN.test(fullName)) {
      nextErrors[fullNameField] = CO_OCCUPANT_NAME_PATTERN_MESSAGE;
    }

    if (!phone) {
      nextErrors[phoneField] = REQUIRED_DEPOSIT_MESSAGES[phoneField];
      continue;
    }

    if (!VIETNAM_PHONE_PATTERN.test(phone)) {
      nextErrors[phoneField] = CO_OCCUPANT_PHONE_PATTERN_MESSAGE;
      continue;
    }

    if (phone === normalizedMainPhone) {
      nextErrors[phoneField] = CO_OCCUPANT_DUPLICATE_MAIN_PHONE_MESSAGE;
      continue;
    }

    const duplicatedField = seenPhones.get(phone);
    if (duplicatedField) {
      nextErrors[phoneField] = CO_OCCUPANT_DUPLICATE_PHONE_MESSAGE;
      nextErrors[duplicatedField] =
        nextErrors[duplicatedField] || CO_OCCUPANT_DUPLICATE_PHONE_MESSAGE;
      continue;
    }

    seenPhones.set(phone, phoneField);
  }

  return nextErrors;
};

const validateOccupancyData = (data) =>
  validateCoOccupantGroup({
    occupantCount: data.occupantCount,
    mainPhone: data.phone,
    coOccupants: {
      1: {
        fullName: data.coOccupant1FullName,
        phone: data.coOccupant1Phone,
      },
      2: {
        fullName: data.coOccupant2FullName,
        phone: data.coOccupant2Phone,
      },
    },
  });

const buildDepositMetadata = (room, data) => ({
  roomId: room.roomId || "",
  fullName: String(data.fullName || "").trim(),
  dob: data.birthDate || null,
  gender: normalizeGenderLabel(data.gender),
  phone: String(data.phone || "").trim(),
  email: String(data.email || "").trim(),
  idNumber: String(data.citizenId || "").trim(),
  idIssueDate: data.idIssueDate || null,
  idIssuePlace: String(data.idIssuePlace || "").trim(),
  permanentAddress: String(data.permanentAddress || "").trim(),
  contractTermMonths: Number(data.contractTermMonths || 12),
  depositMonths: 1,
  paymentCycleMonths: Number(data.paymentCycleMonths || 1),
  occupantCount: Number(data.occupantCount || 1),
  coOccupants: [1, 2]
    .filter((displayOrder) => Number(data.occupantCount || 1) > displayOrder)
    .map((displayOrder) => ({
      fullName: String(data[`coOccupant${displayOrder}FullName`] || "").trim(),
      phone: normalizePhoneValue(data[`coOccupant${displayOrder}Phone`] || ""),
      displayOrder,
    })),
  expectedLeaseSignDate: data.contractDate || null,
  expectedMoveInDate: data.moveInDate || null,
});

const signatureFromMetadata = (metadata) => JSON.stringify(metadata);

function Field({
  label,
  name,
  placeholder,
  type = "text",
  className = "",
  required = true,
  min,
  max,
  error,
  onChange,
  onBlur,
  disabled = false,
  value,
  defaultValue = "",
  validateValue = validateDepositValue,
}) {
  const { errors: formErrors, setError } = useContext(DepositFormErrorContext);
  const [localError, setLocalError] = useState("");
  const displayError = error || formErrors[name] || localError;
  const isDateInput = type === "date";
  const valueProps = value === undefined ? { defaultValue } : { value };

  const handleChange = (event) => {
    const message = validateValue(name, event.target.value);
    setLocalError(message);
    setError(name, message);
    onChange?.(event);
  };

  const handleBlur = (event) => {
    const message = validateValue(name, event.target.value);
    setLocalError(message);
    setError(name, message);
    onBlur?.(event);
  };

  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-semibold tracking-[0.04em] text-[#45474c]">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </span>
      {isDateInput ? (
        <DateInput
          name={name}
          min={min}
          max={max}
          required={required}
          disabled={disabled}
          {...valueProps}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="dd/mm/yyyy"
          aria-invalid={displayError ? "true" : "false"}
          className={`h-[58px] w-full rounded-lg border bg-white px-4 text-sm text-[#091426] outline-none transition placeholder:text-[#6b7280] focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
            displayError
              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10"
              : "border-[#c5c6cd] focus:border-[#091426] focus:ring-[#091426]/10"
          }`}
        />
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          {...valueProps}
          disabled={disabled}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={displayError ? "true" : "false"}
          className={`h-[58px] w-full rounded-lg border bg-white px-4 text-sm text-[#091426] outline-none transition placeholder:text-[#6b7280] focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
            displayError
              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10"
              : "border-[#c5c6cd] focus:border-[#091426] focus:ring-[#091426]/10"
          }`}
        />
      )}
      {displayError && (
        <span className="text-xs font-medium text-rose-600">
          {displayError}
        </span>
      )}
    </label>
  );
}

function FormSection({ title, icon: Icon, children, className = "" }) {
  return (
    <section
      className={`grid min-w-0 gap-5 rounded-xl border border-[#d8dde6] bg-white p-5 sm:col-span-2 ${className}`}
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-5 w-5 text-[#4f46e5]" />}
        <h2 className="text-lg font-bold text-[#091426]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ContractPreviewModal({
  preview,
  accepted,
  onAcceptedChange,
  onClose,
}) {
  const DEFAULT_ZOOM = 0.7;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 1.8;
  const ZOOM_STEP = 0.1;
  const dragRef = useRef(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const previewHtml = useMemo(() => {
    const html = preview?.html || "";
    if (!html) return "";
    const previewStyles = `
      <style>
        html, body { background: #fff !important; }
        body { padding: 58px 64px 64px !important; }
      </style>
    `;
    return html.includes("</head>")
      ? html.replace("</head>", `${previewStyles}</head>`)
      : `${previewStyles}${html}`;
  }, [preview?.html]);

  const resizePreviewFrame = (event) => {
    const frameDocument = event.currentTarget.contentDocument;
    if (frameDocument?.documentElement)
      frameDocument.documentElement.style.overflow = "hidden";
    if (frameDocument?.body) frameDocument.body.style.overflow = "hidden";
    const contentHeight = Math.max(
      frameDocument?.documentElement?.scrollHeight || 0,
      frameDocument?.body?.scrollHeight || 0,
      1123,
    );
    event.currentTarget.style.height = `${contentHeight}px`;
  };

  const updateZoom = (nextZoom) => {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom)));
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setOffset({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    });
  };

  const stopDragging = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
  };

  const resetPreviewPosition = () => {
    setZoom(DEFAULT_ZOOM);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        className="flex h-[min(94vh,980px)] w-[calc(100%-1rem)] !max-w-7xl flex-col gap-0 overflow-hidden border-0 bg-white p-0 shadow-2xl sm:rounded-2xl"
      >
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-[#e2e8f0] px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#006c49]">
              Xem trước hợp đồng
            </p>
            <DialogTitle className="text-lg font-bold text-[#091426]">
              Hợp đồng thuê và đặt cọc
            </DialogTitle>
            <DialogDescription className="sr-only">
              Ban xem truoc hop dong thue va dat coc.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#45474c] transition hover:bg-[#f2f4f6] hover:text-[#091426]"
            aria-label="Đóng"
          >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col bg-[#eef2f7]">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#dce3ec] bg-white px-4 py-2">
            <div className="flex items-center gap-1 rounded-lg border border-[#d8dde6] bg-[#f8fafc] p-1">
              <button
                type="button"
                onClick={() => updateZoom(zoom - ZOOM_STEP)}
                disabled={zoom <= MIN_ZOOM}
                className="rounded-md p-1.5 text-[#334155] transition hover:bg-white hover:text-[#091426] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Thu nho"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="min-w-14 text-center text-xs font-bold tabular-nums text-[#091426]">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => updateZoom(zoom + ZOOM_STEP)}
                disabled={zoom >= MAX_ZOOM}
                className="rounded-md p-1.5 text-[#334155] transition hover:bg-white hover:text-[#091426] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Phong to"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={resetPreviewPosition}
                className="ml-1 rounded-md p-1.5 text-[#334155] transition hover:bg-white hover:text-[#091426]"
                aria-label="Dat lai vi tri va zoom"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div
            className={`relative min-h-0 flex-1 overflow-hidden px-3 py-6 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
          >
            <div
              className="absolute left-1/2 top-6 w-[794px] select-none"
              style={{
                transform: `translate3d(calc(-50% + ${offset.x}px), ${offset.y}px, 0)`,
              }}
            >
              <iframe
              title="Xem trước hợp đồng thuê và đặt cọc"
              srcDoc={previewHtml}
              scrolling="no"
              onLoad={resizePreviewFrame}
                className="min-h-[1123px] w-[794px] border-0 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        </div>
        <div className="grid gap-4 border-t border-[#e2e8f0] bg-white px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
          <label className="flex items-start gap-3 text-sm leading-6 text-[#45474c]">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => onAcceptedChange(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#c5c6cd] accent-[#091426]"
            />
            <span>
              Tôi đã đọc và đồng ý với{" "}
              <strong className="text-[#091426]">điều khoản hợp đồng</strong>{" "}
              trong hợp đồng này.
            </span>
          </label>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#091426] px-5 text-sm font-bold text-white transition hover:bg-[#16253a]"
          >
            Quay lại form
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryLine({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-4 text-sm text-[#1b1b1d]">
      <Icon className="h-5 w-5 text-[#006c49]" />
      <span>{children}</span>
    </div>
  );
}

function RoomSummary({ room }) {
  const scheduleWindow = buildDepositScheduleWindow(room);
  const isSoonVacant = room?.status === "soonVacant";
  const statusCopy = isSoonVacant ? "Sắp trống" : "Còn trống";
  const statusClassName = isSoonVacant ? "bg-[#5b6472]" : "bg-[#006c49]";
  const expectedVacantDateLabel = formatDateForMessage(
    scheduleWindow.expectedVacantDate,
  );

  return (
    <aside className="overflow-hidden rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] shadow-[0_4px_10px_rgba(9,20,38,0.04)]">
      <div className="relative h-48 overflow-hidden">
        <Image
          src={room.image}
          alt={`Phòng ${room.id}`}
          fill
          sizes="352px"
          className="object-cover"
          priority
        />
        <div
          className={`absolute right-4 top-4 rounded-full px-4 py-1.5 text-xs font-bold tracking-wide text-white shadow ${statusClassName}`}
        >
          {statusCopy}
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-[#091426]">Phòng {room.id}</h2>
          <p className="whitespace-nowrap text-right">
            <span className="text-xl font-bold text-[#006c49]">
              {formatMoney(room.price)}
            </span>
            <span className="text-sm text-[#45474c]"> /tháng</span>
          </p>
        </div>

        <p className="mt-3 text-sm leading-6 text-[#45474c]">
          {room.description}
        </p>
        {isSoonVacant && expectedVacantDateLabel && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
            Sắp trống từ {expectedVacantDateLabel}. Chỉ đặt cọc với ngày ký/vào
            ở sau ngày này và trong vòng 14 ngày.
          </div>
        )}

        <div className="mt-7 border-t border-[#c5c6cd] pt-6">
          <div className="grid gap-4">
            <SummaryLine icon={Ruler}>{room.area} m²</SummaryLine>
            <SummaryLine icon={Wifi}>Wifi tốc độ cao</SummaryLine>
            <SummaryLine icon={ShieldCheck}>
              An ninh 24/7, camera giám sát
            </SummaryLine>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-[#c5c6cd] bg-[#f5f3f4] p-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-[#091426]">
            Lưu ý đặt cọc
          </h3>
          <p className="mt-2 text-sm italic leading-6 text-[#45474c]">
            Yêu cầu đặt cọc sẽ được xử lý trong vòng 24h làm việc. Quý khách vui
            lòng kiểm tra email sau khi gửi yêu cầu.
          </p>
        </div>
      </div>
    </aside>
  );
}

function DepositInfoForm({
  room,
  onSubmit,
  isSubmitting,
  blockingStatus,
  apiFieldErrors,
}) {
  const scheduleWindow = buildDepositScheduleWindow(room);
  const todayDate = getTodayDateString();
  const minScheduleDate = scheduleWindow.minDate;
  const maxScheduleDate = scheduleWindow.maxDate;
  const expectedVacantDateLabel = formatDateForMessage(
    scheduleWindow.expectedVacantDate,
  );
  const formRef = useRef(null);
  const handleCccdExtractedRef = useRef(null);
  const lastCccdExtractSignatureRef = useRef("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [savedDraft, setSavedDraft] = useState({});
  const [identityValues, setIdentityValues] = useState(IDENTITY_FIELD_DEFAULTS);
  const [draftVersion, setDraftVersion] = useState(0);
  const [imagePreviews, setImagePreviews] = useState({
    citizenIdFront: "",
    citizenIdBack: "",
    portraitImage: "",
  });
  const [selectedFiles, setSelectedFiles] = useState({
    citizenIdFront: null,
    citizenIdBack: null,
    portraitImage: null,
  });
  const [identityEntryMode, setIdentityEntryMode] = useState("manual");
  const [isCccdExtracting, setIsCccdExtracting] = useState(false);
  const [isPortraitCameraOpen, setIsPortraitCameraOpen] = useState(false);
  const [contractPreview, setContractPreview] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [acceptedContract, setAcceptedContract] = useState(false);
  const [acceptedSignature, setAcceptedSignature] = useState("");
  const [scheduleDates, setScheduleDates] = useState({
    contractDate: "",
    moveInDate: "",
  });
  const [occupantCount, setOccupantCount] = useState("1");
  const [coOccupants, setCoOccupants] = useState({
    1: { fullName: "", phone: "" },
    2: { fullName: "", phone: "" },
  });
  const [mainPhoneValue, setMainPhoneValue] = useState("");
  const [coOccupantProfileHints, setCoOccupantProfileHints] = useState({});
  const isCccdScanMode = identityEntryMode === "scan";
  const moveInMinDate =
    getLaterDateString(minScheduleDate, scheduleDates.contractDate) ||
    minScheduleDate;

  useEffect(() => {
    let isMounted = true;

    const loadDraftAndProfile = async () => {
      let draft = readDepositDraftCookie();

      // Always try fetching profile if authenticated to ensure fields are populated
      if (getAuthToken()) {
        try {
          const profile = await fetchMyTenantProfile();
          if (profile && profile.person) {
            draft = {
              ...draft,
              fullName:
                profile.person?.full_name ||
                profile.person?.fullName ||
                draft.fullName ||
                "",
              birthDate: profile.person?.dob || draft.birthDate || "",
              gender:
                normalizeGenderLabel(profile.person?.gender) ||
                normalizeGenderLabel(draft.gender) ||
                "",
              phone: profile.person?.phone || draft.phone || "",
              email: profile.person?.email || draft.email || "",
              permanentAddress:
                profile.person?.permanent_address ||
                profile.person?.permanentAddress ||
                draft.permanentAddress ||
                "",
              citizenId:
                profile.identity_document?.doc_number ||
                profile.identityDocument?.docNumber ||
                profile.identity_document?.docNumber ||
                draft.citizenId ||
                "",
              idIssueDate:
                profile.identity_document?.issued_date ||
                profile.identityDocument?.issuedDate ||
                profile.identity_document?.issuedDate ||
                draft.idIssueDate ||
                "",
              idIssuePlace:
                profile.identity_document?.issued_place ||
                profile.identityDocument?.issuedPlace ||
                profile.identity_document?.issuedPlace ||
                draft.idIssuePlace ||
                "",
            };

            // Attempt to fetch files in background
            const frontUrl =
              profile.identity_document?.front_file_url ||
              profile.identityDocument?.frontFileUrl;
            const backUrl =
              profile.identity_document?.back_file_url ||
              profile.identityDocument?.backFileUrl;
            const portraitUrl =
              profile.person?.portrait_url || profile.person?.portraitUrl;

            if (frontUrl || backUrl || portraitUrl) {
              Promise.all([
                fetchPrivateFile(frontUrl, "cccd_front.jpg"),
                fetchPrivateFile(backUrl, "cccd_back.jpg"),
                fetchPrivateFile(portraitUrl, "portrait.jpg"),
              ])
                .then(([frontFile, backFile, portraitFile]) => {
                  if (!isMounted) return;

                  if (frontFile) {
                    setSelectedFiles((prev) => ({
                      ...prev,
                      citizenIdFront: frontFile,
                    }));
                    setImagePreviews((prev) => ({
                      ...prev,
                      citizenIdFront: URL.createObjectURL(frontFile),
                    }));
                  }
                  if (backFile) {
                    setSelectedFiles((prev) => ({
                      ...prev,
                      citizenIdBack: backFile,
                    }));
                    setImagePreviews((prev) => ({
                      ...prev,
                      citizenIdBack: URL.createObjectURL(backFile),
                    }));
                  }
                  if (portraitFile) {
                    setSelectedFiles((prev) => ({
                      ...prev,
                      portraitImage: portraitFile,
                    }));
                    setImagePreviews((prev) => ({
                      ...prev,
                      portraitImage: URL.createObjectURL(portraitFile),
                    }));
                  }
                })
                .catch(console.error);
            }
          }
        } catch (error) {
          // Ignore profile fetch failures (e.g. unauthenticated or guest users)
        }
      }

      if (!hasDepositDraftValue(draft)) return;

      if (isMounted) {
        setSavedDraft(draft);
        setIdentityValues({
          fullName: draft.fullName || "",
          birthDate: draft.birthDate || "",
          gender: normalizeGenderLabel(draft.gender),
          citizenId: draft.citizenId || "",
          idIssueDate: draft.idIssueDate || "",
          idIssuePlace: draft.idIssuePlace || "",
          permanentAddress: draft.permanentAddress || "",
        });
        setMainPhoneValue(draft.phone || "");
        setScheduleDates({
          contractDate: normalizeDateInputString(draft.contractDate) || "",
          moveInDate: normalizeDateInputString(draft.moveInDate) || "",
        });
        setOccupantCount(
          ["1", "2", "3"].includes(draft.occupantCount)
            ? draft.occupantCount
            : "1",
        );
        setCoOccupants({
          1: {
            fullName: draft.coOccupant1FullName || "",
            phone: draft.coOccupant1Phone || "",
          },
          2: {
            fullName: draft.coOccupant2FullName || "",
            phone: draft.coOccupant2Phone || "",
          },
        });
        setDraftVersion((currentVersion) => currentVersion + 1);
      }
    };

    const timerId = window.setTimeout(loadDraftAndProfile, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    if (!apiFieldErrors || !Object.keys(apiFieldErrors).length) return;

    const timerId = window.setTimeout(() => {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        ...apiFieldErrors,
      }));
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [apiFieldErrors]);

  useEffect(() => {
    const count = Number(occupantCount || 1);
    const validationErrors = validateCoOccupantGroup({
      occupantCount,
      coOccupants,
      mainPhone: mainPhoneValue,
    });
    const lookupTargets = [];

    for (let displayOrder = 1; displayOrder < count; displayOrder += 1) {
      const phone = normalizePhoneValue(coOccupants[displayOrder]?.phone);
      const phoneField = `coOccupant${displayOrder}Phone`;
      if (
        phone &&
        !validationErrors[phoneField] &&
        VIETNAM_PHONE_PATTERN.test(phone)
      ) {
        lookupTargets.push({ displayOrder, phone });
      }
    }

    let cancelled = false;
    if (!lookupTargets.length) {
      const clearTimerId = window.setTimeout(() => {
        if (!cancelled) setCoOccupantProfileHints({});
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(clearTimerId);
      };
    }

    const timerId = window.setTimeout(async () => {
      const results = await Promise.all(
        lookupTargets.map(async (target) => {
          try {
            const lookup = await lookupPersonProfileByPhone(target.phone);
            return { ...target, exists: Boolean(lookup?.exists) };
          } catch {
            return { ...target, exists: false };
          }
        }),
      );

      if (cancelled) return;
      setCoOccupantProfileHints(() =>
        results.reduce((nextHints, result) => {
          if (result.exists) {
            nextHints[result.displayOrder] = { phone: result.phone };
          }
          return nextHints;
        }, {}),
      );
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [coOccupants, occupantCount, mainPhoneValue]);

  const setFieldError = (name, message) => {
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: message,
    }));
  };

  const getFormFieldValue = (name) =>
    formRef.current?.elements?.namedItem(name)?.value || "";

  const resolveScheduleDateValue = (name, overrides = {}) => {
    if (Object.prototype.hasOwnProperty.call(overrides, name)) {
      return (
        normalizeDateInputString(overrides[name]) ||
        String(overrides[name] || "").trim()
      );
    }
    return (
      normalizeDateInputString(scheduleDates[name]) ||
      normalizeDateInputString(getFormFieldValue(name)) ||
      normalizeDateInputString(savedDraft[name]) ||
      ""
    );
  };

  const getScheduleDateValues = (overrides = {}) => ({
    contractDate: resolveScheduleDateValue("contractDate", overrides),
    moveInDate: resolveScheduleDateValue("moveInDate", overrides),
  });

  const writeCurrentDraft = (overrides = {}) => {
    if (!formRef.current) return;
    writeDepositDraftCookie({
      ...buildDepositDraftFromForm(formRef.current),
      ...overrides,
    });
  };

  const validateDepositField = (name, value, relatedValues = null) => {
    return validateDepositValue(
      name,
      value,
      scheduleWindow,
      relatedValues || getScheduleDateValues({ [name]: value }),
    );
  };

  const validateAndSetDepositField = (name, value) => {
    const message = validateDepositField(name, value);
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [name]: message,
    }));
    return !message;
  };

  const getMainPhoneValue = () =>
    formRef.current?.elements?.namedItem("phone")?.value || "";

  const getCoOccupantErrors = (
    nextCoOccupants = coOccupants,
    nextCount = occupantCount,
    mainPhoneValue = getMainPhoneValue(),
  ) =>
    validateCoOccupantGroup({
      occupantCount: nextCount,
      coOccupants: nextCoOccupants,
      mainPhone: mainPhoneValue,
    });

  const mergeCoOccupantErrors = (currentErrors, nextErrors) => ({
    ...currentErrors,
    coOccupant1FullName: "",
    coOccupant1Phone: "",
    coOccupant2FullName: "",
    coOccupant2Phone: "",
    ...nextErrors,
  });

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    if (name === "contractDate" || name === "moveInDate") {
      const normalizedValue = normalizeDateInputString(value);
      const nextDates = getScheduleDateValues({
        [name]: normalizedValue || String(value || "").trim(),
      });

      if (
        name === "contractDate" &&
        normalizedValue &&
        nextDates.moveInDate &&
        nextDates.moveInDate < normalizedValue
      ) {
        nextDates.moveInDate = normalizedValue;
      }

      setScheduleDates((currentDates) => ({
        ...currentDates,
        ...nextDates,
      }));
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        contractDate:
          name === "contractDate"
            ? validateDepositField(
                "contractDate",
                nextDates.contractDate,
                nextDates,
              )
            : currentErrors.contractDate,
        moveInDate: validateDepositField(
          "moveInDate",
          nextDates.moveInDate,
          nextDates,
        ),
      }));
      writeCurrentDraft(nextDates);
      return;
    }

    validateAndSetDepositField(name, value);
    if (name === "phone") {
      setMainPhoneValue(value);
      const nextErrors = getCoOccupantErrors(coOccupants, occupantCount, value);
      setFieldErrors((currentErrors) =>
        mergeCoOccupantErrors(currentErrors, nextErrors),
      );
    }
  };

  const handleIdentityFieldChange = (event) => {
    const { name, value } = event.target;
    setIdentityValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  };

  const handleFieldBlur = (event) => {
    const { name, value } = event.target;
    validateAndSetDepositField(name, value);
    if (name === "phone") {
      setMainPhoneValue(value);
      const nextErrors = getCoOccupantErrors(coOccupants, occupantCount, value);
      setFieldErrors((currentErrors) =>
        mergeCoOccupantErrors(currentErrors, nextErrors),
      );
    }
  };

  const handleOccupantCountChange = (event) => {
    const nextCount = event.target.value;
    const nextCoOccupants = {
      1: Number(nextCount) >= 2 ? coOccupants[1] : { fullName: "", phone: "" },
      2: Number(nextCount) >= 3 ? coOccupants[2] : { fullName: "", phone: "" },
    };
    setOccupantCount(nextCount);
    setCoOccupants(nextCoOccupants);
    const nextCoOccupantErrors = getCoOccupantErrors(
      nextCoOccupants,
      nextCount,
    );
    setFieldErrors((currentErrors) => ({
      ...mergeCoOccupantErrors(currentErrors, nextCoOccupantErrors),
      occupantCount: validateDepositField("occupantCount", nextCount),
      ...(Number(nextCount) < 2
        ? { coOccupant1FullName: "", coOccupant1Phone: "" }
        : {}),
      ...(Number(nextCount) < 3
        ? { coOccupant2FullName: "", coOccupant2Phone: "" }
        : {}),
    }));
  };

  const handleCoOccupantChange = (displayOrder, fieldName) => (event) => {
    const value = event.target.value;
    const nextCoOccupants = {
      ...coOccupants,
      [displayOrder]: {
        ...coOccupants[displayOrder],
        [fieldName]: value,
      },
    };
    setCoOccupants(nextCoOccupants);
    const nextErrors = getCoOccupantErrors(nextCoOccupants);
    setFieldErrors((currentErrors) =>
      mergeCoOccupantErrors(currentErrors, nextErrors),
    );
  };

  const handleDraftChange = (event) => {
    if (!event.target?.name) return;
    writeDepositDraftCookie(buildDepositDraftFromForm(event.currentTarget));
  };

  const setDepositFile = (name, file, previewUrl = "") => {
    if (!file) {
      setImagePreviews((prev) => ({ ...prev, [name]: "" }));
      setSelectedFiles((prev) => ({ ...prev, [name]: null }));
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [name]: REQUIRED_DEPOSIT_MESSAGES[name] || "",
      }));
      return false;
    }

    if (file.type && !file.type.startsWith("image/")) {
      setImagePreviews((prev) => ({ ...prev, [name]: "" }));
      setSelectedFiles((prev) => ({ ...prev, [name]: null }));
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [name]: "Vui lòng chọn đúng định dạng ảnh.",
      }));
      return false;
    }

    if (file.size > MAX_DEPOSIT_UPLOAD_FILE_BYTES) {
      setImagePreviews((prev) => ({ ...prev, [name]: "" }));
      setSelectedFiles((prev) => ({ ...prev, [name]: null }));
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [name]: "Ảnh tải lên không được vượt quá 10MB.",
      }));
      return false;
    }

    const nextSelectedFiles = {
      ...selectedFiles,
      [name]: file,
    };
    const nextTotalSize = Object.values(nextSelectedFiles)
      .filter(Boolean)
      .reduce((totalSize, selectedFile) => totalSize + selectedFile.size, 0);

    if (nextTotalSize > MAX_DEPOSIT_UPLOAD_TOTAL_BYTES) {
      setImagePreviews((prev) => ({ ...prev, [name]: "" }));
      setSelectedFiles((prev) => ({ ...prev, [name]: null }));
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        _form: "Tổng dung lượng ảnh CCCD/chân dung không được vượt quá 30MB.",
        [name]:
          "Vui lòng chọn ảnh nhỏ hơn để tổng dung lượng không vượt quá 30MB.",
      }));
      return false;
    }

    setSelectedFiles((prev) => ({ ...prev, [name]: file }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      _form: "",
      [name]: "",
    }));

    if (previewUrl) {
      setImagePreviews((prev) => ({ ...prev, [name]: previewUrl }));
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviews((prev) => ({ ...prev, [name]: reader.result }));
      };
      reader.readAsDataURL(file);
    }

    return true;
  };

  const handleFileChange = (name) => (event) => {
    const didSetFile = setDepositFile(name, event.target.files?.[0]);
    if (!didSetFile) event.target.value = "";
  };

  const handleFileRemove = (name) => {
    setDepositFile(name, null);
  };

  const handlePortraitCapture = ({ file, previewUrl }) => {
    setDepositFile("portraitImage", file, previewUrl);
  };

  const writeDraftWithIdentityValues = useCallback((values) => {
    if (!formRef.current) return;
    writeDepositDraftCookie({
      ...buildDepositDraftFromForm(formRef.current),
      ...values,
    });
  }, []);

  const clearIdentityFieldsForCccdScan = useCallback(() => {
    setIdentityValues(IDENTITY_FIELD_DEFAULTS);
    setSavedDraft((currentDraft) => ({
      ...currentDraft,
      ...IDENTITY_FIELD_DEFAULTS,
    }));
    writeDraftWithIdentityValues(IDENTITY_FIELD_DEFAULTS);
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      _form: "",
      ...Object.fromEntries(IDENTITY_FIELD_NAMES.map((name) => [name, ""])),
    }));
  }, [writeDraftWithIdentityValues]);

  const applyExtractedCccdIdentity = (identity = {}) => {
    const extractedValues = {
      fullName: identity.fullName || "",
      birthDate: identity.dob || "",
      gender: normalizeGenderLabel(identity.gender),
      citizenId: identity.idNumber || "",
      idIssueDate: identity.issuedDate || "",
      idIssuePlace: identity.issuedPlace || "",
      permanentAddress: identity.address || "",
    };

    setIdentityValues(extractedValues);
    writeDraftWithIdentityValues(extractedValues);

    setSavedDraft((currentDraft) => ({
      ...currentDraft,
      ...extractedValues,
    }));
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors, _form: "" };
      Object.entries(extractedValues).forEach(([name, value]) => {
        if (value) {
          nextErrors[name] = validateDepositField(name, value);
        }
      });

      const birthDate = normalizeDateInputString(
        extractedValues.birthDate ||
          formRef.current?.elements?.namedItem("birthDate")?.value,
      );
      const idIssueDate = normalizeDateInputString(
        extractedValues.idIssueDate ||
          formRef.current?.elements?.namedItem("idIssueDate")?.value,
      );
      if (birthDate && idIssueDate && idIssueDate <= birthDate) {
        nextErrors.idIssueDate = "Ngày cấp CCCD phải sau ngày sinh.";
      }

      return nextErrors;
    });
  };

  const handleCccdFilesChange = ({ files = {}, previews = {} }) => {
    const nextSelectedFiles = {
      ...selectedFiles,
      citizenIdFront: files.citizenIdFront || null,
      citizenIdBack: files.citizenIdBack || null,
    };
    const nextTotalSize = Object.values(nextSelectedFiles)
      .filter(Boolean)
      .reduce((totalSize, selectedFile) => totalSize + selectedFile.size, 0);

    if (nextTotalSize > MAX_DEPOSIT_UPLOAD_TOTAL_BYTES) {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        _form: "Tổng dung lượng ảnh CCCD/chân dung không được vượt quá 30MB.",
        citizenIdFront:
          "Vui lòng chọn ảnh nhỏ hơn để tổng dung lượng không vượt quá 30MB.",
        citizenIdBack:
          "Vui lòng chọn ảnh nhỏ hơn để tổng dung lượng không vượt quá 30MB.",
      }));
      return;
    }

    setSelectedFiles(nextSelectedFiles);
    setImagePreviews((currentPreviews) => ({
      ...currentPreviews,
      citizenIdFront: previews.citizenIdFront || "",
      citizenIdBack: previews.citizenIdBack || "",
    }));
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      _form: "",
      citizenIdFront: nextSelectedFiles.citizenIdFront
        ? ""
        : currentErrors.citizenIdFront,
      citizenIdBack: nextSelectedFiles.citizenIdBack
        ? ""
        : nextSelectedFiles.citizenIdFront
          ? REQUIRED_DEPOSIT_MESSAGES.citizenIdBack
          : currentErrors.citizenIdBack,
    }));
  };

  useEffect(() => {
    handleCccdExtractedRef.current = ({ identity }) => {
      applyExtractedCccdIdentity(identity);
    };
  });

  useEffect(() => {
    const frontImage = selectedFiles.citizenIdFront;
    const backImage = selectedFiles.citizenIdBack;
    if (!isCccdScanMode || !frontImage || !backImage) return;

    const signature = cccdFilesSignature(frontImage, backImage);
    if (!signature || lastCccdExtractSignatureRef.current === signature) return;
    lastCccdExtractSignatureRef.current = signature;

    let isCurrent = true;
    const extract = async () => {
      clearIdentityFieldsForCccdScan();
      setIsCccdExtracting(true);
      try {
        if (process.env.NODE_ENV !== "production") {
          console.debug("[DepositClient] extract CCCD", { front: frontImage.name, back: backImage.name });
        }
        const result = await extractCccdImages(frontImage, backImage);
        if (!isCurrent) return;

        if (result?.success) {
          handleCccdExtractedRef.current?.(result);
          return;
        }

        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          _form: result?.message || "Không trích xuất được thông tin CCCD từ ảnh đã chọn.",
        }));
      } catch (error) {
        if (!isCurrent) return;
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          _form: error?.message || "Không thể trích xuất thông tin CCCD lúc này.",
        }));
      } finally {
        if (isCurrent) setIsCccdExtracting(false);
      }
    };

    void extract();
    return () => {
      isCurrent = false;
    };
  }, [clearIdentityFieldsForCccdScan, isCccdScanMode, selectedFiles.citizenIdFront, selectedFiles.citizenIdBack]);

  const validateFormData = (
    data,
    { includeFiles = true, includeContractAcceptance = true } = {},
  ) => {
    const requiredFields = [
      "fullName",
      "birthDate",
      "gender",
      "phone",
      "citizenId",
      "idIssueDate",
      "idIssuePlace",
      "permanentAddress",
      "occupantCount",
      "contractDate",
      "moveInDate",
      "contractTermMonths",
      "paymentCycleMonths",
    ];
    const nextErrors = {};

    [...requiredFields, "email"].forEach((fieldName) => {
      const message = validateDepositValue(
        fieldName,
        data[fieldName],
        scheduleWindow,
        data,
      );
      if (message) nextErrors[fieldName] = message;
    });

    // Validate CCCD issue date must be after birth date
    const birthDate = data.birthDate;
    const idIssueDate = data.idIssueDate;
    if (birthDate && idIssueDate && idIssueDate <= birthDate) {
      nextErrors.idIssueDate = "Ngày cấp CCCD phải sau ngày sinh.";
    }

    Object.assign(nextErrors, validateOccupancyData(data));

    if (includeFiles) {
      ["citizenIdFront", "citizenIdBack", "portraitImage"].forEach(
        (fieldName) => {
          if (!selectedFiles[fieldName]) {
            nextErrors[fieldName] = REQUIRED_DEPOSIT_MESSAGES[fieldName];
          }
        },
      );
    }

    if (includeContractAcceptance) {
      const metadata = buildDepositMetadata(room, data);
      if (
        !acceptedContract ||
        acceptedSignature !== signatureFromMetadata(metadata)
      ) {
        nextErrors.terms =
          "Vui lòng xem hợp đồng đặt cọc và tick đồng ý trước khi tiếp tục thanh toán.";
      }
    }

    setFieldErrors(nextErrors);
    return nextErrors;
  };

  const handlePreviewContract = async () => {
    if (!formRef.current) return;

    const data = collectDepositFormData(formRef.current);
    const nextErrors = validateFormData(data, {
      includeFiles: false,
      includeContractAcceptance: false,
    });
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsLoadingPreview(true);
      const metadata = buildDepositMetadata(room, data);
      const preview = await previewDepositContract(metadata);
      setContractPreview(preview);
      setAcceptedContract(false);
      setAcceptedSignature(signatureFromMetadata(metadata));
      setIsPreviewOpen(true);
    } catch (error) {
      setFieldError(
        "terms",
        error.message || "Không thể tạo bản xem trước hợp đồng đặt cọc.",
      );
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = collectDepositFormData(form);
    const nextErrors = validateFormData(data);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (blockingStatus && !blockingStatus.canBook) {
      return;
    }

    const formData = new FormData();
    const metadata = buildDepositMetadata(room, data);

    // Chuẩn bị payload chuẩn theo backend yêu cầu
    formData.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    );
    if (selectedFiles.citizenIdFront)
      formData.append("idFrontFile", selectedFiles.citizenIdFront);
    if (selectedFiles.citizenIdBack)
      formData.append("idBackFile", selectedFiles.citizenIdBack);
    if (selectedFiles.portraitImage)
      formData.append("portraitFile", selectedFiles.portraitImage);

    onSubmit(formData, metadata);
  };

  return (
    <DepositFormErrorContext.Provider
      value={{ errors: fieldErrors, setError: setFieldError }}
    >
      <section className="rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-4 shadow-[0_4px_10px_rgba(9,20,38,0.04)] sm:p-8">
        <div>
          <h1 className="text-4xl font-bold tracking-[-0.02em] text-[#091426]">
            Thông tin đặt cọc
          </h1>
          <p className="mt-2 text-base leading-7 text-[#45474c]">
            Vui lòng hoàn thành các thông tin dưới đây để tiến hành giữ chỗ cho
            phòng {room.id}.
          </p>
        </div>

        <form
          key={`deposit-form-${draftVersion}`}
          ref={formRef}
          onSubmit={handleSubmit}
          onChange={handleDraftChange}
          noValidate
          className="mt-8 grid gap-x-6 gap-y-6 sm:grid-cols-2"
        >
          <IdentityEntryModeSelector
            value={identityEntryMode}
            onChange={setIdentityEntryMode}
            disabled={isSubmitting}
          />

          {isCccdScanMode && (
            <CccdUploadFlow
              value={{ files: selectedFiles, previews: imagePreviews }}
              onFilesChange={handleCccdFilesChange}
              disabled={isSubmitting || isCccdExtracting}
              scanEnabled
              isExtracting={isCccdExtracting}
              errors={{
                citizenIdFront: fieldErrors.citizenIdFront,
                citizenIdBack: fieldErrors.citizenIdBack,
              }}
              maxFileSize={MAX_DEPOSIT_UPLOAD_FILE_BYTES}
              className="w-full sm:col-span-2"
            />
          )}

          <FormSection title="Thông tin định danh" icon={ShieldCheck}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                className="sm:col-span-2"
                label="Họ và tên"
                name="fullName"
                placeholder="Họ và tên"
                value={identityValues.fullName}
                defaultValue={savedDraft.fullName}
                disabled={isCccdExtracting}
                onChange={handleIdentityFieldChange}
              />
              <Field
                label="Ngày sinh"
                name="birthDate"
                type="date"
                placeholder="dd/MM/yyyy"
                max={todayDate}
                value={identityValues.birthDate}
                defaultValue={savedDraft.birthDate}
                disabled={isCccdExtracting}
                onChange={handleIdentityFieldChange}
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-[0.04em] text-[#45474c]">
                  Giới tính <span className="text-rose-600">*</span>
                </span>
                <select
                  name="gender"
                  value={identityValues.gender}
                  required
                  disabled={isCccdExtracting}
                  aria-invalid={fieldErrors.gender ? "true" : "false"}
                  onChange={(event) => {
                    handleIdentityFieldChange(event);
                    validateAndSetDepositField("gender", event.target.value);
                  }}
                  onBlur={(event) => validateAndSetDepositField("gender", event.target.value)}
                  className={`h-[58px] w-full rounded-lg border bg-white px-4 text-sm text-[#091426] outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
                    fieldErrors.gender
                      ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-[#c5c6cd] focus:border-[#091426] focus:ring-[#091426]/10"
                  }`}
                >
                  <option value="">Chọn giới tính</option>
                  {GENDER_OPTIONS.map((gender) => (
                    <option key={gender} value={gender}>
                      {gender}
                    </option>
                  ))}
                </select>
                {fieldErrors.gender && (
                  <span className="text-xs font-medium text-rose-600">
                    {fieldErrors.gender}
                  </span>
                )}
              </label>
              <Field
                label="Số CCCD"
                name="citizenId"
                placeholder="Số căn cước công dân"
                value={identityValues.citizenId}
                defaultValue={savedDraft.citizenId}
                disabled={isCccdExtracting}
                onChange={handleIdentityFieldChange}
              />
              <Field
                label="Ngày cấp"
                name="idIssueDate"
                type="date"
                placeholder="dd/MM/yyyy"
                max={todayDate}
                value={identityValues.idIssueDate}
                defaultValue={savedDraft.idIssueDate}
                disabled={isCccdExtracting}
                onChange={handleIdentityFieldChange}
              />
              <Field
                className="sm:col-span-2"
                label="Nơi cấp"
                name="idIssuePlace"
                placeholder="Cục CS QLHC về TTXH"
                value={identityValues.idIssuePlace}
                defaultValue={savedDraft.idIssuePlace}
                disabled={isCccdExtracting}
                onChange={handleIdentityFieldChange}
              />
              <Field
                className="sm:col-span-2"
                label="Địa chỉ thường trú"
                name="permanentAddress"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP"
                value={identityValues.permanentAddress}
                defaultValue={savedDraft.permanentAddress}
                disabled={isCccdExtracting}
                onChange={handleIdentityFieldChange}
              />
            </div>
          </FormSection>

          <FormSection title="Thông tin liên hệ" icon={Phone}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Số điện thoại"
                name="phone"
                type="tel"
                placeholder="0901 234 567"
                defaultValue={savedDraft.phone}
                onChange={handleFieldChange}
                onBlur={handleFieldBlur}
              />
              <Field
                label="Email (không bắt buộc)"
                name="email"
                type="email"
                placeholder="example@gmail.com"
                required={false}
                defaultValue={savedDraft.email}
              />
            </div>
          </FormSection>

          <FormSection title="Thông tin cư trú" icon={Home}>
            <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-[0.04em] text-[#45474c]">
                  Số lượng người ở <span className="text-rose-600">*</span>
                </span>
                <select
                  name="occupantCount"
                  value={occupantCount}
                  required
                  onChange={handleOccupantCountChange}
                  aria-invalid={fieldErrors.occupantCount ? "true" : "false"}
                  className={`h-[58px] rounded-lg border bg-white px-4 text-sm text-[#091426] outline-none transition focus:ring-2 ${
                    fieldErrors.occupantCount
                      ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-[#c5c6cd] focus:border-[#091426] focus:ring-[#091426]/10"
                  }`}
                >
                  <option value="1">1 người</option>
                  <option value="2">2 người</option>
                  <option value="3">3 người</option>
                </select>
                {fieldErrors.occupantCount && (
                  <span className="text-xs font-medium text-rose-600">
                    {fieldErrors.occupantCount}
                  </span>
                )}
              </label>
              <div className="rounded-lg border border-[#d8dde6] bg-[#f8fafc] px-4 py-3 text-sm leading-6 text-[#5a6678]">
                <p className="font-bold text-[#091426]">
                  Người đặt cọc chính sẽ là người ký chính.
                </p>
                <p>
                  Người ở cùng chỉ cần nhập tên và số điện thoại ở bước đặt cọc.
                  CCCD và hồ sơ đầy đủ sẽ bổ sung sau khi ký hợp đồng.
                </p>
              </div>
            </div>

            {[1, 2].map(
              (displayOrder) =>
                Number(occupantCount) > displayOrder && (
                  <div
                    key={displayOrder}
                    className="rounded-xl border border-[#d8dde6] bg-white p-5"
                  >
                    <h3 className="text-base font-bold text-[#091426]">
                      Người ở cùng {displayOrder}
                    </h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold tracking-[0.04em] text-[#45474c]">
                          Họ tên <span className="text-rose-600">*</span>
                        </span>
                        <input
                          name={`coOccupant${displayOrder}FullName`}
                          value={coOccupants[displayOrder].fullName}
                          onChange={handleCoOccupantChange(
                            displayOrder,
                            "fullName",
                          )}
                          placeholder={`Nhập họ tên người ở cùng ${displayOrder}`}
                          aria-invalid={
                            fieldErrors[`coOccupant${displayOrder}FullName`]
                              ? "true"
                              : "false"
                          }
                          className={`h-[58px] rounded-lg border bg-white px-4 text-sm text-[#091426] outline-none transition placeholder:text-[#6b7280] focus:ring-2 ${
                            fieldErrors[`coOccupant${displayOrder}FullName`]
                              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10"
                              : "border-[#c5c6cd] focus:border-[#091426] focus:ring-[#091426]/10"
                          }`}
                        />
                        {fieldErrors[`coOccupant${displayOrder}FullName`] && (
                          <span className="text-xs font-medium text-rose-600">
                            {fieldErrors[`coOccupant${displayOrder}FullName`]}
                          </span>
                        )}
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold tracking-[0.04em] text-[#45474c]">
                          Số điện thoại <span className="text-rose-600">*</span>
                        </span>
                        <input
                          name={`coOccupant${displayOrder}Phone`}
                          type="tel"
                          value={coOccupants[displayOrder].phone}
                          onChange={handleCoOccupantChange(
                            displayOrder,
                            "phone",
                          )}
                          placeholder="Nhập số điện thoại"
                          aria-invalid={
                            fieldErrors[`coOccupant${displayOrder}Phone`]
                              ? "true"
                              : "false"
                          }
                          className={`h-[58px] rounded-lg border bg-white px-4 text-sm text-[#091426] outline-none transition placeholder:text-[#6b7280] focus:ring-2 ${
                            fieldErrors[`coOccupant${displayOrder}Phone`]
                              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10"
                              : "border-[#c5c6cd] focus:border-[#091426] focus:ring-[#091426]/10"
                          }`}
                        />
                        {fieldErrors[`coOccupant${displayOrder}Phone`] && (
                          <span className="text-xs font-medium text-rose-600">
                            {fieldErrors[`coOccupant${displayOrder}Phone`]}
                          </span>
                        )}
                        {!fieldErrors[`coOccupant${displayOrder}Phone`] &&
                          coOccupantProfileHints[displayOrder] && (
                            <span className="text-xs font-medium text-emerald-700">
                              {EXISTING_PERSON_PROFILE_HINT}
                            </span>
                          )}
                      </label>
                    </div>
                  </div>
                ),
            )}
          </FormSection>

          <FormSection title="Lịch đặt cọc và thanh toán" icon={CalendarDays}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Ngày hẹn ký hợp đồng"
                name="contractDate"
                type="date"
                placeholder="dd/MM/yyyy"
                min={minScheduleDate}
                max={maxScheduleDate}
                error={fieldErrors.contractDate}
                validateValue={validateDepositField}
                onChange={handleFieldChange}
                onBlur={handleFieldBlur}
                value={scheduleDates.contractDate}
              />
              <Field
                label="Ngày dự kiến vào ở"
                name="moveInDate"
                type="date"
                placeholder="dd/MM/yyyy"
                min={moveInMinDate}
                max={maxScheduleDate}
                error={fieldErrors.moveInDate}
                validateValue={validateDepositField}
                onChange={handleFieldChange}
                onBlur={handleFieldBlur}
                value={scheduleDates.moveInDate}
              />
              <Field
                label="Thời hạn hợp đồng (tháng)"
                name="contractTermMonths"
                type="number"
                min={6}
                step={1}
                defaultValue={savedDraft.contractTermMonths || "12"}
                error={fieldErrors.contractTermMonths}
                validateValue={validateDepositField}
                onChange={handleFieldChange}
                onBlur={handleFieldBlur}
              />
              {scheduleWindow.isSoonVacant && expectedVacantDateLabel && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-800 sm:col-span-2">
                  Phòng sắp trống từ {expectedVacantDateLabel}. Ngày hẹn ký hợp
                  đồng và ngày dự kiến vào ở phải sau ngày này, tối đa trong
                  vòng 14 ngày.
                </div>
              )}
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-[0.04em] text-[#45474c]">
                  Chu kỳ thanh toán <span className="text-rose-600">*</span>
                </span>
                <select
                  name="paymentCycleMonths"
                  defaultValue={savedDraft.paymentCycleMonths || "1"}
                  required
                  aria-invalid={
                    fieldErrors.paymentCycleMonths ? "true" : "false"
                  }
                  onChange={(event) =>
                    validateAndSetDepositField(
                      "paymentCycleMonths",
                      event.target.value,
                    )
                  }
                  className={`h-[58px] rounded-lg border bg-white px-4 text-sm text-[#091426] outline-none transition focus:ring-2 ${
                    fieldErrors.paymentCycleMonths
                      ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10"
                      : "border-[#c5c6cd] focus:border-[#091426] focus:ring-[#091426]/10"
                  }`}
                >
                  <option value="1">1 tháng/lần</option>
                  <option value="3">3 tháng/lần</option>
                </select>
                {fieldErrors.paymentCycleMonths && (
                  <span className="text-xs font-medium text-rose-600">
                    {fieldErrors.paymentCycleMonths}
                  </span>
                )}
              </label>
            </div>
          </FormSection>

          <FormSection title="Hồ sơ bổ sung" icon={FileText}>
            <div className="grid gap-5">
              <PortraitUploadZone
                id="portrait-image"
                name="portraitImage"
                file={selectedFiles.portraitImage}
                preview={imagePreviews.portraitImage}
                onChange={handleFileChange("portraitImage")}
                onCapture={() => setIsPortraitCameraOpen(true)}
                onRemove={() => handleFileRemove("portraitImage")}
                disabled={isSubmitting}
                error={fieldErrors.portraitImage}
              />

              {!isCccdScanMode && (
                <CccdUploadFlow
                  value={{ files: selectedFiles, previews: imagePreviews }}
                  onFilesChange={handleCccdFilesChange}
                  disabled={isSubmitting || isCccdExtracting}
                  scanEnabled={false}
                  errors={{
                    citizenIdFront: fieldErrors.citizenIdFront,
                    citizenIdBack: fieldErrors.citizenIdBack,
                  }}
                  maxFileSize={MAX_DEPOSIT_UPLOAD_FILE_BYTES}
                  className="w-full"
                />
              )}

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-[0.04em] text-[#45474c]">
                  Ghi chú thêm (không bắt buộc)
                </span>
                <textarea
                  name="note"
                  rows={4}
                  placeholder="Yêu cầu về nội thất hoặc thời gian nhận phòng..."
                  defaultValue={savedDraft.note}
                  className="rounded-lg border border-[#c5c6cd] bg-white px-4 py-4 text-sm text-[#091426] outline-none transition placeholder:text-[#6b7280] focus:border-[#091426] focus:ring-2 focus:ring-[#091426]/10"
                />
              </label>
            </div>
          </FormSection>

          <div className="grid gap-3 rounded-xl border border-[#d8dde6] bg-white p-4 sm:col-span-2">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-[#091426]">
                  <FileText className="h-4 w-4 text-[#006c49]" />
                  Hợp đồng thuê và đặt cọc
                </p>
                <p className="mt-1 text-sm leading-6 text-[#45474c]">
                  Xem trước hợp đồng đã tự điền thông tin trước khi chuyển sang
                  màn thanh toán.
                </p>
              </div>
              <button
                type="button"
                onClick={handlePreviewContract}
                disabled={isLoadingPreview}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#091426] px-5 text-sm font-bold text-[#091426] transition hover:bg-[#091426] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingPreview ? "Đang tạo..." : "Xem hợp đồng"}
              </button>
            </div>
            <div
              className={`rounded-lg px-4 py-3 text-sm font-semibold ${acceptedContract ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
            >
              {acceptedContract
                ? "Đã đọc và đồng ý điều khoản hợp đồng."
                : "Bạn cần xem hợp đồng và tick đồng ý trong bản preview trước khi tiếp tục thanh toán."}
            </div>
            {fieldErrors.terms && (
              <p className="text-sm font-semibold text-rose-600">
                {fieldErrors.terms}
              </p>
            )}
          </div>

          <label className="hidden">
            <input
              type="checkbox"
              name="terms"
              required
              aria-invalid={fieldErrors.terms ? "true" : "false"}
              onChange={(event) => {
                if (event.target.checked) {
                  setFieldErrors((currentErrors) => ({
                    ...currentErrors,
                    terms: "",
                  }));
                }
              }}
              className="mt-1 h-4 w-4 rounded border-[#c5c6cd] accent-[#091426]"
            />
            <span className="text-sm leading-6 text-[#45474c]">
              Tôi cam kết các thông tin trên là chính xác và đồng ý với các{" "}
              <strong className="text-[#091426]">điều khoản hợp đồng</strong> của
              Hải Đăng House.
            </span>
          </label>

          {Object.values(fieldErrors).some(Boolean) && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 sm:col-span-2">
              {fieldErrors._form ||
                "Vui lòng kiểm tra lại các thông tin bắt buộc trước khi tiếp tục."}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting ||
              isCccdExtracting ||
              (blockingStatus && !blockingStatus.canBook)
            }
            className="flex h-[74px] items-center justify-center gap-4 rounded-xl bg-[#091426] text-base font-bold text-white shadow-[0_10px_18px_rgba(9,20,38,0.18)] transition hover:bg-[#16253a] disabled:opacity-75 sm:col-span-2"
          >
            {isSubmitting ? (
              "Đang xử lý..."
            ) : blockingStatus && !blockingStatus.canBook ? (
              blockingStatus.remainingMs > 0 ? (
                `Phòng đang có người đặt cọc, vui lòng chờ ${formatHoldCountdown(blockingStatus.remainingMs)}`
              ) : (
                "Phòng đã được đặt cọc, vui lòng chọn phòng khác"
              )
            ) : (
              <>
                Tiếp tục đặt cọc
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
        <CameraCapture
          open={isPortraitCameraOpen}
          onClose={() => setIsPortraitCameraOpen(false)}
          onCapture={handlePortraitCapture}
          facingMode="user"
          title="Chụp ảnh chân dung"
        />
        {isPreviewOpen && (
          <ContractPreviewModal
            preview={contractPreview}
            accepted={acceptedContract}
            onAcceptedChange={(checked) => {
              setAcceptedContract(checked);
              if (checked) {
                setFieldError("terms", "");
              }
            }}
            onClose={() => setIsPreviewOpen(false)}
          />
        )}
      </section>
    </DepositFormErrorContext.Provider>
  );
}

function CopyablePaymentField({ label, value, valueClassName = "" }) {
  const [copied, setCopied] = useState(false);
  const displayValue = String(value ?? "").trim();

  const handleCopy = async () => {
    const didCopy = await copyTextToClipboard(displayValue);
    if (!didCopy) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-[#e4e7ec] bg-[#f8fafc] px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.04em] text-[#8b97aa]">
          {label}
        </p>
        <p
          className={`mt-1 break-words text-sm font-bold text-[#091426] ${valueClassName}`}
        >
          {displayValue || "Chưa có thông tin"}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!displayValue}
        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-[#c5c6cd] bg-white px-3 text-xs font-bold text-[#091426] transition hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:opacity-50"
        title={`Sao chép ${label.toLowerCase()}`}
      >
        {copied ? (
          <Check className="h-4 w-4 text-[#006c49]" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {copied ? "Đã copy" : "Copy"}
      </button>
    </div>
  );
}

function DepositPaymentStep({ room, customer, paymentIntent }) {
  const router = useRouter();
  const identityDigits = String(customer.phone || customer.citizenId || "00000")
    .replace(/\D/g, "")
    .slice(-5)
    .padStart(5, "0");
  const paymentCode =
    readPaymentContent(paymentIntent) || `HD-${room.id}-${identityDigits}`;
  const paymentIntentId = readPaymentIntentId(paymentIntent);
  const checkoutUrl = readCheckoutUrl(paymentIntent);
  const qrPayload = readQrPayload(paymentIntent);
  const paymentLinkId =
    paymentIntent?.paymentLinkId ?? paymentIntent?.payment_link_id ?? "";
  const accountName =
    paymentIntent?.accountName ??
    paymentIntent?.account_name ??
    paymentIntent?.receiverName ??
    paymentIntent?.receiver_name ??
    "";
  const bankName =
    paymentIntent?.bankShortName ??
    paymentIntent?.bank_short_name ??
    paymentIntent?.bankName ??
    paymentIntent?.bank_name ??
    "";
  const accountNumber =
    paymentIntent?.accountNumber ?? paymentIntent?.account_number ?? "";
  const transferDescription = readTransferDescription(paymentIntent);
  const hasManualTransferDetails = Boolean(
    bankName && accountNumber && accountName,
  );
  const depositAmount =
    paymentIntent?.amount ??
    paymentIntent?.depositAmount ??
    paymentIntent?.deposit_amount;
  const depositAmountLabel =
    Number(depositAmount) > 0
      ? `${Number(depositAmount).toLocaleString("vi-VN")} VNĐ`
      : room.depositLabel;
  const [expiresAtMs] = useState(
    () =>
      resolvePaymentExpiresAtMs(paymentIntent) ??
      Date.now() + ROOM_HOLD_DURATION_MS,
  );
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, expiresAtMs - Date.now()),
  );
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [paymentStatusMessage, setPaymentStatusMessage] = useState(
    "Đang chờ thanh toán qua PayOS.",
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const didHandleExpiryRef = useRef(false);
  const didHandlePaidRef = useRef(false);

  useEffect(() => {
    if (isConfirmed) return undefined;

    const tick = () => {
      const nextRemainingMs = Math.max(0, expiresAtMs - Date.now());
      setRemainingMs(nextRemainingMs);

      if (nextRemainingMs <= 0 && !didHandleExpiryRef.current) {
        didHandleExpiryRef.current = true;
        clearRoomHold(room.id);
        alert("Phiên giữ chỗ đã hết hạn. Vui lòng chọn lại phòng.");
        router.replace("/rooms");
      }
    };

    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [expiresAtMs, isConfirmed, room.id, router]);

  useEffect(() => {
    if (!qrPayload) {
      return undefined;
    }

    let isActive = true;
    QRCode.toDataURL(qrPayload, {
      width: 260,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((dataUrl) => {
        if (isActive) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (isActive) setQrDataUrl("");
      });

    return () => {
      isActive = false;
    };
  }, [qrPayload]);

  useEffect(() => {
    if (!paymentIntentId || isConfirmed || Date.now() >= expiresAtMs) {
      return undefined;
    }

    const pollPaymentStatus = async () => {
      try {
        const status = await fetchDepositPaymentStatus(paymentIntentId);
        if (status?.message) {
          setPaymentStatusMessage(status.message);
        }

        if (isPaidPaymentStatus(status) && !didHandlePaidRef.current) {
          didHandlePaidRef.current = true;
          clearDepositDraftCookie();
          clearRoomHold(room.id);
          setIsConfirmed(true);
          return;
        }

        if (
          isTerminalFailedPaymentStatus(status) &&
          !didHandleExpiryRef.current
        ) {
          didHandleExpiryRef.current = true;
          clearRoomHold(room.id);
          alert(
            status?.message ||
              "Phiên thanh toán đã kết thúc. Vui lòng chọn lại phòng.",
          );
          router.replace("/rooms");
        }
      } catch {
        setPaymentStatusMessage("Chưa nhận được xác nhận thanh toán từ PayOS.");
      }
    };

    pollPaymentStatus();
    const pollingTimer = window.setInterval(pollPaymentStatus, 2500);
    return () => window.clearInterval(pollingTimer);
  }, [expiresAtMs, isConfirmed, paymentIntentId, room.id, router]);

  const handleOpenCheckout = () => {
    if (!checkoutUrl) {
      alert(
        "Chưa có đường dẫn thanh toán PayOS. Vui lòng quét mã QR hoặc tạo lại yêu cầu đặt cọc.",
      );
      return;
    }
    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  };

  const handleConfirmPayment = async () => {
    if (remainingMs <= 0) {
      alert("Phiên giữ chỗ đã hết hạn. Vui lòng chọn lại phòng.");
      router.replace("/rooms");
      return;
    }

    try {
      setIsConfirming(true);
      handleOpenCheckout();
      setPaymentStatusMessage("Đang chờ PayOS xác nhận thanh toán.");
    } catch (error) {
      alert("Lỗi: " + error.message);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelPayment = async () => {
    try {
      setIsCancelling(true);
      await cancelDepositPayment(paymentIntentId);
      clearRoomHold(room.id);
      alert("Đã hủy giữ chỗ. Phòng đã được mở lại cho người khác đặt cọc.");
      router.replace("/rooms");
    } catch (error) {
      alert("Lỗi: " + error.message);
    } finally {
      setIsCancelling(false);
    }
  };

  /* const handleOpenContract = async () => {
    if (!paymentIntentId) {
      alert("Chưa có mã phiên thanh toán để mở hợp đồng đặt cọc.");
      return;
    }

    try {
      await openDepositContractByPaymentPdf(paymentIntentId, paymentCode);
    } catch (error) {
      alert(error.message || "Không thể mở hợp đồng đặt cọc.");
    }
  };

  const handleDownloadContract = async () => {
    if (!paymentIntentId) {
      alert("Chưa có mã phiên thanh toán để tải hợp đồng đặt cọc.");
      return;
    }

    try {
      await downloadDepositContractByPaymentPdf(
        paymentIntentId,
        paymentCode,
        `hop-dong-dat-coc-${room.id}.pdf`,
      );
    } catch (error) {
      alert(error.message || "Không thể tải hợp đồng đặt cọc.");
    }
  };

  */

  if (isConfirmed) {
    return (
      <section className="flex flex-col items-center justify-center rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-10 text-center shadow-[0_4px_10px_rgba(9,20,38,0.04)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ecfdf5]">
          <BadgeCheck className="h-8 w-8 text-[#006c49]" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-[#091426]">
          Xác nhận thành công!
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#45474c]">
          Yêu cầu đặt cọc phòng {room.id} đã được ghi nhận. Chủ nhà sẽ liên hệ
          xác nhận trong thời gian sớm nhất.
        </p>
        {/* <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleOpenContract}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#091426] px-6 text-sm font-bold text-[#091426] transition hover:bg-[#091426] hover:text-white"
          >
            <FileText className="h-4 w-4" />
            Xem hợp đồng đặt cọc
          </button>
          <button
            type="button"
            onClick={handleDownloadContract}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#c5c6cd] px-6 text-sm font-bold text-[#091426] transition hover:bg-[#f5f3f4]"
          >
            <Download className="h-4 w-4" />
            Tải PDF
          </button>
        </div> */}
        <Link
          href="/rooms"
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-[#091426] px-8 text-sm font-bold text-white transition hover:bg-[#16253a]"
        >
          Quay lại xem phòng
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-6 shadow-[0_4px_10px_rgba(9,20,38,0.04)] sm:p-8">
      <div className="flex flex-col gap-4 border-b border-[#c5c6cd] pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#006c49]">
            Bước đặt cọc
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.02em] text-[#091426]">
            Đặt cọc giữ phòng
          </h1>
          <p className="mt-2 text-base leading-7 text-[#45474c]">
            {customer.fullName || "Khách thuê"} vui lòng chuyển khoản tiền cọc
            để giữ phòng {room.id}.
          </p>
        </div>
        <div className="rounded-xl bg-[#ecfdf5] px-5 py-4 text-right">
          <p className="text-sm text-[#007a55]">Số tiền cọc</p>
          <p className="text-2xl font-bold text-[#006c49]">
            {depositAmountLabel}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-4">
          <div className="rounded-xl border border-[#c5c6cd] bg-white p-5">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-[#091426]" />
              <h2 className="text-lg font-bold text-[#091426]">
                Thông tin thanh toán
              </h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#6b7280]">
              Vui lòng chuyển đúng số tiền và đúng nội dung chuyển khoản để hệ
              thống tự động xác nhận.
            </p>
            {hasManualTransferDetails ? (
              <div className="mt-5 grid gap-3">
                <CopyablePaymentField label="Ngân hàng" value={bankName} />
                <CopyablePaymentField
                  label="Số tài khoản"
                  value={accountNumber}
                />
                <CopyablePaymentField
                  label="Tên người nhận"
                  value={accountName}
                />
                <CopyablePaymentField
                  label="Số tiền"
                  value={depositAmountLabel}
                  valueClassName="text-[#006c49]"
                />
                <CopyablePaymentField
                  label="Nội dung chuyển khoản"
                  value={transferDescription}
                  valueClassName="text-[#b45309]"
                />
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
                Vui lòng quét QR hoặc mở trang thanh toán PayOS.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#c5c6cd] bg-white p-5">
            <h2 className="text-lg font-bold text-[#091426]">
              Thông tin giữ chỗ
            </h2>
            <div className="mt-4 grid gap-3 text-sm text-[#45474c] sm:grid-cols-2">
              <p>
                <CalendarDays className="mr-2 inline h-4 w-4" /> Ký HĐ:{" "}
                {customer.contractDate || "Chưa chọn"}
              </p>
              <p>
                <Home className="mr-2 inline h-4 w-4" /> Vào ở:{" "}
                {customer.moveInDate || "Chưa chọn"}
              </p>
              <p>
                <Phone className="mr-2 inline h-4 w-4" />{" "}
                {customer.phone || "Chưa có SĐT"}
              </p>
              <p>
                <Mail className="mr-2 inline h-4 w-4" />{" "}
                {customer.email || "Chưa có email"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#c5c6cd] bg-white p-5 text-center">
          <div className="mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center rounded-xl border border-dashed border-[#c5c6cd] bg-[#f5f3f4]">
            {qrDataUrl ? (
              <Image
                src={qrDataUrl}
                alt={`Mã QR thanh toán PayOS ${paymentCode}`}
                width={260}
                height={260}
                className="h-full w-full rounded-xl object-contain p-3"
                unoptimized
              />
            ) : (
              <div className="px-4 text-sm font-semibold leading-6 text-[#45474c]">
                Đang tạo mã QR thanh toán...
              </div>
            )}
          </div>
          <p className="mt-4 text-sm leading-6 text-[#45474c]">
            Quét mã QR hoặc chuyển khoản theo thông tin bên cạnh. Hệ thống sẽ tự
            cập nhật khi giao dịch được xác nhận.
          </p>
          {paymentLinkId && (
            <p className="mt-2 break-all text-xs text-[#6b7280]">
              Mã liên kết thanh toán: {paymentLinkId}
            </p>
          )}
          <p className="mt-2 text-xs font-semibold text-[#091426]">
            {paymentStatusMessage}
          </p>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-amber-700">
              Thời gian giữ chỗ còn lại
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-800">
              {formatHoldCountdown(remainingMs)}
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-700">
              Hết thời gian, hệ thống sẽ trả phòng về trạng thái trống.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={isConfirming || isCancelling || remainingMs <= 0}
        onClick={handleConfirmPayment}
        className="mt-8 flex h-[64px] w-full items-center justify-center gap-3 rounded-xl bg-[#091426] text-base font-bold text-white shadow-[0_10px_18px_rgba(9,20,38,0.18)] transition hover:bg-[#16253a] disabled:opacity-75"
      >
        {isConfirming ? (
          "Đang mở trang thanh toán..."
        ) : (
          <>
            Mở trang thanh toán
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>
      <button
        type="button"
        disabled={isConfirming || isCancelling}
        onClick={handleCancelPayment}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-[#c5c6cd] bg-white text-sm font-bold text-[#091426] transition hover:bg-[#f5f3f4] disabled:opacity-75"
      >
        {isCancelling ? "Đang hủy giữ chỗ..." : "Hủy giữ chỗ"}
      </button>
    </section>
  );
}

export function DepositClient({ room: initialRoom = null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRoomIdentifier =
    searchParams.get("roomCode") || searchParams.get("roomId") || "";
  const queryPropertyId =
    searchParams.get("propertyId") || searchParams.get("buildingId") || "";
  const [room, setRoom] = useState(initialRoom);
  const [roomLookup, setRoomLookup] = useState(() => ({
    identifier: initialRoom ? queryRoomIdentifier : "",
    error: "",
  }));
  const [customer, setCustomer] = useState({});
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [step, setStep] = useState("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blockingStatus, setBlockingStatus] = useState(null);
  const [depositApiFieldErrors, setDepositApiFieldErrors] = useState({});
  const didRedirectReservedRef = useRef(false);
  const roomIdentifier = room?.roomId ?? room?.roomCode ?? room?.id;
  const isLoadingRoom =
    !initialRoom &&
    Boolean(queryRoomIdentifier) &&
    roomLookup.identifier !== queryRoomIdentifier;
  const roomLoadError =
    roomLookup.identifier === queryRoomIdentifier ? roomLookup.error : "";
  const isBlockedOnInfoStep = Boolean(
    step === "info" && blockingStatus && !blockingStatus.canBook,
  );

  useEffect(() => {
    if (step === "deposit") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [step]);

  useEffect(() => {
    if (initialRoom) return undefined;
    if (!queryRoomIdentifier) return undefined;

    let isActive = true;

    fetchPublicRoomById(queryRoomIdentifier, { propertyId: queryPropertyId })
      .then((apiRoom) => {
        if (!isActive) return;
        setRoom(apiRoom ? normalizeApiRoom(apiRoom) : null);
        setRoomLookup({ identifier: queryRoomIdentifier, error: "" });
      })
      .catch(() => {
        if (!isActive) return;
        setRoom(null);
        setRoomLookup({
          identifier: queryRoomIdentifier,
          error: "Không thể tải chi tiết phòng. Vui lòng thử lại sau.",
        });
      });

    return () => {
      isActive = false;
    };
  }, [initialRoom, queryPropertyId, queryRoomIdentifier]);

  const applyRoomHoldStatus = useCallback(
    (status) => {
      const nextBlockingStatus = toBlockingStatus(status);

      if (!nextBlockingStatus) {
        setBlockingStatus(null);
        return;
      }

      setBlockingStatus(nextBlockingStatus);
      if (
        nextBlockingStatus.roomStatus === "RESERVED" &&
        !didRedirectReservedRef.current
      ) {
        didRedirectReservedRef.current = true;
        alert(
          nextBlockingStatus.message ||
            "Phòng đã được đặt cọc. Vui lòng chọn phòng khác.",
        );
        router.replace("/rooms");
      }
    },
    [router],
  );

  const refreshRoomHoldStatus = useCallback(async () => {
    if (!roomIdentifier) return null;
    const status = await fetchDepositRoomHoldStatus(roomIdentifier);
    applyRoomHoldStatus(status);
    return status;
  }, [applyRoomHoldStatus, roomIdentifier]);

  useEffect(() => {
    if (!isBlockedOnInfoStep) {
      return undefined;
    }

    const countdownTimer = window.setInterval(() => {
      setBlockingStatus((currentStatus) => {
        if (!currentStatus || currentStatus.canBook) return currentStatus;
        return {
          ...currentStatus,
          remainingMs: Math.max(0, currentStatus.remainingMs - 1000),
        };
      });
    }, 1000);

    return () => {
      window.clearInterval(countdownTimer);
    };
  }, [isBlockedOnInfoStep]);

  useEffect(() => {
    if (step !== "info") {
      return undefined;
    }

    const initialPollTimer = window.setTimeout(() => {
      refreshRoomHoldStatus().catch(() => {});
    }, 0);
    const pollingTimer = window.setInterval(() => {
      refreshRoomHoldStatus().catch(() => {});
    }, 2000);

    return () => {
      window.clearTimeout(initialPollTimer);
      window.clearInterval(pollingTimer);
    };
  }, [refreshRoomHoldStatus, step]);

  const submitDepositRequest = async (formData, metadata) => {
    try {
      setIsSubmitting(true);
      setBlockingStatus(null);
      setDepositApiFieldErrors({});

      // Gọi API khởi tạo phiên đặt cọc
      const createdPaymentIntent = await checkoutDeposit(formData);

      // Lưu state cục bộ phục vụ các bước sau
      setCustomer(metadata);
      setPaymentIntent(createdPaymentIntent);
      const holdExpiresAt =
        resolvePaymentExpiresAtMs(createdPaymentIntent) ??
        Date.now() + ROOM_HOLD_DURATION_MS;
      createRoomHold(room.id, {
        customerName: metadata.fullName,
        phone: metadata.phone,
        email: metadata.email,
        moveInDate: metadata.expectedMoveInDate,
        contractDate: metadata.expectedLeaseSignDate,
        expiresAt: holdExpiresAt,
      });

      // Chuyển sang bước hiển thị thanh toán
      setStep("deposit");
    } catch (error) {
      if (error.status === 409) {
        const status = await refreshRoomHoldStatus().catch(() => null);
        const nextBlockingStatus =
          toBlockingStatus(status) ??
          toBlockingStatusFromMessage(error.message) ??
          toBlockingStatusFromMessage(error.payload?.message) ??
          toBlockingStatusFromMessage(error.payload?.details);
        if (nextBlockingStatus) {
          setBlockingStatus(nextBlockingStatus);
          return;
        }
      }
      const nextFieldErrors = extractDepositApiFieldErrors(error);
      if (Object.keys(nextFieldErrors).length > 0) {
        setDepositApiFieldErrors(nextFieldErrors);
        return;
      }

      setDepositApiFieldErrors({ _form: getCheckoutErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingRoom) {
    return (
      <div className="min-h-screen bg-[#fbf8fa] px-4 pb-20 pt-8 text-[#091426] sm:px-6 lg:px-12">
        <div className="mx-auto max-w-2xl rounded-xl border border-[#c5c6cd] bg-white p-8 text-center shadow-[0_4px_10px_rgba(9,20,38,0.04)]">
          <h1 className="text-2xl font-bold">Đang tải phòng</h1>
          <p className="mt-3 text-sm leading-6 text-[#45474c]">
            Hệ thống đang kiểm tra thông tin phòng trước khi đặt cọc.
          </p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-[#fbf8fa] px-4 pb-20 pt-8 text-[#091426] sm:px-6 lg:px-12">
        <div className="mx-auto max-w-2xl rounded-xl border border-[#c5c6cd] bg-white p-8 text-center shadow-[0_4px_10px_rgba(9,20,38,0.04)]">
          <h1 className="text-2xl font-bold">Không tìm thấy phòng</h1>
          <p className="mt-3 text-sm leading-6 text-[#45474c]">
            {roomLoadError ||
              "Mã phòng trong đường dẫn không tồn tại trong dữ liệu backend hiện tại."}
          </p>
          <Link
            href="/rooms"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#091426] px-6 text-sm font-bold text-white transition hover:bg-[#16253a]"
          >
            Quay lại /rooms
          </Link>
        </div>
      </div>
    );
  }

  if (room.status !== "available" && room.status !== "soonVacant") {
    return (
      <div className="min-h-screen bg-[#fbf8fa] px-4 pb-20 pt-8 text-[#091426] sm:px-6 lg:px-12">
        <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-white p-8 text-center shadow-[0_4px_10px_rgba(9,20,38,0.04)]">
          <h1 className="text-2xl font-bold">
            Phòng này hiện không thể đặt cọc
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#45474c]">
            Vui lòng chọn phòng đang ở trạng thái trống trong danh sách phòng.
          </p>
          <Link
            href="/rooms"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-[#091426] px-6 text-sm font-bold text-white transition hover:bg-[#16253a]"
          >
            Quay lại /rooms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf8fa] px-4 pb-20 pt-8 text-[#091426] sm:px-6 lg:px-12">
      <div className="mx-auto max-w-[1120px]">
        <Link
          href="/rooms"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#45474c] transition hover:text-[#091426]"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại xem phòng
        </Link>

        <div className="grid gap-8 lg:grid-cols-[352px_1fr]">
          <RoomSummary room={room} />
          {step === "info" && (
            <DepositInfoForm
              room={room}
              onSubmit={submitDepositRequest}
              isSubmitting={isSubmitting}
              blockingStatus={blockingStatus}
              apiFieldErrors={depositApiFieldErrors}
            />
          )}
          {step === "deposit" && (
            <DepositPaymentStep
              room={room}
              customer={customer}
              paymentIntent={paymentIntent}
            />
          )}
        </div>

        <div className="mt-16 grid gap-8 border-t border-[#c5c6cd] pt-10 text-sm text-[#45474c] md:grid-cols-3">
          <div>
            <h3 className="font-bold text-[#091426]">Khám phá</h3>
            <div className="mt-4 grid gap-3">
              <Link href="/rooms">Phòng trọ</Link>
              <Link href="/">Trang chủ</Link>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-[#091426]">Hỗ trợ</h3>
            <div className="mt-4 grid gap-3">
              <span>Câu hỏi</span>
              <span>Chính sách</span>
            </div>
          </div>
          <div className="md:text-right">
            <p className="flex items-center gap-2 md:justify-end">
              <MapPin className="h-4 w-4" />
              Hải Đăng Boarding House Management
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
