"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AlertCircle, Camera, CheckCircle2, IdCard, Loader2, ScanLine, Upload, X } from "lucide-react";
import CameraCapture from "@/components/CameraCapture";

const SIDE_COPY = {
  front: {
    title: "Mặt trước CCCD",
    helper: "Ảnh, QR và thông tin cá nhân.",
  },
  back: {
    title: "Mặt sau CCCD",
    helper: "Mã bảo mật và đặc điểm nhận dạng.",
  },
};

const EMPTY_SLOTS = {
  front: { file: null, previewUrl: "" },
  back: { file: null, previewUrl: "" },
};
const SUPPORTED_CCCD_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORTED_CCCD_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

const toSlotsFromValue = (value = {}) => ({
  front: {
    file: value?.files?.citizenIdFront || null,
    previewUrl: value?.previews?.citizenIdFront || "",
  },
  back: {
    file: value?.files?.citizenIdBack || null,
    previewUrl: value?.previews?.citizenIdBack || "",
  },
});

const toPayload = (slots) => ({
  files: {
    citizenIdFront: slots.front.file,
    citizenIdBack: slots.back.file,
  },
  previews: {
    citizenIdFront: slots.front.previewUrl,
    citizenIdBack: slots.back.previewUrl,
  },
});

function EmptyCccdPreview({ side }) {
  return (
    <span className="flex h-full w-full flex-col justify-between p-4">
      <span className="flex items-start justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#eef2ff] text-[#232946]">
          <IdCard className="h-5 w-5" />
        </span>
        {side === "front" ? (
          <span className="grid h-12 w-12 grid-cols-3 gap-0.5 rounded-md border border-[#c5c6cd] bg-white p-1">
            {Array.from({ length: 9 }).map((_, index) => (
              <span key={index} className={(index + side.length) % 2 ? "bg-[#091426]" : "bg-[#d8dde6]"} />
            ))}
          </span>
        ) : (
          <span className="h-9 w-14 rounded-md border border-[#c5c6cd] bg-white" />
        )}
      </span>
      <span>
        <span className="block h-2 w-2/3 rounded-full bg-[#d8dde6]" />
        <span className="mt-2 block h-2 w-1/2 rounded-full bg-[#e5e7eb]" />
        <span className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#091426] px-3 py-1.5 text-xs font-bold text-white">
          <Upload className="h-3.5 w-3.5" />
          Tải ảnh lên
        </span>
      </span>
    </span>
  );
}

