"use client";

import { LoaderCircle, MapPin, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { facilityStatusOptions } from "@/services/facilityService";

function FieldError({ id, message }) {
  if (!message) return null;

  return (
    <p id={id} className="text-xs font-semibold text-rose-600 dark:text-rose-300">
      {message}
    </p>
  );
}
export function FacilityFormDialog({
  formState,
  onClose,
  onChange,
  onSubmit,
}) {
  const isEditing = formState.mode === "edit";
  const statusLocked =
    isEditing &&
    (!formState.values.hasFloorPlan || (formState.values.roomCount ?? 0) <= 0);
  const openAddressPicker = () => {
    const query = formState.values.address?.trim() || "Vietnam";
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <Dialog
      open={formState.isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100vh-2rem)] max-w-xl overflow-y-auto p-0"
      >
        <DialogHeader className="flex-row items-start justify-between border-b border-[#e2e8f0] dark:border-white/10 px-6 py-5 text-left">
          <div>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              {isEditing ? "Chỉnh sửa cơ sở" : "Thêm cơ sở mới"}
            </DialogTitle>
            <DialogDescription className="mt-1.5">
              {isEditing
                ? "Cập nhật thông tin hiển thị của cơ sở."
                : "Tạo cơ sở để bắt đầu quản lý tầng và phòng."}
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={formState.isSubmitting}
            className="rounded-lg p-2 text-slate-500 dark:text-slate-400 transition hover:bg-[#f2f4f6] dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
            aria-label="Đóng biểu mẫu"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-5 px-6 py-6">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Tên cơ sở <span className="text-rose-600 dark:text-rose-300">*</span>
              </span>
              <input
                autoFocus
                value={formState.values.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Ví dụ: Ký túc xá Sunshine"
                aria-invalid={Boolean(formState.errors.name)}
                aria-describedby={
                  formState.errors.name ? "facility-name-error" : undefined
                }
                className={cn(
                  "h-12 rounded-lg border bg-white dark:bg-[#0f172a] px-4 text-sm font-medium text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 dark:text-slate-500 focus:ring-2",
                  formState.errors.name
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100"
                    : "border-[#cbd3df] dark:border-white/10 focus:border-[#1e40af] focus:ring-[#1e40af]/10",
                )}
              />
              <FieldError
                id="facility-name-error"
                message={formState.errors.name}
              />
            </label>

            <div className="grid gap-2">
              <label htmlFor="facility-address" className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Địa chỉ <span className="text-rose-600 dark:text-rose-300">*</span>
              </label>
              <span className="relative">
                <button
                  type="button"
                  onClick={openAddressPicker}
                  className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-[#1e40af] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Mở Google Maps để chọn địa chỉ"
                  title="Mở Google Maps để chọn địa chỉ"
                >
                  <MapPin className="h-5 w-5" />
                </button>
                <input
                  id="facility-address"
                  value={formState.values.address}
                  onChange={(event) =>
                    onChange("address", event.target.value)
                  }
                  placeholder="Nhập địa chỉ chi tiết"
                  aria-invalid={Boolean(formState.errors.address)}
                  aria-describedby={
                    formState.errors.address
                      ? "facility-address-error"
                      : undefined
                  }
                  className={cn(
                    "h-12 w-full rounded-lg border bg-white dark:bg-[#0f172a] px-4 pr-12 text-sm font-medium text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 dark:text-slate-500 focus:ring-2",
                    formState.errors.address
                      ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100"
                      : "border-[#cbd3df] dark:border-white/10 focus:border-[#1e40af] focus:ring-[#1e40af]/10",
                  )}
                />
              </span>
              <FieldError
                id="facility-address-error"
                message={formState.errors.address}
              />
            </div>

            {isEditing && !statusLocked && (
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Trạng thái <span className="text-rose-600 dark:text-rose-300">*</span>
                </span>
                <select
                  value={formState.values.status || "DRAFT"}
                  onChange={(event) => onChange("status", event.target.value)}
                  className="h-12 w-full rounded-lg border border-[#cbd3df] dark:border-white/10 bg-white dark:bg-[#0f172a] px-4 text-sm font-medium text-slate-900 dark:text-white outline-none transition focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10"
                >
                  {facilityStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Mô tả</span>
              <textarea
                value={formState.values.description}
                onChange={(event) =>
                  onChange("description", event.target.value)
                }
                placeholder="Thông tin bổ sung về cơ sở..."
                className="min-h-28 resize-y rounded-lg border border-[#cbd3df] dark:border-white/10 bg-white dark:bg-[#0f172a] px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 dark:text-slate-500 focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10"
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[#e2e8f0] dark:border-white/10 bg-[#f8fafc] dark:bg-white/5 px-6 py-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={formState.isSubmitting}
              className="h-11 rounded-lg border border-[#cbd3df] dark:border-white/10 bg-white dark:bg-[#0f172a] px-5 text-sm font-bold text-slate-700 dark:text-slate-200 transition hover:bg-[#f2f4f6] dark:hover:bg-white/5 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={formState.isSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-5 text-sm font-bold text-white transition hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {formState.isSubmitting && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}
              {formState.isSubmitting
                ? "Đang lưu..."
                : isEditing
                  ? "Lưu thay đổi"
                  : "Tạo cơ sở"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
