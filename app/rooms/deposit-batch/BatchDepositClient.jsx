"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import ExpiryModal from "../../../components/ExpiryModal";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  FileText,
  Home,
  LoaderCircle,
  Mail,
  Phone,
  Ruler,
  ShieldCheck,
  Upload,
  Users,
  Wifi,
  X,
} from "lucide-react";
import {
  cancelBatchDeposit,
  checkoutBatchDeposit,
  expireBatchDeposit,
  fetchBatchDepositStatus,
  fetchDepositRoomHoldStatus,
  fetchPublicRoomCatalog,
  normalizeApiRoom,
} from "../../../services/roomsService";
import {
  clearDepositBatchDraft,
  readDepositBatchDraft,
  writeDepositBatchDraft,
} from "../../../services/depositBatchDraftStorage";
import { ROOM_HOLD_DURATION_MS } from "../../../lib/roomHoldStorage";
import { previewDepositContract } from "../../../services/depositContractsService";
import { fetchMyTenantProfile, fetchPrivateFile } from "../../../services/tenantProfilesService";
import { getAuthToken } from "../../../services/identityAccessService";

const DEPOSIT_PER_ROOM = 2000;
const MAX_DEPOSIT_SCHEDULE_DAYS = 14;
const FULL_NAME_PATTERN = /^[\p{L}\s]+$/u;
const VIETNAM_PHONE_PATTERN = /^0\d{9}$/;
const CITIZEN_ID_PATTERN = /^(?:\d{9}|\d{10}|\d{12})$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function todayValue(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
}

function normalizePhone(value) {
  return String(value || "").replace(/[\s.\-()]/g, "");
}

function formatCountdown(remainingMs) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function resolveExpiresAtMs(checkout) {
  const parsed = new Date(checkout?.expiresAt || "").getTime();
  return Number.isFinite(parsed) ? parsed : Date.now() + ROOM_HOLD_DURATION_MS;
}

function validateField(name, value, form = {}) {
  const normalized = String(value || "").trim();
  const today = todayValue();
  const maxScheduleDate = todayValue(MAX_DEPOSIT_SCHEDULE_DAYS);
  const requiredMessages = {
    fullName: "Vui lòng nhập họ và tên.",
    dob: "Vui lòng chọn ngày sinh.",
    phone: "Vui lòng nhập số điện thoại.",
    idNumber: "Vui lòng nhập số CCCD.",
    idIssueDate: "Vui lòng chọn ngày cấp CCCD.",
    idIssuePlace: "Vui lòng nhập nơi cấp CCCD.",
    permanentAddress: "Vui lòng nhập địa chỉ thường trú.",
    expectedMoveInDate: "Vui lòng chọn ngày dự kiến vào ở.",
    expectedLeaseSignDate: "Vui lòng chọn ngày dự kiến ký hợp đồng.",
  };

  if (requiredMessages[name] && !normalized) return requiredMessages[name];
  if (name === "fullName" && !FULL_NAME_PATTERN.test(normalized)) {
    return "Họ và tên chỉ được chứa chữ cái và khoảng trắng.";
  }
  if (name === "phone" && !VIETNAM_PHONE_PATTERN.test(normalizePhone(normalized))) {
    return "Số điện thoại phải là số Việt Nam gồm 10 chữ số và bắt đầu bằng 0.";
  }
  if (name === "email" && normalized && !EMAIL_PATTERN.test(normalized)) {
    return "Email không đúng định dạng.";
  }
  if (name === "idNumber" && !CITIZEN_ID_PATTERN.test(normalized)) {
    return "Số CCCD phải gồm 9, 10 hoặc 12 chữ số.";
  }
  if (name === "dob" && normalized > today) {
    return "Ngày sinh không được lớn hơn ngày hiện tại.";
  }
  if (name === "idIssueDate" && normalized > today) {
    return "Ngày cấp CCCD không được lớn hơn ngày hiện tại.";
  }
  if (name === "idIssueDate" && form.dob && normalized && normalized < form.dob) {
    return "Ngày cấp CCCD không được trước ngày sinh.";
  }
  if ((name === "expectedMoveInDate" || name === "expectedLeaseSignDate") && normalized < today) {
    return "Ngày chọn không được là ngày trong quá khứ.";
  }
  if ((name === "expectedMoveInDate" || name === "expectedLeaseSignDate") && normalized > maxScheduleDate) {
    return "Ngày chọn chỉ được tối đa 14 ngày kể từ hôm nay.";
  }
  return "";
}

