"use client";

import {
  AlertOctagon,
  AlertTriangle,
  CircleHelp,
  LoaderCircle,
  WalletCards,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { facilityStatusOptions } from "@/services/facilityService";

const money = new Intl.NumberFormat("vi-VN");

function getStatusLabel(status) {
  return (
    facilityStatusOptions.find((option) => option.value === status)?.label ||
    status
  );
}

function DialogIcon({ type }) {
  const variants = {
    blocked: {
      icon: AlertOctagon,
      className: "bg-rose-100 text-rose-700",
    },
    warning: {
      icon: AlertTriangle,
      className: "bg-amber-100 text-amber-700",
    },
    confirm: {
      icon: CircleHelp,
      className: "bg-blue-100 text-blue-700",
    },
  };
  const variant = variants[type] || variants.confirm;
  const Icon = variant.icon;

  return (
    <span
      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${variant.className}`}
    >
      <Icon className="h-7 w-7" />
    </span>
  );
}

export function FacilityStatusDialog({
  flow,
  isSubmitting,
  onAcknowledgedChange,
  onClose,
  onConfirm,
}) {
  if (!flow) return null;

  const isBlocked = flow.type === "blocked";
  const isWarning = flow.type === "warning";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={!isSubmitting}
        className="max-w-lg gap-0 overflow-hidden p-0"
      >
        <div className="grid justify-items-center px-6 pb-5 pt-7 text-center">
          <DialogIcon type={flow.type} />
          <DialogHeader className="mt-5 items-center">
            <DialogTitle className="text-xl font-bold text-[#091426]">
              {isBlocked
                ? "Không thể đóng cơ sở"
                : isWarning
                  ? "Cơ sở vẫn còn hợp đồng"
                  : "Xác nhận thay đổi trạng thái"}
            </DialogTitle>
            <DialogDescription className="max-w-md leading-6">
              {isBlocked
                ? `${flow.facility.name} vẫn còn công nợ chưa thanh toán. Trạng thái sẽ được giữ nguyên.`
                : isWarning
                  ? `${flow.facility.name} đang có hợp đồng còn hiệu lực. Việc đóng vĩnh viễn có thể ảnh hưởng người thuê.`
                  : `Chuyển ${flow.facility.name} sang trạng thái “${getStatusLabel(flow.nextStatus)}”?`}
            </DialogDescription>
          </DialogHeader>
        </div>

        {isBlocked && (
          <div className="mx-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
              <div>
                <p className="text-sm font-bold text-rose-900">
                  Công nợ cần xử lý
                </p>
                <p className="mt-1 text-2xl font-black text-rose-700">
                  {money.format(flow.facility.outstandingDebtAmount || 0)} đ
                </p>
                <p className="mt-2 text-xs leading-5 text-rose-800">
                  Vui lòng hoàn tất đối soát và thu hồi công nợ trước khi đóng
                  cơ sở vĩnh viễn.
                </p>
              </div>
            </div>
          </div>
        )}

        {isWarning && (
          <label className="mx-6 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <input
              type="checkbox"
              checked={flow.acknowledged}
              onChange={(event) =>
                onAcknowledgedChange(event.target.checked)
              }
              className="mt-0.5 h-4 w-4 accent-[#091426]"
            />
            <span className="text-sm font-semibold leading-5 text-amber-950">
              Tôi chắc chắn muốn đóng dù còn hợp đồng
            </span>
          </label>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-5 sm:flex-row sm:justify-end">
          {!isBlocked && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 rounded-lg border border-[#cbd3df] bg-white px-5 text-sm font-bold text-[#243047] hover:bg-[#f2f4f6] disabled:opacity-50"
            >
              Hủy
            </button>
          )}
          <button
            type="button"
            onClick={isBlocked ? onClose : onConfirm}
            disabled={
              isSubmitting || (isWarning && !flow.acknowledged)
            }
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isBlocked || isWarning
                ? "bg-rose-700 hover:bg-rose-800"
                : "bg-[#091426] hover:bg-[#16253a]"
            }`}
          >
            {isSubmitting && (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            )}
            {isBlocked
              ? "Đã hiểu"
              : isSubmitting
                ? "Đang cập nhật..."
                : "Xác nhận thay đổi"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

