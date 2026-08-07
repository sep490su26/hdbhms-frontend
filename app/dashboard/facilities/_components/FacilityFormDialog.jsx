"use client";

import { useEffect, useRef } from "react";
import { ImagePlus, LoaderCircle, MapPin, Trash2, X } from "lucide-react";
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

const EMPTY_IMAGES = [];

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
  const existingImages = formState.values.images ?? EMPTY_IMAGES;
  const pendingImages = formState.values.pendingImages ?? EMPTY_IMAGES;
  const pendingImagesRef = useRef([]);

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (formState.isOpen) return;
    pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    pendingImagesRef.current = [];
  }, [formState.isOpen]);

  const addPendingImages = (files) => {
    const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    onChange("pendingImages", [
      ...pendingImages,
      ...imageFiles.map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const removePendingImage = (imageId) => {
    const target = pendingImages.find((image) => image.id === imageId);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(
      "pendingImages",
      pendingImages.filter((image) => image.id !== imageId),
    );
  };

  const removeExistingImage = (image) => {
    if (!image?.id) return;
    onChange(
      "images",
      existingImages.filter((item) => item.id !== image.id),
    );
    onChange("deletedImageIds", [...new Set([...(formState.values.deletedImageIds ?? []), image.id])]);
  };
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
        if (!open && !formState.isSubmitting) onClose();
      }}
    >
      <DialogContent
        lockScroll={false}
        showCloseButton={false}
        overlayClassName="bg-black/10 supports-backdrop-filter:backdrop-blur-xs"
        overlayProps={{
          "aria-hidden": true,
          onClick: () => (formState.isSubmitting ? null : onClose()),
          onTouchMove: (event) => event.preventDefault(),
          onWheel: (event) => event.preventDefault(),
        }}
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto p-0 sm:max-w-xl"
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
          <div className="grid gap-5 px-6 pb-8">
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
              {isEditing && (
                  <section className="grid gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                  Ảnh cơ sở
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Ảnh mới sẽ được tải lên sau khi bấm lưu thay đổi.
                              </p>
                          </div>
                          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#cbd3df] bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-[#1e40af] hover:text-[#1e40af] dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-200">
                              <ImagePlus className="h-4 w-4" />
                              Thêm ảnh
                              <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="sr-only"
                                  onChange={(event) => {
                                      addPendingImages(event.target.files);
                                      event.target.value = "";
                                  }}
                              />
                          </label>
                      </div>

                      {[...existingImages, ...pendingImages].length > 0 ? (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {existingImages.map((image, index) => (
                                  <div
                                      key={`facility-image-${image.id ?? image.url ?? index}`}
                                      className="group relative overflow-hidden rounded-lg border border-[#dbe1ea] bg-white dark:border-white/10 dark:bg-[#0f172a]"
                                  >
                                      <img
                                          src={image.url}
                                          alt={`Ảnh cơ sở ${index + 1}`}
                                          className="aspect-[4/3] w-full object-cover"
                                      />
                                      <button
                                          type="button"
                                          onClick={() => removeExistingImage(image)}
                                          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white opacity-100 transition hover:bg-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                                          aria-label="Xóa ảnh cơ sở"
                                          title="Xóa ảnh cơ sở"
                                      >
                                          <Trash2 className="h-4 w-4" />
                                      </button>
                                  </div>
                              ))}
                              {pendingImages.map((image, index) => (
                                  <div
                                      key={image.id}
                                      className="group relative overflow-hidden rounded-lg border border-dashed border-[#93a4b8] bg-white dark:border-white/20 dark:bg-[#0f172a]"
                                  >
                                      <img
                                          src={image.previewUrl}
                                          alt={`Ảnh cơ sở mới ${index + 1}`}
                                          className="aspect-[4/3] w-full object-cover"
                                      />
                                      <span className="absolute left-2 top-2 rounded-md bg-[#1e40af]/90 px-2 py-1 text-[10px] font-bold text-white">
                          Chờ lưu
                        </span>
                                      <button
                                          type="button"
                                          onClick={() => removePendingImage(image.id)}
                                          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white transition hover:bg-rose-600"
                                          aria-label="Bỏ ảnh cơ sở mới"
                                          title="Bỏ ảnh cơ sở mới"
                                      >
                                          <Trash2 className="h-4 w-4" />
                                      </button>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="rounded-lg border border-dashed border-[#cbd3df] bg-white p-5 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-400">
                              Chưa có ảnh cơ sở.
                          </div>
                      )}
                  </section>
              )}
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
