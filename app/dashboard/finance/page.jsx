"use client";

import { useState } from "react";
import { Check, Download, Edit3, Trash2, X } from "lucide-react";
import { collectionItems, invoices } from "@/services/dashboardService";
import { PermissionGuard } from "@/app/dashboard/_components/PermissionGuard";
import { ACTION_PERMISSIONS } from "@/app/dashboard/_lib/rbac";

const money = new Intl.NumberFormat("vi-VN");

const invoiceStatus = {
  paid: ["Đã thu", "bg-emerald-50 text-emerald-700"],
  unpaid: ["Chưa thu", "bg-amber-50 text-amber-700"],
  overdue: ["Quá hạn", "bg-rose-50 text-rose-700"],
};

function formatMoney(value) {
  return `${money.format(value)} đ`;
}

function downloadTextFile(filename, content, type = "text/csv;charset=utf-8") {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Modal({ title, children, onClose, footer }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
          <h2 className="text-lg font-bold text-[#091426]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-2 text-[#505f76] hover:bg-[#f2f4f6]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-6 custom-scrollbar">{children}</div>
        {footer && <div className="border-t border-[#e2e8f0] px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

function ExportConfirm({ title, filename, description, onClose, onConfirm }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#6b7280]">
            File sẽ được tải về máy: <span className="font-bold text-[#091426]">{filename}</span>
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="h-10 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white"
            >
              Xuất file
            </button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        <p className="text-sm leading-6 text-[#45474c]">{description}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {["CSV", "Dữ liệu đang lọc", "Tải về máy"].map((item) => (
            <div key={item} className="rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] p-4 text-sm font-bold text-[#091426]">
              {item}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function StatusBadge({ value, map }) {
  const [label, className] = map[value] || ["Không rõ", "bg-slate-100 text-slate-700"];

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${className}`}>{label}</span>;
}

function PageHeader({ title, description, actionLabel, actionIcon: ActionIcon = Check, onAction }) {
  return (
    <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.01em] text-[#191c1e]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#45474c]">{description}</p>
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-5 text-sm font-bold text-white hover:bg-[#16253a]"
        >
          <ActionIcon className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </section>
  );
}

function Card({ children, className = "" }) {
  return (
    <section className={`rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] ${className}`}>
      {children}
    </section>
  );
}

function FinanceSummary() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {collectionItems.map((item) => (
        <Card key={item.label} className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#45474c]">{item.label}</p>
              <p className="mt-3 text-2xl font-bold tracking-[-0.02em] text-[#091426]">{formatMoney(item.value)}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{item.delta}</span>
          </div>
        </Card>
      ))}
    </section>
  );
}

export default function FinancePage() {
  const [exportPrompt, setExportPrompt] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(invoices[0]?.id ?? null);
  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedInvoiceId) || invoices[0];

  const exportInvoices = () => {
    const rows = ["Ma hoa don,Khach thue,Phong,Han thu,So tien,Trang thai"];

    invoices.forEach((invoice) => {
      rows.push(
        [
          invoice.id,
          invoice.tenant,
          invoice.roomId,
          invoice.dueDate,
          invoice.amount,
          invoiceStatus[invoice.status]?.[0] || invoice.status,
        ].join(","),
      );
    });

    downloadTextFile("hoa-don-thang-nay.csv", rows.join("\n"));
  };

  return (
    <>
      <PageHeader
        title="Báo cáo Tài chính"
        description="Theo dõi doanh thu, chi phí vận hành, thu chi tổng hợp và danh sách hóa đơn."
        actionLabel="Xuất Excel/PDF"
        actionIcon={Download}
        onAction={() => setExportPrompt(true)}
      />
      <FinanceSummary />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="border-b border-[#e2e8f0] p-6">
            <h2 className="font-bold text-[#091426]">Hóa đơn tháng này</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="text-xs font-bold uppercase tracking-[0.06em] text-[#505f76]">
                <tr>
                  <th className="px-6 py-4">Mã hóa đơn</th>
                  <th className="px-6 py-4">Khách thuê</th>
                  <th className="px-6 py-4">Phòng</th>
                  <th className="px-6 py-4">Hạn thu</th>
                  <th className="px-6 py-4 text-right">Số tiền</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-[#e2e8f0]">
                    <td className="px-6 py-4 font-bold text-[#091426]">{invoice.id}</td>
                    <td className="px-6 py-4">{invoice.tenant}</td>
                    <td className="px-6 py-4">{invoice.roomId}</td>
                    <td className="px-6 py-4">{invoice.dueDate}</td>
                    <td className="px-6 py-4 text-right font-bold">{formatMoney(invoice.amount)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge value={invoice.status} map={invoiceStatus} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceId(invoice.id)}
                        className="rounded-lg border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-[#091426] hover:border-[#091426]"
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#45474c]">Chi tiết hóa đơn</p>
              <h2 className="mt-2 text-xl font-bold text-[#091426]">{selectedInvoice.id}</h2>
            </div>
            <StatusBadge value={selectedInvoice.status} map={invoiceStatus} />
          </div>
          <div className="mt-6 grid gap-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-[#e2e8f0] pb-3">
              <span className="text-[#6b7280]">Khách thuê</span>
              <span className="font-bold text-[#091426]">{selectedInvoice.tenant}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#e2e8f0] pb-3">
              <span className="text-[#6b7280]">Phòng</span>
              <span className="font-bold text-[#091426]">{selectedInvoice.roomId}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#e2e8f0] pb-3">
              <span className="text-[#6b7280]">Số tiền</span>
              <span className="font-bold text-[#091426]">{formatMoney(selectedInvoice.amount)}</span>
            </div>
          </div>
          <div className="mt-6 grid gap-2">
            <PermissionGuard
              allowedRoles={ACTION_PERMISSIONS.mutateInvoice}
              fallback={
                <div className="grid gap-2">
                  <button
                    type="button"
                    disabled
                    className="h-10 cursor-not-allowed rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] px-4 text-sm font-bold text-[#94a3b8]"
                  >
                    Chỉnh sửa hóa đơn
                  </button>
                  <button
                    type="button"
                    disabled
                    className="h-10 cursor-not-allowed rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] px-4 text-sm font-bold text-[#94a3b8]"
                  >
                    Xác nhận/Hủy hóa đơn
                  </button>
                  <p className="text-xs font-semibold text-[#6b7280]">Kế toán chỉ có quyền xem và xuất dữ liệu.</p>
                </div>
              }
              mode="disabled"
            >
              <div className="grid gap-2">
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426] hover:border-[#091426]"
                >
                  <Edit3 className="h-4 w-4" />
                  Chỉnh sửa hóa đơn
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white"
                >
                  <Check className="h-4 w-4" />
                  Xác nhận hóa đơn
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-100 px-4 text-sm font-bold text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Hủy hóa đơn
                </button>
              </div>
            </PermissionGuard>
          </div>
        </Card>
      </section>
      {exportPrompt && (
        <ExportConfirm
          title="Xuất dữ liệu hóa đơn"
          filename="bao-cao-hoa-don.csv"
          description="Xuất danh sách hóa đơn hiện tại cho nghiệp vụ Excel/PDF, gồm mã hóa đơn, khách thuê, phòng, hạn thu, số tiền và trạng thái."
          onClose={() => setExportPrompt(false)}
          onConfirm={() => {
            exportInvoices();
            setExportPrompt(false);
          }}
        />
      )}
    </>
  );
}