function TextField({ label, required, error, ...props }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      <span>
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      <input
        required={required}
        {...props}
        aria-invalid={error ? "true" : "false"}
        className={`h-12 w-full rounded-lg border bg-white px-4 font-medium text-[#091426] outline-none transition ${error
            ? "border-rose-500 focus:border-rose-500"
            : "border-[#c5c6cd] focus:border-[#091426] focus:ring-2 focus:ring-[#091426]/10"
          }`}
      />
      {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

function BatchFileUploadZone({ id, label, helperText, preview, error, onChange }) {
  return (
    <label
      htmlFor={id}
      className={`group flex min-h-[148px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-white px-4 py-5 text-center transition hover:border-[#091426] hover:bg-[#f5f3f4] ${error ? "border-rose-500 bg-rose-50/40" : "border-[#aeb1bb]"
        }`}
    >
      <input id={id} type="file" accept="image/*" className="sr-only" onChange={onChange} />
      {preview ? (
        <div className="relative h-24 w-36 overflow-hidden rounded-lg border border-[#c5c6cd] bg-[#f5f3f4]">
          <Image src={preview} alt={label} fill sizes="144px" className="object-cover" unoptimized />
        </div>
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef2ff] text-[#506a9b] transition group-hover:bg-[#e0e7ff]">
          <Upload className="h-5 w-5" />
        </span>
      )}
      <span className="mt-3 text-sm font-bold text-[#091426]">
        {label} <span className="text-rose-600">*</span>
      </span>
      <span className="mt-1 text-xs leading-5 text-[#718096]">{helperText}</span>
      {preview ? <span className="mt-2 text-xs font-semibold text-[#006c49]">Đã chọn ảnh, bấm để thay đổi</span> : null}
      {error ? <span className="mt-2 text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

function RoomFeature({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-3 text-sm text-[#45474c]">
      <Icon className="h-4 w-4 shrink-0 text-[#00966d]" />
      <span>{children}</span>
    </div>
  );
}

function CopyRow({ label, value, disabled = false }) {
  const [copied, setCopied] = useState(false);
  const displayValue = String(value ?? "").trim();

  const copy = async () => {
    if (disabled || !displayValue) return;
    await navigator.clipboard.writeText(displayValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-[#e4e7ec] bg-[#f8fafc] px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.04em] text-[#8b97aa]">{label}</p>
        <p className="mt-1 break-words text-sm font-bold text-[#091426]">
          {displayValue || "Chưa có thông tin"}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        disabled={disabled || !displayValue}
        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-[#c5c6cd] bg-white px-3 text-xs font-bold text-[#091426] transition hover:bg-[#eef4ff] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Sao chép ${label}`}
      >
        {copied ? <Check className="h-4 w-4 text-[#006c49]" /> : <Copy className="h-4 w-4" />}
        {copied ? "Đã copy" : "Copy"}
      </button>
    </div>
  );
}

function buildContractPreviewMetadata(room, form) {
  return {
    roomId: room.roomId,
    fullName: String(form.fullName || "").trim(),
    dob: form.dob || null,
    phone: normalizePhone(form.phone),
    email: String(form.email || "").trim(),
    idNumber: String(form.idNumber || "").trim(),
    idIssueDate: form.idIssueDate || null,
    idIssuePlace: String(form.idIssuePlace || "").trim(),
    permanentAddress: String(form.permanentAddress || "").trim(),
    expectedMoveInDate: form.expectedMoveInDate || null,
    expectedLeaseSignDate: form.expectedLeaseSignDate || null,
    paymentCycleMonths: Number(form.paymentCycleMonths || 1),
  };
}

function contractSignature(room, form) {
  return JSON.stringify(buildContractPreviewMetadata(room, form));
}

function ContractPreviewModal({ room, review, onAcceptedChange, onClose }) {
  const resizePreviewFrame = (event) => {
    const frameDocument = event.currentTarget.contentDocument;
    if (frameDocument?.documentElement) frameDocument.documentElement.style.overflow = "hidden";
    if (frameDocument?.body) frameDocument.body.style.overflow = "hidden";
    const contentHeight = Math.max(
      frameDocument?.documentElement?.scrollHeight || 0,
      frameDocument?.body?.scrollHeight || 0,
      1123,
    );
    event.currentTarget.style.height = `${contentHeight}px`;
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#091426]/70 p-3 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#006c49]">
              Xem trước hợp đồng
            </p>
            <h2 className="text-lg font-bold text-[#091426]">
              Hợp đồng đặt cọc - Phòng {room.roomCode}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#45474c] transition hover:bg-[#f2f4f6] hover:text-[#091426]"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-[#eef2f7] px-3 py-6">
          <div
            className="origin-top scale-[0.46] sm:scale-[0.7] lg:scale-90 xl:scale-100"
            style={{ width: 794, margin: "0 auto", minHeight: 540 }}
          >
            <iframe
              title={`Xem trước hợp đồng đặt cọc phòng ${room.roomCode}`}
              srcDoc={review?.preview?.html || ""}
              scrolling="no"
              onLoad={resizePreviewFrame}
              className="min-h-[1123px] w-[794px] border-0 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
            />
          </div>
        </div>
        <div className="grid gap-4 border-t border-[#e2e8f0] bg-white px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
          <label className="flex items-start gap-3 text-sm leading-6 text-[#45474c]">
            <input
              type="checkbox"
              checked={Boolean(review?.accepted)}
              onChange={(event) => onAcceptedChange(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#c5c6cd] accent-[#091426]"
            />
            <span>
              Tôi đã đọc và đồng ý với <strong className="text-[#091426]">điều khoản đặt cọc</strong>{" "}
              của phòng {room.roomCode}.
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
      </div>
    </div>
  );
}

function createDefaultRoomForms(rooms) {
  return Object.fromEntries(
    rooms.map((room) => [room.roomId, { occupantCount: 1, coOccupants: [] }]),
  );
}

export function BatchDepositClient({ initialRooms = [], initialError = "" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdsParam = searchParams.get("roomIds") || "";
  const requestedRoomIds = useMemo(
    () => roomIdsParam.split(",").map((value) => value.trim()).filter(Boolean),
    [roomIdsParam],
  );
  const requestedRoomKey = requestedRoomIds.join(",");
  const [rooms, setRooms] = useState(initialRooms);
  const [roomForms, setRoomForms] = useState(() => createDefaultRoomForms(initialRooms));
  const [roomLookup, setRoomLookup] = useState(() => ({
    key: initialRooms.length > 0 ? requestedRoomKey : "",
    error: "",
  }));
  const [form, setForm] = useState({
    fullName: "",
    dob: "",
    phone: "",
    email: "",
    idNumber: "",
    idIssueDate: "",
    idIssuePlace: "",
    permanentAddress: "",
    expectedMoveInDate: todayValue(1),
    expectedLeaseSignDate: todayValue(1),
    paymentCycleMonths: "1",
  });
  const [files, setFiles] = useState({ front: null, back: null, portrait: null });
  const [filePreviews, setFilePreviews] = useState({ front: "", back: "", portrait: "" });
  const [checkout, setCheckout] = useState(null);
  const [batchStatus, setBatchStatus] = useState(null);
  const [qrImage, setQrImage] = useState("");
  const [conflict, setConflict] = useState(null);
  const [unavailableRooms, setUnavailableRooms] = useState([]);
  const [draftReady, setDraftReady] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingPayment, setCancellingPayment] = useState(false);
  const [remainingMs, setRemainingMs] = useState(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(10);
  const [contractReviews, setContractReviews] = useState({});
  const [activeContractRoomId, setActiveContractRoomId] = useState(null);
  const [previewingRoomId, setPreviewingRoomId] = useState(null);
  const dismissedConflictRef = useRef("");
  const didHandleExpiryRef = useRef(false);

  const isLoadingRooms = Boolean(requestedRoomKey) && roomLookup.key !== requestedRoomKey;
  const roomLoadError = roomLookup.key === requestedRoomKey ? roomLookup.error : "";
  const totalAmount = rooms.length * DEPOSIT_PER_ROOM;
  const expiresAtMs = useMemo(() => (checkout ? resolveExpiresAtMs(checkout) : null), [checkout]);
  const paymentExpired = Boolean(expiresAtMs && remainingMs !== null && remainingMs <= 0);
  const allContractsAccepted = rooms.length >= 1 && rooms.every((room) => {
    const review = contractReviews[room.roomId];
    return review?.accepted && review.signature === contractSignature(room, form);
  });
  const initialRoomKey = useMemo(
    () => initialRooms.map((room) => String(room.roomId)).join(","),
    [initialRooms],
  );

  const handleSessionExpired = useCallback((message) => {
    setRemainingMs(0);
    setRedirectSeconds(10);
    setIsSessionExpired(true);
    setError("");

    if (didHandleExpiryRef.current) return;
    didHandleExpiryRef.current = true;
    if (checkout?.batchId) {
      expireBatchDeposit(checkout.batchId)
        .then((status) => {
          if (status) setBatchStatus(status);
        })
        .catch(() => {
          setBatchStatus((current) => current ?? { status: "EXPIRED", message });
        });
    }
  }, [checkout?.batchId]);

  useEffect(() => {
    if (!isSessionExpired) return undefined;

    const countdownTimer = window.setInterval(() => {
      setRedirectSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    const redirectTimer = window.setTimeout(() => {
      router.replace("/rooms");
    }, 10000);

    return () => {
      window.clearInterval(countdownTimer);
      window.clearTimeout(redirectTimer);
    };
  }, [isSessionExpired, router]);

  useEffect(() => {
    const nextRoomIds = new Set(initialRooms.map((room) => String(room.roomId)));
    setRooms(initialRooms);
    setRoomForms((current) => ({
      ...createDefaultRoomForms(initialRooms),
      ...Object.fromEntries(
        Object.entries(current).filter(([roomId]) => nextRoomIds.has(String(roomId))),
      ),
    }));
    setContractReviews((current) => Object.fromEntries(
      Object.entries(current).filter(([roomId]) => nextRoomIds.has(String(roomId))),
    ));
    setUnavailableRooms((current) => current.filter((room) => nextRoomIds.has(String(room.roomId))));
    setActiveContractRoomId((current) => (nextRoomIds.has(String(current)) ? current : null));
  }, [initialRoomKey, initialRooms]);

  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  useEffect(() => {
    if (!requestedRoomKey) return undefined;

    let isActive = true;

    fetchPublicRoomCatalog()
      .then((catalog) => {
        if (!isActive) return;
        const requestedIdSet = new Set(requestedRoomIds);
        const nextRooms = catalog.rooms
          .map((room) => normalizeApiRoom(room))
          .filter((room) => requestedIdSet.has(String(room.roomId)));
        setRooms(nextRooms);
        setRoomForms((current) => Object.fromEntries(
          nextRooms.map((room) => [
            room.roomId,
            current[room.roomId] || { occupantCount: 1, coOccupants: [] },
          ]),
        ));
        setRoomLookup({ key: requestedRoomKey, error: "" });
      })
      .catch(() => {
        if (!isActive) return;
        setRooms([]);
        setRoomLookup({
          key: requestedRoomKey,
          error: "Không thể tải danh sách phòng đã chọn. Vui lòng thử lại sau.",
        });
      });

    return () => {
      isActive = false;
    };
  }, [requestedRoomIds, requestedRoomKey]);

  useEffect(() => {
    let isMounted = true;

    const loadDraftAndProfile = async () => {
      const draft = readDepositBatchDraft();
      const draftData = draft?.data || {};

      let profileData = null;
      if (getAuthToken()) {
        try {
          const profile = await fetchMyTenantProfile();
          if (profile && profile.person) {
            profileData = profile;
          }
        } catch (error) {
          // Ignore profile fetch failures
        }
      }

      if (!isMounted) return;

      const savedForm = draftData.form || {};

      // Fill form fields from profile if available, otherwise from draft
      const mappedForm = {
        fullName: profileData?.person?.fullName || savedForm.fullName || "",
        dob: profileData?.person?.dob || savedForm.dob || "",
        phone: profileData?.person?.phone || savedForm.phone || "",
        email: profileData?.person?.email || savedForm.email || "",
        idNumber: profileData?.identityDocument?.docNumber || savedForm.idNumber || "",
        idIssueDate: profileData?.identityDocument?.issuedDate || savedForm.idIssueDate || "",
        idIssuePlace: profileData?.identityDocument?.issuedPlace || savedForm.idIssuePlace || "",
        permanentAddress: profileData?.person?.permanentAddress || savedForm.permanentAddress || "",
        expectedMoveInDate: savedForm.expectedMoveInDate || todayValue(1),
        expectedLeaseSignDate: savedForm.expectedLeaseSignDate || todayValue(1),
        paymentCycleMonths: savedForm.paymentCycleMonths || "1",
      };

      setForm((current) => ({
        ...current,
        ...mappedForm,
      }));

      // Restoring room occupants
      setRoomForms((current) => {
        const restoredRoomForms = { ...current };
        rooms.forEach((room) => {
          const savedRoom = draftData.roomForms?.[room.roomId];
          if (!savedRoom) return;
          const maxPeople = Number(room.maxPeople || 3);
          const occupantCount = Math.max(1, Math.min(maxPeople, Number(savedRoom.occupantCount || 1)));
          restoredRoomForms[room.roomId] = {
            occupantCount,
            coOccupants: (savedRoom.coOccupants || [])
              .slice(0, occupantCount - 1)
              .map((occupant) => ({
                fullName: occupant.fullName || "",
                phone: occupant.phone || "",
              })),
          };
        });
        return restoredRoomForms;
      });

      // Fetch private files if profile is loaded
      if (profileData) {
        const frontUrl = profileData.identityDocument?.frontFileUrl;
        const backUrl = profileData.identityDocument?.backFileUrl;
        const portraitUrl = profileData.person?.portraitUrl;

        if (frontUrl || backUrl || portraitUrl) {
          Promise.all([
            fetchPrivateFile(frontUrl, "cccd_front.jpg"),
            fetchPrivateFile(backUrl, "cccd_back.jpg"),
            fetchPrivateFile(portraitUrl, "portrait.jpg")
          ]).then(([frontFile, backFile, portraitFile]) => {
            if (!isMounted) return;

            if (frontFile) {
              setFiles(prev => ({ ...prev, front: frontFile }));
              setFilePreviews(prev => ({ ...prev, front: URL.createObjectURL(frontFile) }));
            }
            if (backFile) {
              setFiles(prev => ({ ...prev, back: backFile }));
              setFilePreviews(prev => ({ ...prev, back: URL.createObjectURL(backFile) }));
            }
            if (portraitFile) {
              setFiles(prev => ({ ...prev, portrait: portraitFile }));
              setFilePreviews(prev => ({ ...prev, portrait: URL.createObjectURL(portraitFile) }));
            }
          }).catch(console.error);
        }
      }

      setDraftReady(true);
    };

    const timer = window.setTimeout(loadDraftAndProfile, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [rooms]);

  useEffect(() => {
    if (!draftReady || checkout) return undefined;
    const timer = window.setTimeout(() => {
      writeDepositBatchDraft({ form, rooms, roomForms });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [checkout, draftReady, form, roomForms, rooms]);

  useEffect(() => {
    if (
      !expiresAtMs
      || ["CONFIRMED", "REFUND_REQUIRED", "EXPIRED", "CANCELLED"].includes(batchStatus?.status)
    ) {
      return undefined;
    }

    const tick = () => {
      const nextRemainingMs = Math.max(0, expiresAtMs - Date.now());
      setRemainingMs(nextRemainingMs);
      if (nextRemainingMs <= 0 && !didHandleExpiryRef.current) {
        handleSessionExpired("Phiên giữ chỗ đã hết hạn. Vui lòng chọn lại phòng.");
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [batchStatus?.status, expiresAtMs, handleSessionExpired]);

  useEffect(() => {
    if (
      !checkout?.batchId
      || paymentExpired
      || ["CONFIRMED", "REFUND_REQUIRED", "EXPIRED", "CANCELLED"].includes(batchStatus?.status)
    ) {
      return undefined;
    }
    let cancelled = false;

    const poll = async () => {
      try {
        const status = await fetchBatchDepositStatus(checkout.batchId);
        if (!cancelled) setBatchStatus(status);
      } catch {
        // Keep the payment screen usable when one polling request temporarily fails.
      }
    };

    poll();
    const timer = window.setInterval(poll, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [batchStatus?.status, checkout?.batchId, paymentExpired]);

  useEffect(() => {
    if (batchStatus?.status === "EXPIRED") {
      handleSessionExpired(batchStatus.message || "Phiên giữ chỗ đã hết hạn. Vui lòng chọn lại phòng.");
    }
  }, [batchStatus?.message, batchStatus?.status, handleSessionExpired]);

  useEffect(() => {
    setQrImage("");
    const qrCode = String(checkout?.qrCode || "").trim();
    if (/^(?:data:image\/|https?:\/\/)/i.test(qrCode)) {
      setQrImage(qrCode);
      return;
    }
    if (qrCode.startsWith("iVBORw0KGgo")) {
      setQrImage(`data:image/png;base64,${qrCode}`);
      return;
    }
    if (qrCode.startsWith("/9j/")) {
      setQrImage(`data:image/jpeg;base64,${qrCode}`);
      return;
    }

    const qrPayload = String(checkout?.qrPayload || qrCode).trim();
    if (!qrPayload) return;

    QRCode.toDataURL(qrPayload, { width: 280, margin: 1 })
      .then(setQrImage)
      .catch(() => setQrImage(""));
  }, [checkout]);

  useEffect(() => {
    if (checkout || rooms.length === 0) return undefined;
    let cancelled = false;

    const refreshAvailability = async () => {
      const results = await Promise.all(rooms.map(async (room) => {
        try {
          const status = await fetchDepositRoomHoldStatus(room.roomId, {
            expectedMoveInDate: form.expectedMoveInDate,
            expectedLeaseSignDate: form.expectedLeaseSignDate,
          });
          const canBook = Boolean(status?.canBook);
          if (canBook) return null;
          return {
            roomId: room.roomId,
            roomCode: room.roomCode,
            reason: status?.holdStatus ?? status?.roomStatus,
            message: status?.message || `Phòng ${room.roomCode} hiện không thể đặt cọc.`,
          };
        } catch {
          return null;
        }
      }));
      if (cancelled) return;

      const blockedRooms = results.filter(Boolean);
      setUnavailableRooms(blockedRooms);
      if (blockedRooms.length === 0) {
        dismissedConflictRef.current = "";
        return;
      }

      const signature = blockedRooms.map((room) => room.roomId).sort().join(",");
      if (signature !== dismissedConflictRef.current) {
        const blockedIds = new Set(blockedRooms.map((room) => String(room.roomId)));
        setConflict({
          code: "BATCH_ROOM_UNAVAILABLE",
          message: "Một số phòng đã có người đặt cọc hoặc đang được xử lý.",
          unavailableRooms: blockedRooms,
          availableRooms: rooms
            .filter((room) => !blockedIds.has(String(room.roomId)))
            .map((room) => ({ roomId: room.roomId, roomCode: room.roomCode })),
        });
      }
    };

    refreshAvailability();
    const timer = window.setInterval(refreshAvailability, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [checkout, form.expectedLeaseSignDate, form.expectedMoveInDate, rooms]);

  useEffect(() => {
    if (!conflict) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        dismissedConflictRef.current = unavailableRooms
          .map((room) => room.roomId)
          .sort()
          .join(",");
        setConflict(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [conflict, unavailableRooms]);

  const paymentFinished = batchStatus?.status === "CONFIRMED";
  const terminalError = ["REFUND_REQUIRED", "EXPIRED", "CANCELLED"].includes(batchStatus?.status);

  const updateFormField = (name, value) => {
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);
    setFieldErrors((current) => ({
      ...current,
      [name]: validateField(name, value, nextForm),
      ...(name === "dob" && nextForm.idIssueDate
        ? { idIssueDate: validateField("idIssueDate", nextForm.idIssueDate, nextForm) }
        : {}),
    }));
  };

  const updateFile = (name, file) => {
    setFiles((current) => ({ ...current, [name]: file }));
    setFieldErrors((current) => ({ ...current, [name]: file ? "" : current[name] }));
    if (!file) {
      setFilePreviews((current) => ({ ...current, [name]: "" }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFilePreviews((current) => ({ ...current, [name]: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const nextErrors = {};
    [
      "fullName",
      "dob",
      "phone",
      "email",
      "idNumber",
      "idIssueDate",
      "idIssuePlace",
      "permanentAddress",
      "expectedMoveInDate",
      "expectedLeaseSignDate",
    ].forEach((name) => {
      const message = validateField(name, form[name], form);
      if (message) nextErrors[name] = message;
    });

    const roomIds = rooms.map((room) => String(room.roomId));
    if (new Set(roomIds).size !== roomIds.length) {
      nextErrors.rooms = "Danh sách phòng có phòng bị trùng.";
    }
    const propertyIds = new Set(rooms.map((room) => String(room.propertyId || room.buildingId || "")));
    if (propertyIds.size > 1) {
      nextErrors.rooms = "Các phòng trong một lần đặt cọc phải cùng một cơ sở.";
    }
    if (!["1", "3"].includes(String(form.paymentCycleMonths))) {
      nextErrors.paymentCycleMonths = "Chu kỳ thanh toán chỉ được là 1 hoặc 3 tháng.";
    }
    [
      ["front", "Vui lòng tải lên ảnh mặt trước CCCD."],
      ["back", "Vui lòng tải lên ảnh mặt sau CCCD."],
      ["portrait", "Vui lòng tải lên ảnh chân dung."],
    ].forEach(([name, message]) => {
      if (!files[name]) nextErrors[name] = message;
    });

    const mainPhone = normalizePhone(form.phone);
    rooms.forEach((room) => {
      const roomForm = roomForms[room.roomId] || { occupantCount: 1, coOccupants: [] };
      const review = contractReviews[room.roomId];
      if (!review?.accepted || review.signature !== contractSignature(room, form)) {
        nextErrors[`room-${room.roomId}-terms`] =
          `Vui lòng xem hợp đồng đặt cọc phòng ${room.roomCode} và tick đồng ý.`;
      }
      if (roomForm.occupantCount < 1 || roomForm.occupantCount > Number(room.maxPeople || 1)) {
        nextErrors[`room-${room.roomId}-occupantCount`] = `Số người ở tối đa là ${room.maxPeople}.`;
      }
      const seenPhones = new Set();
      roomForm.coOccupants.forEach((occupant, index) => {
        const nameKey = `room-${room.roomId}-co-${index}-fullName`;
        const phoneKey = `room-${room.roomId}-co-${index}-phone`;
        const occupantName = String(occupant.fullName || "").trim();
        const occupantPhone = normalizePhone(occupant.phone);
        if (!occupantName) nextErrors[nameKey] = `Vui lòng nhập họ tên người ở cùng ${index + 1}.`;
        if (!occupantPhone) {
          nextErrors[phoneKey] = `Vui lòng nhập số điện thoại người ở cùng ${index + 1}.`;
        } else if (!VIETNAM_PHONE_PATTERN.test(occupantPhone)) {
          nextErrors[phoneKey] = "Số điện thoại phải là số Việt Nam gồm 10 chữ số và bắt đầu bằng 0.";
        } else if (occupantPhone === mainPhone) {
          nextErrors[phoneKey] = "Số điện thoại người ở cùng không được trùng người đặt cọc chính.";
        } else if (seenPhones.has(occupantPhone)) {
          nextErrors[phoneKey] = "Số điện thoại người ở cùng trong phòng không được trùng nhau.";
        }
        seenPhones.add(occupantPhone);
      });
    });

    setFieldErrors(nextErrors);
    return nextErrors;
  };

  const validateContractPreviewFields = () => {
    const nextErrors = {};
    [
      "fullName",
      "dob",
      "phone",
      "email",
      "idNumber",
      "idIssueDate",
      "idIssuePlace",
      "permanentAddress",
      "expectedMoveInDate",
      "expectedLeaseSignDate",
    ].forEach((name) => {
      const message = validateField(name, form[name], form);
      if (message) nextErrors[name] = message;
    });
    setFieldErrors((current) => ({ ...current, ...nextErrors }));
    return nextErrors;
  };

  const previewContract = async (room) => {
    setError("");
    const previewErrors = validateContractPreviewFields();
    if (Object.keys(previewErrors).length > 0) {
      setError("Vui lòng hoàn thành thông tin người đại diện trước khi xem hợp đồng đặt cọc.");
      window.setTimeout(() => {
        document.querySelector('[aria-invalid="true"]')?.focus();
      }, 0);
      return;
    }

    try {
      setPreviewingRoomId(room.roomId);
      const signature = contractSignature(room, form);
      const preview = await previewDepositContract(buildContractPreviewMetadata(room, form));
      setContractReviews((current) => ({
        ...current,
        [room.roomId]: {
          preview,
          signature,
          accepted: false,
        },
      }));
      setFieldErrors((current) => ({
        ...current,
        [`room-${room.roomId}-terms`]: "",
      }));
      setActiveContractRoomId(room.roomId);
    } catch (previewError) {
      setFieldErrors((current) => ({
        ...current,
        [`room-${room.roomId}-terms`]:
          previewError.message || `Không thể tạo bản xem trước hợp đồng phòng ${room.roomCode}.`,
      }));
    } finally {
      setPreviewingRoomId(null);
    }
  };

  const setContractAccepted = (room, accepted) => {
    setContractReviews((current) => ({
      ...current,
      [room.roomId]: {
        ...current[room.roomId],
        signature: contractSignature(room, form),
        accepted,
      },
    }));
    if (accepted) {
      setFieldErrors((current) => ({
        ...current,
        [`room-${room.roomId}-terms`]: "",
      }));
    }
  };

  const updateRoomForm = (roomId, updater) => {
    setRoomForms((current) => ({
      ...current,
      [roomId]: updater(current[roomId] || { occupantCount: 1, coOccupants: [] }),
    }));
  };

  const validateCoOccupantPhone = (roomId, index, value) => {
    const phone = normalizePhone(value);
    if (!phone) return `Vui lòng nhập số điện thoại người ở cùng ${index + 1}.`;
    if (!VIETNAM_PHONE_PATTERN.test(phone)) {
      return "Số điện thoại phải là số Việt Nam gồm 10 chữ số và bắt đầu bằng 0.";
    }
    if (phone === normalizePhone(form.phone)) {
      return "Số điện thoại người ở cùng không được trùng người đặt cọc chính.";
    }
    const duplicated = (roomForms[roomId]?.coOccupants || []).some(
      (occupant, occupantIndex) => occupantIndex !== index && normalizePhone(occupant.phone) === phone,
    );
    return duplicated ? "Số điện thoại người ở cùng trong phòng không được trùng nhau." : "";
  };

  const setOccupantCount = (room, nextCount) => {
    const count = Math.max(1, Math.min(Number(room.maxPeople || 1), nextCount));
    updateRoomForm(room.roomId, (current) => ({
      ...current,
      occupantCount: count,
      coOccupants: Array.from(
        { length: Math.max(0, count - 1) },
        (_, index) => current.coOccupants[index] || { fullName: "", phone: "" },
      ),
    }));
  };

  const addCoOccupant = (room) => {
    updateRoomForm(room.roomId, (current) => {
      if (current.occupantCount >= Number(room.maxPeople || 1)) return current;
      return {
        occupantCount: current.occupantCount + 1,
        coOccupants: [...current.coOccupants, { fullName: "", phone: "" }],
      };
    });
  };

  const removeRoom = (roomId) => {
    setRooms((current) => current.filter((room) => room.roomId !== roomId));
    setUnavailableRooms((current) => current.filter((room) => String(room.roomId) !== String(roomId)));
    setContractReviews((current) => {
      const next = { ...current };
      delete next[roomId];
      return next;
    });
  };

  const metadata = useMemo(() => ({
    ...form,
    dob: form.dob || null,
    idIssueDate: form.idIssueDate || null,
    depositMonths: 1,
    paymentCycleMonths: Number(form.paymentCycleMonths),
    rooms: rooms.map((room) => {
      const roomForm = roomForms[room.roomId] || { occupantCount: 1, coOccupants: [] };
      return {
        roomId: room.roomId,
        occupantCount: roomForm.occupantCount,
        coOccupants: roomForm.coOccupants.map((occupant, index) => ({
          ...occupant,
          displayOrder: index + 1,
        })),
      };
    }),
  }), [form, roomForms, rooms]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setError("Vui lòng kiểm tra lại các thông tin bắt buộc trước khi tiếp tục.");
      window.setTimeout(() => {
        document.querySelector('[aria-invalid="true"]')?.focus();
      }, 0);
      return;
    }
    if (rooms.length < 1) {
      setError("Cần có ít nhất 1 phòng để tiếp tục đặt cọc.");
      return;
    }
    if (unavailableRooms.length > 0) {
      const unavailableIds = new Set(unavailableRooms.map((room) => String(room.roomId)));
      setConflict({
        code: "BATCH_ROOM_UNAVAILABLE",
        message: "Một số phòng đã có người đặt cọc hoặc đang được xử lý.",
        unavailableRooms,
        availableRooms: rooms
          .filter((room) => !unavailableIds.has(String(room.roomId)))
          .map((room) => ({ roomId: room.roomId, roomCode: room.roomCode })),
      });
      return;
    }

    const body = new FormData();
    body.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    body.append("frontIdCardFile", files.front);
    body.append("backIdCardFile", files.back);
    body.append("portraitFile", files.portrait);

    try {
      setSubmitting(true);
      const response = await checkoutBatchDeposit(body);
      clearDepositBatchDraft();
      didHandleExpiryRef.current = false;
      setIsSessionExpired(false);
      setRedirectSeconds(10);
      setCheckout(response);
      setBatchStatus(null);
    } catch (requestError) {
      if (requestError.status === 409 && requestError.payload?.code === "BATCH_ROOM_UNAVAILABLE") {
        setUnavailableRooms(requestError.payload.unavailableRooms || []);
        setConflict(requestError.payload);
      } else {
        const apiFieldErrors = requestError.payload?.data?.fieldErrors
          || requestError.payload?.fieldErrors
          || {};
        const mappedErrors = Object.entries(apiFieldErrors).reduce((result, [name, message]) => {
          const fieldName = {
            expectedMoveInDate: "expectedMoveInDate",
            expectedLeaseSignDate: "expectedLeaseSignDate",
            paymentCycleMonths: "paymentCycleMonths",
            idNumber: "idNumber",
            idIssueDate: "idIssueDate",
            idIssuePlace: "idIssuePlace",
            permanentAddress: "permanentAddress",
          }[name] || name;
          result[fieldName] = String(message || "Dữ liệu không hợp lệ.");
          return result;
        }, {});
        if (Object.keys(mappedErrors).length > 0) {
          setFieldErrors((current) => ({ ...current, ...mappedErrors }));
        }
        setError(requestError.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const keepAvailableRooms = () => {
    const availableIds = new Set((conflict?.availableRooms || []).map((room) => String(room.roomId)));
    const remainingRooms = rooms.filter((room) => availableIds.has(String(room.roomId)));
    setRooms(remainingRooms);
    setUnavailableRooms([]);
    dismissedConflictRef.current = "";
    setConflict(null);
    setError("Danh sách đã được cập nhật. Bạn có thể tiếp tục đặt cọc với các phòng còn lại.");
  };

  const cancelCurrentBatch = async () => {
    if (!checkout?.batchId) return;
    try {
      setCancellingPayment(true);
      await cancelBatchDeposit(checkout.batchId);
      setCheckout(null);
      setBatchStatus(null);
      setRemainingMs(null);
      didHandleExpiryRef.current = false;
      setIsSessionExpired(false);
      setRedirectSeconds(10);
      setQrImage("");
      setUnavailableRooms([]);
      setError("Đã hủy giữ chỗ. Bạn có thể chỉnh danh sách phòng và tiếp tục đặt cọc ngay.");
    } catch (cancelError) {
      setError(cancelError.message || "Không thể hủy phiên giữ chỗ.");
    } finally {
      setCancellingPayment(false);
    }
  };

  const chooseOtherRooms = () => {
    writeDepositBatchDraft({ form, rooms, roomForms });
    router.push("/rooms");
  };

  const activeContractRoom = rooms.find(
    (room) => String(room.roomId) === String(activeContractRoomId),
  );
  const activeContractReview = activeContractRoom
    ? contractReviews[activeContractRoom.roomId]
    : null;

  if (isLoadingRooms) {
    return (
      <main className="min-h-screen bg-[#f5f3f4] px-4 pb-16 pt-28 text-[#091426] sm:px-6">
        <div className="mx-auto max-w-2xl rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black">Đang tải danh sách phòng</h1>
          <p className="mt-3 text-sm leading-6 text-[#45474c]">
            Hệ thống đang kiểm tra các phòng đã chọn trước khi đặt cọc.
          </p>
        </div>
      </main>
    );
  }

  if (checkout) {
    const paymentUnavailable = terminalError || paymentExpired || isSessionExpired;
    const paymentRooms = checkout.rooms || rooms;
    const totalAmountLabel = `${Number(checkout.totalAmount || 0).toLocaleString("vi-VN")} VND`;
    const roomCodesLabel = paymentRooms.map((room) => room.roomCode).filter(Boolean).join(", ");
    const manualTransferAvailable = Boolean(
      checkout.bankShortName
      && checkout.accountNumber
      && checkout.accountName
      && checkout.transferDescription,
    );
    return (
      <main className="min-h-screen bg-[#f5f3f4] px-4 pb-16 pt-28 text-[#091426] sm:px-6">
        <ExpiryModal
          open={isSessionExpired}
          redirectSeconds={redirectSeconds}
          onChooseRooms={chooseOtherRooms}
          onHome={() => router.replace("/")}
        />
        <div className="mx-auto max-w-7xl">
          {paymentFinished ? (
            <section className="rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-8 text-center shadow-sm">
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
              <h1 className="mt-5 text-3xl font-black">Đặt cọc thành công</h1>
              <p className="mt-3 text-slate-600">
                Tất cả {rooms.length} phòng đã được xác nhận. Mỗi phòng có một hợp đồng đặt cọc riêng.
              </p>
              <div className="mx-auto mt-6 grid max-w-2xl gap-2 sm:grid-cols-2">
                {(checkout.rooms || rooms).map((room) => (
                  <div
                    key={room.roomId}
                    className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm"
                  >
                    <strong>Phòng {room.roomCode}</strong>
                    <span className="font-semibold text-emerald-700">Đã xác nhận</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => router.push("/rooms?depositSuccess=true")}
                className="mt-7 h-12 rounded-xl bg-slate-950 px-6 font-bold text-white"
              >
                Trở về danh sách phòng
              </button>
            </section>
          ) : (
            <>
              <button
                type="button"
                onClick={() => router.push("/rooms")}
                className="mb-5 flex items-center gap-2 text-sm font-bold text-[#45474c]"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại xem phòng
              </button>
              <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                <aside className="grid h-fit gap-4 lg:sticky lg:top-28">
                  <section className="rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-4 shadow-[0_4px_10px_rgba(9,20,38,0.04)]">
                    <h2 className="text-xl font-bold text-[#091426]">{paymentRooms.length} phòng đang giữ chỗ</h2>
                    <div className="mt-4 grid gap-4">
                      {paymentRooms.map((paymentRoom) => {
                        const room = rooms.find(
                          (item) => String(item.roomId) === String(paymentRoom.roomId),
                        ) || paymentRoom;
                        const roomPrice = Number(room.listedPrice || room.price || 0);

                        return (
                          <article key={room.roomId} className="overflow-hidden rounded-xl border border-[#d8dde6] bg-white">
                            {room.image ? (
                              <div className="relative h-36 overflow-hidden bg-slate-100">
                                <Image
                                  src={room.image}
                                  alt={`Phòng ${room.roomCode}`}
                                  fill
                                  sizes="306px"
                                  className="object-cover"
                                  unoptimized
                                />
                                <span className="absolute right-3 top-3 rounded-full bg-[#006c49] px-3 py-1 text-xs font-bold text-white">
                                  Đang giữ chỗ
                                </span>
                              </div>
                            ) : null}
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="text-lg font-bold text-[#091426]">Phòng {room.roomCode}</h3>
                                  <p className="mt-1 text-xs text-[#718096]">
                                    {room.floor || "Chưa cập nhật"} · phù hợp 1-{room.maxPeople || 1} người
                                  </p>
                                </div>
                                {roomPrice > 0 ? (
                                  <p className="whitespace-nowrap text-right">
                                    <strong className="text-[#006c49]">{(roomPrice / 1_000_000).toFixed(1)}M</strong>
                                    <span className="text-xs text-[#45474c]"> /tháng</span>
                                  </p>
                                ) : null}
                              </div>
                              <div className="mt-4 grid gap-3 border-t border-[#d8dde6] pt-4">
                                <RoomFeature icon={Ruler}>{room.area || "Chưa cập nhật"} m²</RoomFeature>
                                <RoomFeature icon={Wifi}>Wifi tốc độ cao</RoomFeature>
                                <RoomFeature icon={ShieldCheck}>An ninh 24/7, camera giám sát</RoomFeature>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.05em] text-[#091426]">Lưu ý đặt cọc</h3>
                    <p className="mt-2 text-sm italic leading-6 text-[#45474c]">
                      Yêu cầu đặt cọc sẽ được xử lý trong vòng 24h làm việc. Quý khách vui lòng kiểm tra email sau khi gửi yêu cầu.
                    </p>
                  </section>
                </aside>

                <section className="rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-6 shadow-[0_4px_10px_rgba(9,20,38,0.04)] sm:p-8">
                  <div className="flex flex-col gap-4 border-b border-[#c5c6cd] pb-6 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#006c49]">Bước đặt cọc</p>
                      <h1 className="mt-2 text-3xl font-bold tracking-[-0.02em] text-[#091426] sm:text-4xl">
                        Đặt cọc giữ phòng
                      </h1>
                      <p className="mt-2 text-base leading-7 text-[#45474c]">
                        {form.fullName || "Khách thuê"} vui lòng chuyển khoản tiền cọc để giữ phòng {roomCodesLabel}.
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#ecfdf5] px-5 py-4 text-right">
                      <p className="text-sm text-[#007a55]">Số tiền cọc</p>
                      <p className="text-2xl font-bold text-[#006c49]">{totalAmountLabel}</p>
                    </div>
                  </div>

                {error ? (
                  <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                    {error}
                  </div>
                ) : null}
                {batchStatus?.status === "REFUND_REQUIRED" && (
                  <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                    Giao dịch đến sau thời gian giữ phòng. Khoản tiền cần được đối soát/hoàn lại và không phòng nào được xác nhận.
                  </div>
                )}
                {paymentExpired && !terminalError && !isSessionExpired ? (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                    Phiên giữ chỗ đã hết hạn. Vui lòng chọn lại phòng để tạo giao dịch mới.
                  </div>
                ) : null}

                  <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="grid gap-4">
                      <div className="rounded-xl border border-[#c5c6cd] bg-white p-5">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-[#091426]" />
                          <h2 className="text-lg font-bold text-[#091426]">Thông tin thanh toán</h2>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                          Vui lòng chuyển đúng số tiền và đúng nội dung chuyển khoản để hệ thống tự động xác nhận.
                        </p>
                        {paymentUnavailable ? (
                          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-6 text-rose-700">
                            Thông tin chuyển khoản đã được ẩn vì phiên giữ chỗ đã hết hạn.
                          </div>
                        ) : manualTransferAvailable ? (
                          <div className="mt-5 grid gap-3">
                            <CopyRow label="Ngân hàng" value={checkout.bankShortName} disabled={paymentUnavailable} />
                            <CopyRow label="Số tài khoản" value={checkout.accountNumber} disabled={paymentUnavailable} />
                            <CopyRow label="Tên người nhận" value={checkout.accountName} disabled={paymentUnavailable} />
                            <CopyRow label="Số tiền" value={totalAmountLabel} disabled={paymentUnavailable} />
                            <CopyRow label="Nội dung chuyển khoản" value={checkout.transferDescription} disabled={paymentUnavailable} />
                          </div>
                        ) : (
                          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
                            Vui lòng quét QR hoặc mở trang thanh toán PayOS.
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-[#c5c6cd] bg-white p-5">
                        <h2 className="text-lg font-bold text-[#091426]">Thông tin giữ chỗ</h2>
                        <div className="mt-4 grid gap-3 text-sm text-[#45474c] sm:grid-cols-2">
                          <p><CalendarDays className="mr-2 inline h-4 w-4" /> Ký HĐ: {form.expectedLeaseSignDate || "Chưa chọn"}</p>
                          <p><Home className="mr-2 inline h-4 w-4" /> Vào ở: {form.expectedMoveInDate || "Chưa chọn"}</p>
                          <p><Phone className="mr-2 inline h-4 w-4" /> {form.phone || "Chưa có SĐT"}</p>
                          <p><Mail className="mr-2 inline h-4 w-4" /> {form.email || "Chưa có email"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#c5c6cd] bg-white p-5 text-center">
                      <div className="relative mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#c5c6cd] bg-[#f5f3f4]">
                        {qrImage ? (
                          <Image
                            src={qrImage}
                            alt="QR thanh toán đặt cọc nhiều phòng"
                            width={260}
                            height={260}
                            className={`h-full w-full rounded-xl object-contain p-3 transition ${paymentUnavailable ? "blur-md opacity-10 grayscale" : ""}`}
                            unoptimized
                          />
                        ) : (
                          <p className="px-4 text-sm font-semibold leading-6 text-[#45474c]">
                            Vui lòng mở trang thanh toán PayOS.
                          </p>
                        )}
                        {paymentUnavailable ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/85">
                            <span className="-rotate-12 rounded-lg border-2 border-rose-600 px-4 py-2 text-sm font-black tracking-[0.12em] text-rose-700">
                              ĐÃ HẾT HẠN
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <p className="mt-4 text-sm leading-6 text-[#45474c]">
                        Quét mã QR hoặc chuyển khoản theo thông tin bên cạnh. Hệ thống sẽ tự cập nhật khi giao dịch được xác nhận.
                      </p>
                      {checkout.paymentLinkId && !paymentUnavailable ? (
                        <p className="mt-2 break-all text-xs text-[#6b7280]">
                          Mã liên kết thanh toán: {checkout.paymentLinkId}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs font-semibold text-[#091426]">
                        {paymentUnavailable ? "Phiên giữ chỗ đã kết thúc." : "Phòng đang được giữ chỗ, chờ thanh toán."}
                      </p>
                      <div className={`mt-4 rounded-xl border px-4 py-3 ${paymentUnavailable
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}>
                        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.08em]">
                          <Clock3 className="h-4 w-4" />
                          Thời gian giữ chỗ còn lại
                        </div>
                        <p className="mt-1 text-2xl font-bold">{formatCountdown(remainingMs)}</p>
                        <p className="mt-1 text-xs leading-5">
                          {paymentUnavailable
                            ? "Phiên giữ chỗ đã kết thúc."
                            : "Hết thời gian, hệ thống sẽ trả các phòng về trạng thái trống."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={paymentUnavailable || !checkout.checkoutUrl}
                    onClick={() => {
                      if (paymentUnavailable || !checkout.checkoutUrl) return;
                      window.open(checkout.checkoutUrl, "_blank", "noopener,noreferrer");
                    }}
                    className="mt-8 flex h-[64px] w-full items-center justify-center gap-3 rounded-xl bg-[#091426] text-base font-bold text-white shadow-[0_10px_18px_rgba(9,20,38,0.18)] transition hover:bg-[#16253a] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Mở trang thanh toán
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  {!paymentUnavailable ? (
                    <button
                      type="button"
                      disabled={cancellingPayment}
                      onClick={cancelCurrentBatch}
                      className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-[#c5c6cd] bg-white text-sm font-bold text-[#091426] transition hover:bg-[#f5f3f4] disabled:opacity-60"
                    >
                      {cancellingPayment ? "Đang hủy giữ chỗ..." : "Hủy giữ chỗ"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push("/rooms")}
                      className="mt-3 flex h-12 w-full items-center justify-center rounded-xl border border-[#c5c6cd] bg-white text-sm font-bold text-[#091426]"
                    >
                      Chọn lại phòng
                    </button>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f3f4] px-4 pb-16 pt-28 text-[#091426] sm:px-6">
      <form onSubmit={submit} noValidate className="mx-auto max-w-7xl">
        <div className="mb-5">
          <button type="button" onClick={chooseOtherRooms} className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <ArrowLeft className="h-4 w-4" />
            Quay lại xem phòng
          </button>
        </div>

        {rooms.length < 1 && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 font-bold text-amber-800">
            {roomLoadError || "Cần có ít nhất 1 phòng để tiếp tục đặt cọc."}
          </div>
        )}
        {fieldErrors.rooms ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {fieldErrors.rooms}
          </div>
        ) : null}
        {error && <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

        <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="grid gap-4 lg:sticky lg:top-28">
            <section className="rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-4 shadow-sm">
              <h2 className="text-xl font-black">{rooms.length} phòng đã chọn</h2>
              <div className="mt-4 grid gap-4">
                {rooms.map((room) => {
                  const unavailableRoom = unavailableRooms.find(
                    (item) => String(item.roomId) === String(room.roomId),
                  );
                  return (
                    <article
                      key={room.roomId}
                      className={`overflow-hidden rounded-xl border bg-white ${unavailableRoom ? "border-rose-300" : "border-[#d8dde6]"
                        }`}
                    >
                      <div className="relative h-36 overflow-hidden bg-slate-100">
                        <Image
                          src={room.image}
                          alt={`Phòng ${room.roomCode}`}
                          fill
                          sizes="306px"
                          className="object-cover"
                          unoptimized
                        />
                        <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold text-white ${unavailableRoom ? "bg-rose-600" : "bg-[#00966d]"
                          }`}>
                          {unavailableRoom ? "Không khả dụng" : "Còn trống"}
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-black">Phòng {room.roomCode}</h3>
                            <p className="mt-1 text-xs text-[#718096]">
                              {room.floor} · phù hợp 1-{room.maxPeople} người
                            </p>
                          </div>
                          <p className="whitespace-nowrap text-right">
                            <strong className="text-[#00966d]">
                              {(Number(room.listedPrice || room.price || 0) / 1_000_000).toFixed(1)}M
                            </strong>
                            <span className="text-xs text-[#45474c]"> /tháng</span>
                          </p>
                        </div>
                        <div className="mt-4 grid gap-3 border-t border-[#d8dde6] pt-4">
                          <RoomFeature icon={Ruler}>{room.area || "Chưa cập nhật"} m²</RoomFeature>
                          <RoomFeature icon={Wifi}>Wifi tốc độ cao</RoomFeature>
                          <RoomFeature icon={ShieldCheck}>An ninh 24/7, camera giám sát</RoomFeature>
                        </div>
                        {unavailableRoom ? (
                          <p className="mt-3 text-xs font-semibold text-rose-600">{unavailableRoom.message}</p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeRoom(room.roomId)}
                          className="mt-4 text-sm font-bold text-rose-600 transition hover:text-rose-700"
                        >
                          Bỏ phòng này
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-4">
              <h3 className="text-sm font-black">Lưu ý đặt cọc</h3>
              <p className="mt-2 text-sm italic leading-6 text-[#45474c]">
                Yêu cầu đặt cọc sẽ được xử lý trong vòng 24h làm việc. Quý khách vui lòng kiểm tra email sau khi gửi yêu cầu.
              </p>
            </section>
          </aside>

          <div className="grid gap-5">
            <section className="rounded-xl border border-[#c5c6cd] bg-[#fbf8fa] p-6 shadow-sm sm:p-8">
              <div>
                <h1 className="text-3xl font-black tracking-[-0.02em]">Thông tin đặt cọc</h1>
                <p className="mt-2 text-sm leading-6 text-[#45474c]">
                  Một hồ sơ dùng để đặt cọc {rooms.length} phòng. Mỗi phòng sẽ có một hợp đồng đặt cọc riêng.
                </p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <TextField label="Họ và tên" required error={fieldErrors.fullName} value={form.fullName} onChange={(event) => updateFormField("fullName", event.target.value)} onBlur={(event) => updateFormField("fullName", event.target.value)} />
                </div>
                <TextField label="Ngày sinh" required type="date" error={fieldErrors.dob} value={form.dob} max={todayValue()} onChange={(event) => updateFormField("dob", event.target.value)} onBlur={(event) => updateFormField("dob", event.target.value)} />
                <TextField label="Số điện thoại" required type="tel" error={fieldErrors.phone} value={form.phone} onChange={(event) => updateFormField("phone", event.target.value)} onBlur={(event) => updateFormField("phone", event.target.value)} />
                <TextField label="Email (không bắt buộc)" type="email" error={fieldErrors.email} value={form.email} onChange={(event) => updateFormField("email", event.target.value)} onBlur={(event) => updateFormField("email", event.target.value)} />
                <TextField label="Số CCCD" required inputMode="numeric" error={fieldErrors.idNumber} value={form.idNumber} onChange={(event) => updateFormField("idNumber", event.target.value)} onBlur={(event) => updateFormField("idNumber", event.target.value)} />
                <TextField label="Ngày cấp CCCD" required type="date" error={fieldErrors.idIssueDate} value={form.idIssueDate} max={todayValue()} onChange={(event) => updateFormField("idIssueDate", event.target.value)} onBlur={(event) => updateFormField("idIssueDate", event.target.value)} />
                <TextField label="Nơi cấp CCCD" required error={fieldErrors.idIssuePlace} value={form.idIssuePlace} onChange={(event) => updateFormField("idIssuePlace", event.target.value)} onBlur={(event) => updateFormField("idIssuePlace", event.target.value)} />
                <div className="sm:col-span-2">
                  <TextField label="Địa chỉ thường trú" required error={fieldErrors.permanentAddress} value={form.permanentAddress} onChange={(event) => updateFormField("permanentAddress", event.target.value)} onBlur={(event) => updateFormField("permanentAddress", event.target.value)} />
                </div>
                <TextField label="Ngày dự kiến vào ở" required type="date" min={todayValue()} max={todayValue(MAX_DEPOSIT_SCHEDULE_DAYS)} error={fieldErrors.expectedMoveInDate} value={form.expectedMoveInDate} onChange={(event) => updateFormField("expectedMoveInDate", event.target.value)} onBlur={(event) => updateFormField("expectedMoveInDate", event.target.value)} />
                <TextField label="Ngày hẹn ký hợp đồng" required type="date" min={todayValue()} max={todayValue(MAX_DEPOSIT_SCHEDULE_DAYS)} error={fieldErrors.expectedLeaseSignDate} value={form.expectedLeaseSignDate} onChange={(event) => updateFormField("expectedLeaseSignDate", event.target.value)} onBlur={(event) => updateFormField("expectedLeaseSignDate", event.target.value)} />
                <label className="grid gap-2 text-sm font-bold text-slate-700">
                  <span>Chu kỳ thanh toán</span>
                  <select
                    value={form.paymentCycleMonths}
                    aria-invalid={fieldErrors.paymentCycleMonths ? "true" : "false"}
                    onChange={(event) => updateFormField("paymentCycleMonths", event.target.value)}
                    className={`h-12 w-full rounded-lg border bg-white px-4 text-[#091426] outline-none focus:border-[#091426] focus:ring-2 focus:ring-[#091426]/10 ${fieldErrors.paymentCycleMonths ? "border-rose-500" : "border-[#c5c6cd]"
                      }`}
                  >
                    <option value="1">1 tháng/lần</option>
                    <option value="3">3 tháng/lần</option>
                  </select>
                  {fieldErrors.paymentCycleMonths ? <span className="text-xs font-medium text-rose-600">{fieldErrors.paymentCycleMonths}</span> : null}
                </label>
              </div>

              <section className="mt-7 rounded-xl border border-[#d8dde6] bg-white p-5">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-[#4f46e5]" />
                  <h2 className="text-lg font-black">Thông tin số người theo từng phòng</h2>
                </div>
                <div className="mt-5 grid gap-5">
                  {rooms.map((room) => {
                    const roomForm = roomForms[room.roomId] || { occupantCount: 1, coOccupants: [] };
                    return (
                      <article key={room.roomId} className="rounded-xl border border-[#d8dde6] bg-[#fbf8fa] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-black">Phòng {room.roomCode}</h3>
                            <p className="mt-1 text-xs text-[#718096]">{room.floor} · {formatMoney(DEPOSIT_PER_ROOM)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRoom(room.roomId)}
                            className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600"
                          >
                            Bỏ phòng
                          </button>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(180px,0.9fr)_minmax(0,1.1fr)]">
                          <label className="grid gap-2 text-xs font-semibold text-[#45474c]">
                            <span>Số lượng người ở</span>
                            <select
                              value={roomForm.occupantCount}
                              onChange={(event) => setOccupantCount(room, Number(event.target.value))}
                              aria-invalid={fieldErrors[`room-${room.roomId}-occupantCount`] ? "true" : "false"}
                              className="h-12 rounded-lg border border-[#c5c6cd] bg-white px-4 text-sm text-[#091426] outline-none focus:border-[#091426]"
                            >
                              {Array.from({ length: Number(room.maxPeople || 1) }, (_, index) => index + 1).map((count) => (
                                <option key={count} value={count}>{count} người</option>
                              ))}
                            </select>
                          </label>
                          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs leading-5 text-indigo-700">
                            Người đứng cọc đầu tiên mặc định là người ở chính của từng phòng. Có thể thêm người ở cùng sau khi ký hợp đồng.
                          </div>
                        </div>
                        {fieldErrors[`room-${room.roomId}-occupantCount`] ? (
                          <p className="mt-2 text-xs font-medium text-rose-600">
                            {fieldErrors[`room-${room.roomId}-occupantCount`]}
                          </p>
                        ) : null}
                        {roomForm.coOccupants.map((occupant, index) => (
                          <div key={index} className="mt-4 rounded-xl border border-[#d8dde6] bg-white p-4">
                            <p className="mb-3 text-sm font-black">Người ở cùng {index + 1}</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <TextField
                                label="Họ và tên"
                                required
                                error={fieldErrors[`room-${room.roomId}-co-${index}-fullName`]}
                                value={occupant.fullName}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  updateRoomForm(room.roomId, (current) => ({
                                    ...current,
                                    coOccupants: current.coOccupants.map((item, itemIndex) => itemIndex === index ? { ...item, fullName: value } : item),
                                  }));
                                  setFieldErrors((current) => ({
                                    ...current,
                                    [`room-${room.roomId}-co-${index}-fullName`]: value.trim()
                                      ? ""
                                      : `Vui lòng nhập họ tên người ở cùng ${index + 1}.`,
                                  }));
                                }}
                              />
                              <TextField
                                label="Số điện thoại"
                                required
                                type="tel"
                                error={fieldErrors[`room-${room.roomId}-co-${index}-phone`]}
                                value={occupant.phone}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  updateRoomForm(room.roomId, (current) => ({
                                    ...current,
                                    coOccupants: current.coOccupants.map((item, itemIndex) => itemIndex === index ? { ...item, phone: value } : item),
                                  }));
                                  setFieldErrors((current) => ({
                                    ...current,
                                    [`room-${room.roomId}-co-${index}-phone`]: validateCoOccupantPhone(room.roomId, index, value),
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        ))}
                        {roomForm.occupantCount < Number(room.maxPeople || 1) ? (
                          <button
                            type="button"
                            onClick={() => addCoOccupant(room)}
                            className="mt-4 text-sm font-bold text-[#4f46e5]"
                          >
                            + Thêm người ở cùng cho phòng {room.roomCode}
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <BatchFileUploadZone
                  id="batch-id-front"
                  label="Mặt trước CCCD"
                  helperText="Tải ảnh rõ nét để xác thực thông tin"
                  preview={filePreviews.front}
                  error={fieldErrors.front}
                  onChange={(event) => updateFile("front", event.target.files?.[0] || null)}
                />
                <BatchFileUploadZone
                  id="batch-id-back"
                  label="Mặt sau CCCD"
                  helperText="Tải ảnh rõ nét để xác thực thông tin"
                  preview={filePreviews.back}
                  error={fieldErrors.back}
                  onChange={(event) => updateFile("back", event.target.files?.[0] || null)}
                />
                <div className="sm:col-span-2">
                  <BatchFileUploadZone
                    id="batch-portrait"
                    label="Ảnh chân dung"
                    helperText="Tải ảnh rõ nét để xác thực thông tin"
                    preview={filePreviews.portrait}
                    error={fieldErrors.portrait}
                    onChange={(event) => updateFile("portrait", event.target.files?.[0] || null)}
                  />
                </div>
              </div>
            </section>

            {rooms.map((room) => {
              const review = contractReviews[room.roomId];
              const accepted = review?.accepted && review.signature === contractSignature(room, form);
              return (
                <section key={room.roomId} className="rounded-xl border border-[#d8dde6] bg-white p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 font-black">
                        <FileText className="h-4 w-4 text-[#006c49]" />
                        Hợp đồng đặt cọc - Phòng {room.roomCode}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[#45474c]">
                        Xem trước hợp đồng đã tự điền thông tin trước khi chuyển sang màn thanh toán.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => previewContract(room)}
                      disabled={previewingRoomId === room.roomId}
                      className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-[#091426] bg-white px-5 text-sm font-bold text-[#091426] transition hover:bg-[#091426] hover:text-white disabled:opacity-60"
                    >
                      {previewingRoomId === room.roomId ? "Đang tạo..." : "Xem hợp đồng đặt cọc"}
                    </button>
                  </div>
                  <label className={`mt-3 flex items-start gap-3 rounded-lg px-4 py-3 text-sm font-semibold ${
                    accepted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    <input
                      type="checkbox"
                      checked={Boolean(accepted)}
                      disabled={!review?.preview}
                      onChange={(event) => setContractAccepted(room, event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-[#c5c6cd] accent-[#091426] disabled:opacity-50"
                    />
                    <span>Tôi đã xem và đồng ý với các điều khoản trong hợp đồng của phòng {room.roomCode}</span>
                  </label>
                  {fieldErrors[`room-${room.roomId}-terms`] ? (
                    <p className="mt-2 text-xs font-semibold text-rose-600">
                      {fieldErrors[`room-${room.roomId}-terms`]}
                    </p>
                  ) : null}
                </section>
              );
            })}

            {!allContractsAccepted ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm italic text-amber-800">
                Bạn cần xem hợp đồng và tick đồng ý trong bản preview trước khi tiếp tục thanh toán.
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || rooms.length < 1 || unavailableRooms.length > 0 || !allContractsAccepted}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-[#091426] px-5 text-base font-black text-white shadow-sm transition hover:bg-[#16253a] disabled:cursor-not-allowed disabled:bg-[#8f9398]"
            >
              {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
              {unavailableRooms.length > 0 ? "Có phòng đang được giữ chỗ" : "Tiếp tục đặt cọc"}
              {!submitting && unavailableRooms.length === 0 ? <ArrowRight className="h-5 w-5" /> : null}
            </button>
          </div>
        </div>
      </form>

      {conflict && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4"
          onMouseDown={(event) => {
            if (event.target !== event.currentTarget) return;
            dismissedConflictRef.current = unavailableRooms
              .map((room) => room.roomId)
              .sort()
              .join(",");
            setConflict(null);
          }}
        >
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => {
                dismissedConflictRef.current = unavailableRooms
                  .map((room) => room.roomId)
                  .sort()
                  .join(",");
                setConflict(null);
              }}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            >
              <X className="h-5 w-5" />
            </button>
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <h2 className="mt-4 text-2xl font-black">Một số phòng không còn khả dụng</h2>
            <p className="mt-2 text-sm text-slate-600">Hệ thống chưa giữ phòng và chưa tạo QR cho giao dịch này.</p>
            <div className="mt-5 grid gap-2">
              {conflict.unavailableRooms?.map((room) => (
                <div key={room.roomId} className="rounded-xl bg-rose-50 px-4 py-3 text-sm">
                  <strong>Phòng {room.roomCode}</strong>
                  <span className="ml-2 text-rose-700">{room.message || room.reason}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={chooseOtherRooms}
                className="h-11 rounded-xl border border-slate-200 px-5 font-bold"
              >
                Chọn phòng khác
              </button>
              <button type="button" onClick={keepAvailableRooms} className="h-11 rounded-xl bg-slate-950 px-5 font-bold text-white">
                Loại phòng đã bị đặt và tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {activeContractRoom && activeContractReview?.preview ? (
        <ContractPreviewModal
          room={activeContractRoom}
          review={activeContractReview}
          onAcceptedChange={(accepted) => setContractAccepted(activeContractRoom, accepted)}
          onClose={() => setActiveContractRoomId(null)}
        />
      ) : null}
    </main>
  );
}
