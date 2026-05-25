"use client";

import { useState } from "react";
import { Check, CloudUpload, X } from "lucide-react";
import { contractTemplates } from "@/services/dashboardService";

async function uploadFile(file) {
  if (!file) {
    throw new Error("Khong co file de tai len.");
  }

  const downloadUrl = typeof URL !== "undefined" ? URL.createObjectURL(file) : "";

  return {
    id: `${Date.now()}-${file.name}`,
    name: file.name,
    size: file.size,
    type: file.type,
    downloadUrl,
  };
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

export default function ContractTemplatePage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState(contractTemplates[0]?.id ?? null);
  const selectedTemplate =
    contractTemplates.find((template) => template.id === selectedTemplateId) || contractTemplates[0];
  const [uploadedName, setUploadedName] = useState("");
  const [recognizedContract, setRecognizedContract] = useState(null);
  const [docxHtml, setDocxHtml] = useState("");
  const [isParsingDocx, setIsParsingDocx] = useState(false);
  const [uploadState, setUploadState] = useState({ status: "idle", error: "" });
  const [uploadedContractFile, setUploadedContractFile] = useState(null);
  const [exportPrompt, setExportPrompt] = useState(false);

  const exportVariables = () => {
    downloadTextFile(
      "bien-mau-hop-dong.csv",
      "Bien,Mo ta\n{{Ma_Phong}},Ma phong\n{{Ten_Khach_Thue}},Ho ten khach\n{{So_CCCD}},So CCCD\n{{So_Tien_Coc}},Tien coc\n{{Ngay_Nhan_Phong}},Ngay nhan phong",
    );
  };

  const previewContract = recognizedContract || {
    name: selectedTemplate.name,
    scope: selectedTemplate.scope,
    source: "Mẫu đang lưu trong hệ thống",
    detectedFields: [
      "{{Mã_Phòng}}",
      "{{Tên_Khách_Thuê}}",
      "{{Số_CCCD}}",
      "{{Số_Tiền_Cọc}}",
      "{{Ngày_Nhận_Phòng}}",
    ],
  };

  const handleTemplateUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const isDocx = /\.docx$/i.test(file.name);

    setUploadedName(file.name);
    setDocxHtml("");
    setUploadedContractFile(null);
    setUploadState({ status: "uploading", error: "" });

    try {
      const uploadedFile = await uploadFile(file);
      setUploadedContractFile(uploadedFile);
      setUploadState({ status: "success", error: "" });
    } catch (error) {
      setUploadState({ status: "error", error: error.message || "Khong the tai file len backend." });
    }

    if (isDocx) {
      setIsParsingDocx(true);

      try {
        const mammoth = (await import("mammoth/mammoth.browser")).default;
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const variables = result.value.match(/\{\{[^}]+\}\}/g) || [];
        const uniqueVars = [...new Set(variables)];

        setDocxHtml(result.value);
        setRecognizedContract({
          name: file.name,
          scope: "Nhận diện từ file tải lên",
          source: `Word contract · ${(file.size / 1024).toFixed(1)} KB`,
          detectedFields:
            uniqueVars.length > 0
              ? uniqueVars
              : ["{{Mã_Phòng}}", "{{Tên_Khách_Thuê}}", "{{Số_CCCD}}", "{{Giá_Thuê}}", "{{Chu_Kỳ_Thanh_Toán}}"],
        });
      } catch {
        setRecognizedContract({
          name: file.name,
          scope: "Nhận diện từ file tải lên",
          source: `Word contract · ${(file.size / 1024).toFixed(1)} KB`,
          detectedFields: ["{{Mã_Phòng}}", "{{Tên_Khách_Thuê}}", "{{Số_CCCD}}"],
        });
      } finally {
        setIsParsingDocx(false);
      }
    } else {
      setRecognizedContract({
        name: file.name,
        scope: "Nhận diện từ file tải lên",
        source: `Tệp hợp đồng · ${(file.size / 1024).toFixed(1)} KB`,
        detectedFields: ["{{Mã_Phòng}}", "{{Tên_Khách_Thuê}}", "{{Số_CCCD}}", "{{Giá_Thuê}}"],
      });
    }
  };

  return (
    <>
      <PageHeader
        title="Mẫu hợp đồng đặt cọc"
        description="Quản lý mẫu Word và cấu hình biến áp dụng cho hợp đồng cọc mới."
      />
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
        Mẫu cũ của hợp đồng đã tạo không bị ảnh hưởng khi chỉnh sửa. Mẫu mới áp dụng cho các hợp đồng tạo sau thời điểm cập nhật.
      </div>
      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid gap-6">
          <Card className="flex min-h-64 flex-col items-center justify-center border-dashed p-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f2f4f6] text-[#505f76]">
              <CloudUpload className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-[#091426]">Tải lên mẫu hợp đồng mới</h2>
            <p className="mt-2 text-sm leading-6 text-[#45474c]">
              Kéo thả file Word (.docx) vào đây hoặc click để chọn file.
            </p>
            <label className="mt-5 inline-flex h-9 cursor-pointer items-center rounded-lg bg-[#091426] px-4 text-sm font-bold text-white hover:bg-[#16253a]">
              Chọn file
              <input type="file" accept=".doc,.docx" className="sr-only" onChange={handleTemplateUpload} />
            </label>
            {uploadedName && (
              <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                Đã chọn: {uploadedName}
              </p>
            )}
            {uploadState.status === "uploading" && (
              <p className="mt-3 text-xs font-bold text-blue-700">Đang upload lên File Storage API...</p>
            )}
            {uploadState.error && (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{uploadState.error}</p>
            )}
            {uploadedContractFile?.downloadUrl && (
              <a
                href={uploadedContractFile.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-xs font-bold text-emerald-700 underline"
              >
                Mở file đã upload
              </a>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] p-5">
              <h2 className="font-bold text-[#091426]">Mẫu hợp đồng tồn tại</h2>
              <span className="rounded-full bg-[#091426] px-3 py-1 text-sm font-bold text-white">{contractTemplates.length}</span>
            </div>
            <div className="grid gap-3 p-4">
              {contractTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`rounded-lg border p-4 text-left ${
                    selectedTemplate.id === template.id ? "border-[#091426] bg-[#f7f9fb]" : "border-[#e2e8f0] bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-[#091426]">{template.name}</p>
                    {template.active && (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Active</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[#45474c]">Mức giá áp dụng: {template.scope}</p>
                  <p className="mt-3 border-t border-[#e2e8f0] pt-3 text-xs text-[#6b7280]">
                    Cập nhật: {template.updatedAt}
                  </p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-[#e2e8f0] p-6 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold text-[#091426]">Xem trước: {previewContract.name}</h2>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setExportPrompt(true)}
                className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]"
              >
                Xuất biến mẫu
              </button>
              <button
                type="button"
                onClick={() => setUploadedName(uploadedName || selectedTemplate.name)}
                className="h-10 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
          <div className="bg-[#eef2f7] p-8">
            <div className="mx-auto min-h-[760px] max-w-[680px] bg-white p-12 text-[#091426] shadow-xl">
              {isParsingDocx && (
                <div className="mb-8 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <p className="text-sm font-semibold text-blue-700">Đang đọc nội dung file Word...</p>
                </div>
              )}
              {recognizedContract && !isParsingDocx && (
                <div className="mb-8 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">
                    Đã nhận diện hợp đồng tải lên
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-900">{recognizedContract.source}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recognizedContract.detectedFields.map((field) => (
                      <span key={field} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {docxHtml ? (
                <div
                  className="prose prose-sm max-w-none leading-7 text-[#091426] [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[#c5c6cd] [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-[#c5c6cd] [&_th]:px-3 [&_th]:py-2"
                  dangerouslySetInnerHTML={{ __html: docxHtml }}
                />
              ) : (
                <>
                  <p className="text-center text-lg font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                  <p className="mt-2 text-center text-sm font-semibold">Độc lập - Tự do - Hạnh phúc</p>
                  <h3 className="mt-10 text-center text-2xl font-bold">HỢP ĐỒNG ĐẶT CỌC THUÊ PHÒNG</h3>
                  <p className="mt-8 leading-7">
                    Bên A đồng ý cho Bên B thuê phòng số <strong>{"{{Mã_Phòng}}"}</strong> tại địa chỉ Hải Đăng Boarding House.
                  </p>
                  <p className="mt-5 font-bold">Bên B (Bên thuê):</p>
                  <ul className="mt-3 list-disc pl-6 leading-8">
                    <li>Ông/Bà: {"{{Tên_Khách_Thuê}}"}</li>
                    <li>CMND/CCCD: {"{{Số_CCCD}}"}</li>
                    <li>Số điện thoại: {"{{SĐT_Khách}}"}</li>
                  </ul>
                  <p className="mt-5 font-bold">Điều 1: Thông tin phòng thuê và tiền cọc</p>
                  <p className="mt-3 leading-7">
                    Tiền cọc: <strong>{"{{Số_Tiền_Cọc}}"}</strong>. Ngày nhận phòng dự kiến:{" "}
                    <strong>{"{{Ngày_Nhận_Phòng}}"}</strong>.
                  </p>
                </>
              )}
            </div>
          </div>
        </Card>
      </section>
      {exportPrompt && (
        <ExportConfirm
          title="Xuất biến mẫu hợp đồng"
          filename="bien-mau-hop-dong.csv"
          description="Xuất danh sách biến nhận diện được để đối chiếu trước khi tải file về máy."
          onClose={() => setExportPrompt(false)}
          onConfirm={() => {
            exportVariables();
            setExportPrompt(false);
          }}
        />
      )}
    </>
  );
}