function CccdSideCard({ side, slot, disabled, isScanning, error = "", onPickFile, onCapture, onRemove }) {
  const copy = SIDE_COPY[side];
  const actionDisabled = disabled || isScanning;
  const hasFile = Boolean(slot.file);

  return (
    <div className={`rounded-lg border p-3 ${error ? "border-rose-500 bg-rose-50/40" : "border-[#d8dde6] bg-[#f8fafc]"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-[#091426]">{copy.title}</h3>
          <p className="mt-0.5 truncate text-xs text-[#5a6678]">{copy.helper}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onCapture(side)}
            disabled={actionDisabled}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#c5c6cd] bg-white text-[#091426] transition hover:bg-[#f5f3f4] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Chụp ${copy.title}`}
            title={`Chụp ${copy.title}`}
          >
            <Camera className="h-4 w-4" />
          </button>
          {hasFile && (
            <button
              type="button"
              onClick={() => onRemove(side)}
              disabled={actionDisabled}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#c5c6cd] bg-white text-[#6b7280] transition hover:bg-[#f5f3f4] hover:text-[#091426] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={`Xóa ${copy.title}`}
              title={`Xóa ${copy.title}`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onPickFile(side)}
        disabled={actionDisabled}
        className={`mt-3 flex aspect-[1.58/1] w-full overflow-hidden rounded-lg border bg-white text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${
          error
            ? "border-rose-500"
            : hasFile
            ? "border-[#c5c6cd] hover:border-[#091426]"
            : "border-dashed border-[#aeb1bb] hover:border-[#091426] hover:bg-[#f5f3f4]"
        }`}
        aria-label={`Tải ${copy.title}`}
      >
        {slot.previewUrl ? (
          <span className="relative block h-full w-full">
            <Image src={slot.previewUrl} alt={copy.title} fill sizes="360px" className="object-contain" unoptimized />
            <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white">
              Bấm để thay ảnh
            </span>
          </span>
        ) : (
          <EmptyCccdPreview side={side} />
        )}
      </button>
      {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

export default function CccdUploadFlow({
  value,
  onFilesChange,
  disabled = false,
  scanEnabled = true,
  isExtracting = false,
  errors = {},
  maxFileSize = 10 * 1024 * 1024,
  className = "",
}) {
  const inputRef = useRef(null);
  const activeSideRef = useRef("front");
  const slotsRef = useRef(EMPTY_SLOTS);
  const [cameraSide, setCameraSide] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const slots = useMemo(() => toSlotsFromValue(value), [value]);
  const isScanning = scanEnabled && (status === "scanning" || isExtracting);
  const StatusIcon = scanEnabled
    ? isExtracting
      ? Loader2
      : status === "success"
      ? CheckCircle2
      : status === "error"
        ? AlertCircle
        : ScanLine
    : IdCard;

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  const updateSideFile = async (side, file, previewUrl = "") => {
    if (!file || disabled || isScanning) return;

    if (file.type && !SUPPORTED_CCCD_IMAGE_TYPES.has(file.type)) {
      setStatus("error");
      setMessage("Chỉ hỗ trợ ảnh CCCD dạng JPG, PNG hoặc WebP.");
      return;
    }

    if (file.size > maxFileSize) {
      setStatus("error");
      setMessage("Ảnh CCCD không được vượt quá 10MB.");
      return;
    }

    const shouldRefreshBackSide = side === "front";
    const nextSlots = {
      ...slotsRef.current,
      [side]: {
        file,
        previewUrl: previewUrl || URL.createObjectURL(file),
      },
      ...(shouldRefreshBackSide ? { back: EMPTY_SLOTS.back } : {}),
    };
    slotsRef.current = nextSlots;

    onFilesChange?.(toPayload(nextSlots));

    if (scanEnabled && nextSlots.front.file && nextSlots.back.file) {
      setStatus("ready");
      setMessage("Đã chọn đủ 2 mặt CCCD, đang gửi trích xuất thông tin.");
      return;
    }

    setStatus("ready");
    setMessage(
      scanEnabled
        ? shouldRefreshBackSide
          ? "Đã chọn mặt trước CCCD, vui lòng tải lại mặt sau."
          : `Đã chọn ${SIDE_COPY[side].title.toLowerCase()}, chọn tiếp mặt còn lại.`
        : "Đã lưu ảnh CCCD. Thông tin định danh được nhập thủ công ở form."
    );
  };

  const removeSideFile = (side) => {
    const nextSlots = {
      ...slotsRef.current,
      [side]: EMPTY_SLOTS[side],
    };
    slotsRef.current = nextSlots;
    setStatus(nextSlots.front.file || nextSlots.back.file ? "ready" : "idle");
    setMessage(nextSlots.front.file || nextSlots.back.file ? "Chọn tiếp mặt còn lại của CCCD." : "");
    onFilesChange?.(toPayload(nextSlots));
  };

  const openFilePicker = (side) => {
    activeSideRef.current = side;
    inputRef.current?.click();
  };

  const openCamera = (side) => {
    activeSideRef.current = side;
    setCameraSide(side);
  };

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      updateSideFile(activeSideRef.current, file, URL.createObjectURL(file));
    }
    event.target.value = "";
  };

  return (
    <div className={`min-w-0 w-full rounded-lg border border-[#d8dde6] bg-white p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[#232946]">
          {isScanning ? <Loader2 className="h-5 w-5 animate-spin" /> : <StatusIcon className="h-5 w-5" />}
        </span>
        <div>
          <h2 className="text-base font-bold text-[#091426]">{scanEnabled ? "Quét CCCD" : "Upload CCCD"}</h2>
          <p className="mt-1 text-sm leading-6 text-[#5a6678]">
            {isExtracting ? "Đang quét CCCD và trích xuất thông tin, vui lòng chờ..." : message || (scanEnabled
              ? "Chụp hoặc tải đủ 2 mặt CCCD để tự điền thông tin."
              : "Tải ảnh 2 mặt CCCD để lưu hồ sơ. Chức năng quét đang tắt."
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
        <CccdSideCard
          side="front"
          slot={slots.front}
          disabled={disabled}
          isScanning={isScanning}
          error={errors.citizenIdFront}
          onPickFile={openFilePicker}
          onCapture={openCamera}
          onRemove={removeSideFile}
        />
        <CccdSideCard
          side="back"
          slot={slots.back}
          disabled={disabled}
          isScanning={isScanning}
          error={errors.citizenIdBack}
          onPickFile={openFilePicker}
          onCapture={openCamera}
          onRemove={removeSideFile}
        />
      </div>

      <input ref={inputRef} type="file" accept={SUPPORTED_CCCD_IMAGE_ACCEPT} className="sr-only" onChange={handleInputChange} />

      <CameraCapture
        open={Boolean(cameraSide)}
        onClose={() => setCameraSide(null)}
        onCapture={({ file, previewUrl }) => updateSideFile(activeSideRef.current, file, previewUrl)}
      />
    </div>
  );
}
