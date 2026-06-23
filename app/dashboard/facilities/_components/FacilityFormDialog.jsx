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
import { facilityStatusOptions } from "../_data/mockFacilities";

function FieldError({ id, message }) {
  if (!message) return null;

  return (
    <p id={id} className="text-xs font-semibold text-rose-600">
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
        <DialogHeader className="flex-row items-start justify-between border-b border-[#e2e8f0] px-6 py-5 text-left">
          <div>
            <DialogTitle className="text-xl font-bold text-[#091426]">
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
            className="rounded-lg p-2 text-[#6b7280] transition hover:bg-[#f2f4f6] hover:text-[#091426] disabled:opacity-50"
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
              <span className="text-sm font-bold text-[#243047]">
                Tên cơ sở <span className="text-rose-600">*</span>
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
                  "h-12 rounded-lg border bg-white px-4 text-sm font-medium text-[#091426] outline-none transition placeholder:text-[#9aa3b2] focus:ring-2",
                  formState.errors.name
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100"
                    : "border-[#cbd3df] focus:border-[#091426] focus:ring-[#091426]/10",
                )}
              />
              <FieldError
                id="facility-name-error"
                message={formState.errors.name}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-[#243047]">
                Địa chỉ <span className="text-rose-600">*</span>
              </span>
              <span className="relative">
                <MapPin className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9aa3b2]" />
                <input
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
                    "h-12 w-full rounded-lg border bg-white px-4 pr-12 text-sm font-medium text-[#091426] outline-none transition placeholder:text-[#9aa3b2] focus:ring-2",
                    formState.errors.address
                      ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100"
                      : "border-[#cbd3df] focus:border-[#091426] focus:ring-[#091426]/10",
                  )}
                />
              </span>
              <FieldError
                id="facility-address-error"
                message={formState.errors.address}
              />
            </label>

           <label className="grid gap-2">
              <span className="text-sm font-bold text-[#243047]">
                Trạng thái <span className="text-rose-600">*</span>
              </span>
              <select
                value={formState.values.status || "ACTIVE"}
                onChange={(event) => onChange("status", event.target.value)}
                className="h-12 w-full rounded-lg border border-[#cbd3df] bg-white px-4 text-sm font-medium text-[#091426] outline-none transition focus:border-[#091426] focus:ring-2 focus:ring-[#091426]/10"
              >
                {facilityStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-bold text-[#243047]">Mô tả</span>
              <textarea
                value={formState.values.description}
                onChange={(event) =>
                  onChange("description", event.target.value)
                }
                placeholder="Thông tin bổ sung về cơ sở..."
                className="min-h-28 resize-y rounded-lg border border-[#cbd3df] bg-white px-4 py-3 text-sm font-medium text-[#091426] outline-none transition placeholder:text-[#9aa3b2] focus:border-[#091426] focus:ring-2 focus:ring-[#091426]/10"
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={formState.isSubmitting}
              className="h-11 rounded-lg border border-[#cbd3df] bg-white px-5 text-sm font-bold text-[#243047] transition hover:bg-[#f2f4f6] disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={formState.isSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-5 text-sm font-bold text-white transition hover:bg-[#16253a] disabled:cursor-not-allowed disabled:opacity-60"
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
