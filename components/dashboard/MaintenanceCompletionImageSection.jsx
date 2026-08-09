"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";

function FilePreview({ file }) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  return (
    <Image
      src={previewUrl}
      alt={file.name}
      fill
      unoptimized
      sizes="96px"
      className="object-cover"
    />
  );
}

export default function MaintenanceCompletionImageSection({
  existingAttachments = [],
  files,
  onChange,
  onRemove,
}) {
  const totalCount = existingAttachments.length + files.length;
  const canAddMore = totalCount < 3;

  return (
    <section className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4 shrink-0 text-[#1e40af] dark:text-blue-300" />
            <span className="text-sm font-black text-slate-900 dark:text-white">
              Ảnh sau sửa <span className="text-rose-600">*</span>
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            Bắt buộc ít nhất 1 ảnh · tối đa 3 ảnh · JPG, PNG hoặc WEBP
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
          {totalCount}/3 ảnh
        </span>
      </div>

      <div className="flex min-w-0 flex-wrap gap-3">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f172a]"
          >
            <FilePreview file={file} />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/75 text-white shadow-sm transition hover:bg-rose-600"
              aria-label={`Xóa ảnh ${file.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {canAddMore && (
          <label className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#94a3b8] bg-white text-slate-500 transition hover:border-[#1e40af] hover:bg-blue-50/60 hover:text-[#1e40af] dark:border-white/20 dark:bg-[#0f172a] dark:text-slate-300 dark:hover:border-blue-400 dark:hover:bg-blue-500/10">
            <ImagePlus className="h-6 w-6" />
            <span className="text-[11px] font-black">Thêm ảnh</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={onChange}
              className="sr-only"
            />
          </label>
        )}
      </div>
    </section>
  );
}
