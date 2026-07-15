"use client";

import { useRef } from "react";
import Image from "next/image";
import { Camera, Check, Upload, X } from "lucide-react";

export default function PortraitUploadZone({
  id,
  name,
  file,
  preview,
  onChange,
  onCapture,
  onRemove,
  disabled = false,
  error = "",
}) {
  const inputRef = useRef(null);
  const hasPreview = Boolean(preview);
  const fileSizeLabel = file?.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "";

  return (
    <div className={`rounded-xl border bg-[#f8fafc] p-4 transition ${error ? "border-rose-500 bg-rose-50/40" : "border-[#d8dde6]"}`}>
      <input ref={inputRef} id={id} name={name} type="file" accept="image/*" className="sr-only" onChange={onChange} />
      <div className="grid gap-4 lg:grid-cols-[220px_1fr] lg:items-center">
        <div className={`relative aspect-[3/4] min-h-[240px] overflow-hidden rounded-lg border bg-white ${error ? "border-rose-500" : "border-[#c5c6cd]"}`}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="absolute inset-0 flex h-full w-full text-left transition hover:bg-[#f5f3f4]/40 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label={hasPreview ? "Thay ảnh chân dung" : "Tải ảnh chân dung"}
          >
            {hasPreview ? (
              <>
                <Image src={preview} alt="Ảnh chân dung" fill sizes="220px" className="object-cover" unoptimized />
                <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2.5 py-1.5 text-xs font-bold text-white">
                  Bấm để thay ảnh
                </span>
              </>
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-4 p-5 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eef2ff] text-[#232946]">
                  <Upload className="h-6 w-6" />
                </span>
                <span className="text-sm font-bold text-[#091426]">Tải ảnh chân dung</span>
                <span className="text-xs leading-5 text-[#6b7280]">Hoặc bấm icon camera</span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onCapture}
            disabled={disabled}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/80 bg-white/90 text-[#091426] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Chụp ảnh chân dung"
            title="Chụp ảnh"
          >
            <Camera className="h-4 w-4" />
          </button>

          {hasPreview && (
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              className="absolute right-3 bottom-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/80 bg-white/90 text-[#6b7280] shadow-sm transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Xóa ảnh chân dung"
              title="Xóa ảnh"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid gap-3">
          <div>
            <p className="text-sm font-bold text-[#091426]">
              Ảnh chân dung <span className="text-rose-600">*</span>
            </p>
            <p className="mt-1 text-sm leading-6 text-[#5a6678]">Ảnh rõ mặt, chính diện để đối chiếu với hồ sơ đặt cọc.</p>
          </div>

          <div className={`rounded-lg border px-4 py-3 ${hasPreview ? "border-emerald-200 bg-emerald-50" : "border-[#d8dde6] bg-white"}`}>
            <p className={`flex items-center gap-2 text-sm font-bold ${hasPreview ? "text-emerald-700" : "text-[#091426]"}`}>
              <Check className="h-4 w-4" />
              {hasPreview ? "Ảnh chân dung đã sẵn sàng" : "Chưa có ảnh chân dung"}
            </p>
            <p className={`mt-1 text-xs leading-5 ${hasPreview ? "text-emerald-700" : "text-[#6b7280]"}`}>
              {hasPreview ? `${file?.name || "Ảnh đã chọn"}${fileSizeLabel ? ` · ${fileSizeLabel}` : ""}` : "Bấm vào khung ảnh bên trái để tải ảnh lên."}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {["Rõ mặt", "Chính diện", "Không che mặt"].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8dde6] bg-white px-3 py-2 text-xs font-semibold text-[#45474c]">
                <Check className="h-3.5 w-3.5 text-[#006c49]" />
                {item}
              </span>
            ))}
          </div>

          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
