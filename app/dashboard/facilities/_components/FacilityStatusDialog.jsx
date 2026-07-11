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
      className: "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300",
    },
    warning: {
      icon: AlertTriangle,
      className: "bg-amber-100 dark:bg-yellow-500/10 text-amber-700 dark:text-yellow-300",
    },
    confirm: {
      icon: CircleHelp,
      className: "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300",
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
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              {isBlocked
                ? "Không thể đóng cơ sở"
                : isWarning
                  ? "Cơ sở vẫn còn hợp đồng"
                  : "Xác nhận thay đổi trạng thái"}
            </DialogTitle>
            <DialogDescription className="max-w-md leading-6">
              {isBlocked
                ? `${flow.facility.name} v?n còn công n? chua thanh toán. Trạng thái s? du?c gi? nguyên.`
                : isWarning
                  ? `${flow.facility.name} đang có hợp đồng còn hiệu lực. Việc đóng vĩnh viễn có thể ảnh hưởng người thuê.`
                  : `Chuyển ${flow.facility.name} sang trạng thái “${getStatusLabel(flow.nextStatus)}”?`}
            </DialogDescription>
          </DialogHeader>
        </div>

        {isBlocked && (
          <div className="mx-6 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-4">
            <div className="flex items-start gap-3">
              <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-rose-700 dark:text-rose-300" />
              <div>
                <p className="text-sm font-bold text-rose-900 dark:text-rose-300">
                  Công nợ cần xử lý
                </p>
                <p className="mt-1 text-2xl font-black text-rose-700 dark:text-rose-300">
                  {money.format(flow.facility.outstandingDebtAmount || 0)} d
                </p>
                <p className="mt-2 text-xs leading-5 text-rose-800 dark:text-rose-300">
                  Vui lòng hoàn tất đối soát và thu hồi công nợ trước khi đóng
                  cơ sở vĩnh viễn.
                </p>
              </div>
            </div>
          </div>
        )}

        {isWarning && (
          <label className="mx-6 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 dark:border-yellow-500/20 bg-amber-50 dark:bg-yellow-500/10 p-4">
            <input
              type="checkbox"
              checked={flow.acknowledged}
              onChange={(event) =>
                onAcknowledgedChange(event.target.checked)
              }
              className="mt-0.5 h-4 w-4 accent-[#1e40af]"
            />
            <span className="text-sm font-semibold leading-5 text-amber-950">
              Tôi chắc chắn muốn đóng dù còn hợp đồng
            </span>
          </label>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#e2e8f0] dark:border-white/10 bg-[#f8fafc] dark:bg-white/5 px-6 py-5 sm:flex-row sm:justify-end">
          {!isBlocked && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-11 rounded-lg border border-[#cbd3df] dark:border-white/10 bg-white dark:bg-[#0f172a] px-5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-[#f2f4f6] dark:hover:bg-white/5 disabled:opacity-50"
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
                : "bg-[#1e40af] dark:bg-[#2563eb] hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8]"
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
