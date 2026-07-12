"use client";

import {useState, useEffect} from "react";
import {CalendarDays, Download, FileText, Gauge, Home, Printer, Users, X, Loader2} from "lucide-react";
import {createHandoverReadings} from "@/services/contractHandoverService";
import {buildLeaseContractDocumentFilename} from "@/services/leaseContractsService";
import {fetchRoomAssets, createRoomAsset, updateRoomAsset} from "@/services/roomAssetsService";
import DateInput from "@/components/DateInput";
import {formatDate as formatDisplayDate} from "@/lib/dateFormat";

const OWNER_INFO = {
    fullName: "ĐẶNG VĂN NHUẬN",
    birthDate: "06/08/1978",
    identityNumber: "036078008683",
    identityIssuedDate: "01/04/2020",
    identityIssuedPlace: "Cục cảnh sát QLHCVT",
    phone: "0914.339.682; 0846.557.999",
    bankAccount: "3213888869999 - Ngân hàng Agribank Chủ tài khoản: ĐẶNG VĂN NHUẬN",
    address: "Số 70A1, Thôn 4, xã Thạch Hoà, Thạch Thất, Hà Nội",
};

const HANDOVER_ASSET_TEMPLATE = [
    ["Điều hòa + Remote", "Bộ", "Hoạt động bình thường", ""],
    ["Thiết bị vệ sinh + phòng tắm", "Bộ", "Hoạt động bình thường", "Xí, vòi xịt, vòi sen, lavabo, gương"],
    ["Bình nóng lạnh", "Bộ", "Hoạt động bình thường", ""],
    ["Tủ quần áo 3 buồng", "Bộ", "Còn nguyên vẹn", ""],
    ["Bàn học", "Bộ", "Còn nguyên vẹn", ""],
    ["Giường đôi/tầng + Dát giường", "Bộ", "Còn nguyên vẹn", ""],
    ["Cửa đi + cửa sổ", "Bộ", "Hoạt động bình thường", ""],
    ["Modem Internet", "Bộ", "Hoạt động bình thường", ""],
    ["Hệ thống điện: công tắc, ổ cắm, bóng điện", "Bộ", "Hoạt động bình thường", ""],
].map(([name, unit, condition, note]) => ({
    name,
    unit,
    quantity: 1,
    condition,
    note,
}));

const STEP_ITEMS = [
    {id: 1, label: "Thông tin hợp đồng"},
    {id: 2, label: "Thiết bị bàn giao"},
    {id: 3, label: "Preview / Xuất PDF"},
];

function firstValue(...values) {
    return values.find((value) => value !== null && value !== undefined && String(value).trim() !== "") ?? "";
}

function toDateInput(value) {
    if (!value) return "";
    const viDate = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (viDate) return `${viDate[3]}-${viDate[2]}-${viDate[1]}`;
    return String(value).slice(0, 10);
}

function formatDate(value) {
    return formatDisplayDate(value, value ? String(value) : "..........");
}

function formatMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "..........";
    return new Intl.NumberFormat("vi-VN", {maximumFractionDigits: 0}).format(number);
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getPrimaryTenant(contract, details, occupants) {
    const primaryOccupant =
        occupants.find((item) => item.occupantRole === "PRIMARY") ||
        occupants[0] ||
        {};
    const primaryTenant = details?.primaryTenant || details?.primary_tenant || {};
    return {
        fullName: firstValue(
            primaryTenant.fullName,
            primaryTenant.full_name,
            primaryOccupant.fullName,
            primaryOccupant.full_name,
            contract?.primaryTenantName,
            contract?.customerName,
        ),
        birthDate: firstValue(
            primaryTenant.birthDate,
            primaryTenant.birth_date,
            primaryTenant.dateOfBirth,
            primaryTenant.date_of_birth,
            primaryOccupant.birthDate,
            primaryOccupant.dateOfBirth,
        ),
        phone: firstValue(primaryTenant.phone, primaryOccupant.phone, contract?.phone),
        identityNumber: firstValue(
            primaryTenant.citizenId,
            primaryTenant.citizen_id,
            primaryTenant.idNumber,
            primaryTenant.id_number,
            primaryTenant.docNumber,
            primaryTenant.doc_number,
            primaryTenant.identityNumber,
            primaryTenant.identity_number,
            primaryOccupant.citizenId,
            primaryOccupant.idNumber,
            primaryOccupant.docNumber,
            primaryOccupant.identityNumber,
        ),
        identityIssuedDate: firstValue(
            primaryTenant.identityIssuedDate,
            primaryTenant.identity_issued_date,
            primaryTenant.issuedDate,
            primaryTenant.issued_date,
            primaryTenant.issueDate,
            primaryTenant.issue_date,
            primaryOccupant.identityIssuedDate,
            primaryOccupant.issuedDate,
            primaryOccupant.issueDate,
        ),
        identityIssuedPlace: firstValue(
            primaryTenant.identityIssuedPlace,
            primaryTenant.identity_issued_place,
            primaryTenant.issuedPlace,
            primaryTenant.issued_place,
            primaryTenant.issuePlace,
            primaryTenant.issue_place,
            primaryOccupant.identityIssuedPlace,
            primaryOccupant.issuedPlace,
            primaryOccupant.issuePlace,
        ),
        address: firstValue(
            primaryTenant.permanentAddress,
            primaryTenant.permanent_address,
            primaryTenant.address,
            primaryOccupant.permanentAddress,
            primaryOccupant.permanent_address,
            primaryOccupant.address,
        ),
        emergencyName: firstValue(primaryTenant.emergencyContactName, primaryTenant.emergency_contact_name),
        emergencyPhone: firstValue(primaryTenant.emergencyContactPhone, primaryTenant.emergency_contact_phone),
    };
}

function buildInitialForm(contract, details, occupants) {
    const primary = getPrimaryTenant(contract, details, occupants);
    return {
        propertyName: firstValue(contract?.propertyName, details?.property?.name),
        propertyAddress: firstValue(contract?.propertyAddress, details?.property?.address, OWNER_INFO.address),
        roomCode: firstValue(contract?.roomCode, details?.room?.roomCode),
        contractCode: firstValue(contract?.contractCode, contract?.displayCode, details?.contractCode),
        startDate: toDateInput(firstValue(contract?.startDate, details?.startDate)),
        endDate: toDateInput(firstValue(contract?.endDate, details?.endDate)),
        rentStartDate: toDateInput(firstValue(contract?.rentStartDate, details?.rentStartDate)),
        monthlyRent: firstValue(contract?.monthlyRent, details?.monthlyRent),
        paymentCycleMonths: firstValue(contract?.paymentCycleMonths, details?.paymentCycleMonths, 1),
        depositAmount: firstValue(contract?.depositAmount, details?.depositAmount),
        occupantsCount: firstValue(
            contract?.occupantsCount,
            details?.occupantsCount,
            occupants.length || "",
        ),
        tenantName: primary.fullName,
        tenantBirthDate: toDateInput(primary.birthDate),
        tenantPhone: primary.phone,
        tenantIdentityNumber: primary.identityNumber,
        tenantIdentityIssuedDate: toDateInput(primary.identityIssuedDate),
        tenantIdentityIssuedPlace: primary.identityIssuedPlace,
        tenantAddress: primary.address,
        emergencyName: primary.emergencyName,
        emergencyPhone: primary.emergencyPhone,
    };
}

function Field({label, value, onChange, type = "text", placeholder = ""}) {
    const InputComponent = type === "date" ? DateInput : "input";

    return (
        <label className="grid min-w-0 gap-1.5">
            <span className="text-xs font-bold text-[#58667c]">{label}</span>
            <InputComponent
                type={type === "date" ? undefined : type}
                value={value ?? ""}
                placeholder={type === "date" ? placeholder || "dd/mm/yyyy" : placeholder}
                onChange={(event) => onChange(event.target.value)}
                className="h-10 min-w-0 rounded-lg border border-[#cbd5e1] dark:border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#1e40af]"
            />
        </label>
    );
}

function PrintLine({label, value}) {
    return (
        <p>
            {label}: <span
            className="border-b border-dotted border-slate-500 px-2 font-semibold">{value || ".........."}</span>
        </p>
    );
}

function buildPrintableHtml({form, handover, assets}) {
    const e = escapeHtml;
    const documentTitle = buildLeaseContractDocumentFilename({
        roomCode: form.roomCode,
        startDate: form.startDate,
    });
    const assetRows = assets
        .map(
            (asset, index) => `
        <tr>
          <td class="center">${index + 1}</td>
          <td>${e(asset.name)}</td>
          <td class="center">${e(asset.unit)}</td>
          <td class="center">${e(asset.quantity)}</td>
          <td>${e(asset.condition)}</td>
          <td>${e(asset.note)}</td>
        </tr>`,
        )
        .join("");
    const meterRows = [
        ["ĐỒNG HỒ ĐO ĐIỆN", "CÁI", "01", `Chỉ số: ${(handover.electricReading !== "" && handover.electricReading != null) ? handover.electricReading : "............"}, ngày ${formatDate(handover.handoverDate)}`],
        ["ĐỒNG HỒ ĐO NƯỚC", "CÁI", "01", `Chỉ số: ${(handover.waterReading !== "" && handover.waterReading != null) ? handover.waterReading : "............"}, ngày ${formatDate(handover.handoverDate)}`],
        ["CHÌA KHÓA CỬA CHÍNH", "BỘ", "01", ""],
    ]
        .map(
            ([name, unit, quantity, condition], index) => `
        <tr>
          <td class="center">${index + 1}</td>
          <td>${e(name)}</td>
          <td class="center">${e(unit)}</td>
          <td class="center">${e(quantity)}</td>
          <td>${e(condition)}</td>
        </tr>`,
        )
        .join("");

    const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${e(documentTitle)}</title>
  <style>
    body { margin: 0; background: #eef0f4; color: #111; font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.24; }
    .toolbar { position: sticky; top: 0; z-index: 5; padding: 12px 18px; background: #111827; color: #fff; font-family: Arial, sans-serif; }
    .page { width: 210mm; min-height: 297mm; margin: 20px auto; padding: 14mm 18mm; background: #fff; box-shadow: 0 4px 18px rgba(15,23,42,.18); }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 700; }
    .title { margin: 18px 0 14px; font-size: 17pt; font-weight: 700; text-align: center; text-transform: uppercase; }
    .section-title { margin-top: 9px; font-weight: 700; text-transform: uppercase; }
    .indent { padding-left: 20px; }
    .line { display: inline-block; min-width: 140px; border-bottom: 1px dotted #333; padding: 0 5px 1px; text-align: center; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; font-size: 11.5pt; }
    th, td { border: 1px solid #222; padding: 5px 6px; vertical-align: top; }
    th { text-align: center; font-weight: 700; }
    .signature td { height: 120px; border: none; text-align: center; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none; }
      .page { box-shadow: none; margin: 0; page-break-after: always; }
      @page { size: A4; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">Bấm Ctrl+P hoặc nút In của trình duyệt để xuất PDF.</div>
  <section class="page">
    <header class="center">
      <p class="bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
      <p class="bold">Độc Lập - Tự Do - Hạnh Phúc</p>
      <p>--------o0o--------</p>
    </header>
    <h1 class="title">Hợp đồng thuê phòng trọ</h1>
    <p>Hôm nay, ngày <span class="line">${e(formatDate(new Date()))}</span>; tại địa chỉ: <span class="line">${e(OWNER_INFO.address)}</span> chúng tôi gồm:</p>
    <p class="section-title">1. Đại diện bên cho thuê phòng trọ (Bên A):</p>
    <p>Ông: <b>${e(OWNER_INFO.fullName)}</b></p>
    <p>Ngày sinh: ${e(OWNER_INFO.birthDate)}</p>
    <p>CMTND/CCCD số: ${e(OWNER_INFO.identityNumber)}</p>
    <p>Cấp ngày: ${e(OWNER_INFO.identityIssuedDate)} - Nơi cấp: ${e(OWNER_INFO.identityIssuedPlace)}</p>
    <p>Điện thoại: ${e(OWNER_INFO.phone)}</p>
    <p>Số tài khoản: ${e(OWNER_INFO.bankAccount)}</p>

    <p class="section-title">2. Bên thuê phòng trọ (Bên B):</p>
    <p class="indent">Ông/bà: <span class="line">${e(form.tenantName || "..........")}</span> Sinh ngày: <span class="line">${e(formatDate(form.tenantBirthDate))}</span></p>
    <p class="indent">Nơi đăng ký HK thường trú: <span class="line">${e(form.tenantAddress || "..........")}</span></p>
    <p class="indent">Số CMND/CCCD: <span class="line">${e(form.tenantIdentityNumber || "..........")}</span> cấp ngày <span class="line">${e(formatDate(form.tenantIdentityIssuedDate))}</span> tại: <span class="line">${e(form.tenantIdentityIssuedPlace || "..........")}</span></p>
    <p class="indent">Số điện thoại: <span class="line">${e(form.tenantPhone || "..........")}</span></p>
    <p class="indent">Họ tên người thân khẩn cấp: <span class="line">${e(form.emergencyName || "..........")}</span></p>
    <p class="indent">Số điện thoại người thân: <span class="line">${e(form.emergencyPhone || "..........")}</span></p>
    <p class="indent">Số lượng người ở: <span class="line">${e(form.occupantsCount || "..........")}</span></p>

    <p class="section-title">3. Thông tin thuê phòng</p>
    <p class="indent">Bên A đồng ý cho bên B thuê phòng <b>${e(form.roomCode || "..........")}</b> tại <b>${e(form.propertyAddress || form.propertyName || "..........")}</b>.</p>
    <p class="indent">Giá thuê: <span class="line">${e(formatMoney(form.monthlyRent))}</span> VNĐ/tháng.</p>
    <p class="indent">Tiền cọc: <span class="line">${e(formatMoney(form.depositAmount))}</span> VNĐ.</p>
    <p class="indent">Hợp đồng có giá trị từ ngày <span class="line">${e(formatDate(form.startDate))}</span> đến ngày <span class="line">${e(formatDate(form.endDate))}</span>.</p>
    <p class="indent">Bên B thanh toán cho bên A ${e(form.paymentCycleMonths || "..........")} tháng/lần, tương đương <span class="line">${e(formatMoney(Number(form.monthlyRent || 0) * Number(form.paymentCycleMonths || 0)))}</span> VNĐ.</p>

    <p class="section-title">4. Bàn giao phòng</p>
    <p class="indent">Ngày bàn giao: <span class="line">${e(formatDate(handover.handoverDate))}</span></p>
    <p class="indent">Chỉ số điện ban đầu: <span class="line">${e((handover.electricReading !== "" && handover.electricReading != null) ? handover.electricReading : "..........")}</span></p>
    <p class="indent">Chỉ số nước ban đầu: <span class="line">${e((handover.waterReading !== "" && handover.waterReading != null) ? handover.waterReading : "..........")}</span></p>
    <table>
      <thead>
        <tr><th>STT</th><th>Tên thiết bị</th><th>Đơn vị</th><th>SL</th><th>Hiện trạng</th><th>Ghi chú</th></tr>
      </thead>
      <tbody>${assetRows}</tbody>
    </table>
    <p class="section-title center">BÀN GIAO CÁC CHỈ SỐ ĐỒNG HỒ/ CÔNG TƠ</p>
    <table>
      <thead>
        <tr><th>STT</th><th>TÊN THIẾT BỊ</th><th>ĐƠN VỊ</th><th>SỐ LƯỢNG</th><th>SỐ HIỆN TRẠNG</th></tr>
      </thead>
      <tbody>${meterRows}</tbody>
    </table>
    <p class="right"><i>Hà Nội, Ngày ............, tháng ............ Năm 20............</i></p>
    <table class="signature">
      <tr>
        <td><p class="bold">BÊN A</p><p>(Ký, ghi rõ họ tên)</p></td>
        <td><p class="bold">BÊN B</p><p>(Ký, ghi rõ họ tên)</p></td>
      </tr>
    </table>
  </section>
</body>
</html>`;
    return html
        .replace(/(<p class="section-title">4\.[\s\S]*?<\/p>)\s*<p class="indent">[\s\S]*?<\/p>\s*<p class="indent">[\s\S]*?<\/p>\s*<p class="indent">[\s\S]*?<\/p>/, "$1")
        .replace(
            /<table class="signature">[\s\S]*?<\/table>/,
            `<table class="signature">
        <tr>
          <td><p class="bold">NGƯỜI GIAO</p><p>(Ký, ghi rõ họ tên)</p></td>
          <td><p class="bold">NGƯỜI NHẬN</p><p>(Ký, ghi rõ họ tên)</p></td>
        </tr>
      </table>`,
        );
}

export default function ContractPrintWizard({contract, details, occupants = [], onClose}) {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState(() => buildInitialForm(contract, details, occupants));
    const [handover, setHandover] = useState({
        handoverDate: new Date().toISOString().split("T")[0],
        electricReading: "",
        waterReading: "",
        note: "",
    });
    const [assets, setAssets] = useState(HANDOVER_ASSET_TEMPLATE);
    const [saving, setSaving] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    useEffect(() => {
        async function loadData() {
            const contractId = contract?.leaseContractId || contract?.id;
            const roomId = contract?.roomId || details?.room?.id;
            if (!contractId || !roomId) return;

            try {
                let hData = null;
                try {
                    const res = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}/lease-contracts/${contractId}/handover?type=MOVE_IN`,
                        {headers: {Authorization: `Bearer ${window.localStorage.getItem("token") || ""}`}}
                    );
                    if (res.ok) {
                        const body = await res.json();
                        hData = body.data;
                    }
                } catch (e) {
                    console.warn("Could not fetch handover record", e);
                }

                if (hData) {
                    setHandover(prev => ({
                        ...prev,
                        handoverDate: (hData.handover_date || hData.handoverDate) ? (hData.handover_date || hData.handoverDate).split("T")[0] : prev.handoverDate,
                        electricReading: hData.electricity?.current_value ?? hData.electricity?.currentValue ?? "",
                        waterReading: hData.water?.current_value ?? hData.water?.currentValue ?? "",
                        note: hData.note || "",
                    }));
                } else {
                    try {
                        const latestRes = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}/rooms/${roomId}/meter-readings/latest`,
                            {headers: {Authorization: `Bearer ${window.localStorage.getItem("token") || ""}`}}
                        );
                        if (latestRes.ok) {
                            const body = await latestRes.json();
                            const elec = body.data?.electricity?.suggested_value ?? body.data?.electricity?.suggestedValue ?? "";
                            const water = body.data?.water?.suggested_value ?? body.data?.water?.suggestedValue ?? "";
                            setHandover(prev => ({
                                ...prev,
                                electricReading: elec,
                                waterReading: water,
                            }));
                        }
                    } catch (e) {
                        console.warn("Could not fetch latest readings", e);
                    }
                }

                try {
                    const assetsRes = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}/rooms/${roomId}/assets`,
                        {headers: {Authorization: `Bearer ${window.localStorage.getItem("token") || ""}`}}
                    );
                    if (assetsRes.ok) {
                        const body = await assetsRes.json();
                        if (body.data && body.data.length > 0) {
                            setAssets(body.data.map(a => {
                                const condition = a.current_condition || a.currentCondition;
                                return {
                                    name: a.asset_name || a.assetName || "",
                                    unit: "Cái",
                                    quantity: a.quantity || 1,
                                    condition: condition === "GOOD" ? "Hoạt động bình thường" :
                                        condition === "ATTENTION" ? "Có trầy xước nhẹ" :
                                            condition === "BROKEN" ? "Hỏng cần sửa" : "Thiếu thiết bị",
                                    note: a.description || "",
                                };
                            }));
                        }
                    }
                } catch (e) {
                    console.warn("Could not fetch room assets", e);
                }

            } finally {
                setDataLoaded(true);
            }
        }

        if (!dataLoaded) {
            loadData();
        }
    }, [contract, details, dataLoaded]);

    const CONDITION_MAPPING = {
        "Hoạt động bình thường": "GOOD",
        "Có trầy xước nhẹ": "ATTENTION",
        "Hỏng cần sửa": "BROKEN",
        "Thiếu thiết bị": "MISSING",
        "Còn nguyên vẹn": "GOOD",
    };

    async function handleSaveStep2() {
        // Theo yêu cầu của người dùng, bỏ tính năng lưu (create) qua API ở bước này.
        // Dữ liệu nhập vào ở UI vẫn được giữ trong state (handover, assets) để in PDF ở bước 3.
        return true;
    }

    const previewHtml = buildPrintableHtml({form, handover, assets}).replace(
        /<div class="toolbar">[\s\S]*?<\/div>/,
        "",
    );

    function updateForm(field, value) {
        setForm((current) => ({...current, [field]: value}));
    }

    function updateHandover(field, value) {
        setHandover((current) => ({...current, [field]: value}));
    }

    function updateAsset(index, field, value) {
        setAssets((current) =>
            current.map((asset, assetIndex) =>
                assetIndex === index ? {...asset, [field]: value} : asset,
            ),
        );
    }

    function handlePrint() {
        const popup = window.open("", "_blank");
        if (!popup) {
            window.alert("Trình duyệt đang chặn popup. Vui lòng cho phép popup để in hợp đồng.");
            return;
        }
        popup.document.write(buildPrintableHtml({form, handover, assets}));
        popup.document.close();
        popup.focus();
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#091426]/70 p-3 backdrop-blur-sm"
             onClick={onClose}>
            <section className="max-h-[94vh] w-full max-w-[1160px] overflow-hidden rounded-2xl bg-white dark:bg-[#0f172a] shadow-2xl"
                     onClick={(event) => event.stopPropagation()}>
                <header className="relative bg-[#05091d] px-5 py-5 text-white">
                    <button type="button" onClick={onClose}
                            className="absolute right-4 top-4 rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                            aria-label="Đóng in hợp đồng">
                        <X className="h-5 w-5"/>
                    </button>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-300">Preview luồng hợp
                        đồng thuê</p>
                    <h2 className="mt-3 text-2xl font-extrabold">{form.contractCode || "Chưa có mã hợp đồng"}</h2>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                        <span
                            className="rounded-full bg-white/10 px-3 py-1">Hợp đồng {contract?.status || "DRAFT"}</span>
                        <span
                            className="rounded-full bg-white/10 px-3 py-1">Phòng {form.roomCode || "chưa cập nhật"}</span>
                        <span
                            className="rounded-full bg-white/10 px-3 py-1">{contract?.contractFileId ? "Đã có bản ký" : "Chưa có bản ký"}</span>
                    </div>
                </header>

                <div
                    className="grid max-h-[calc(94vh-132px)] overflow-y-auto bg-[#f3f6fb] dark:bg-white/5 p-4 lg:grid-cols-[230px_minmax(0,1fr)]">
                    <aside className="grid content-start gap-3">
                        <div className="rounded-xl border border-[#dfe5ef] dark:border-white/10 bg-white dark:bg-[#0f172a] p-3">
                            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Các
                                bước xử lý</p>
                            {STEP_ITEMS.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setStep(item.id)}
                                    className={`mb-2 flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-extrabold ${
                                        step === item.id ? "bg-[#1e40af] dark:bg-[#2563eb] text-white" : "bg-[#f6f8fb] dark:bg-white/5 text-slate-900 dark:text-white hover:bg-[#e9eef6]"
                                    }`}
                                >
                                    <span
                                        className={`grid h-6 w-6 place-items-center rounded-full ${step === item.id ? "bg-white/15" : "bg-white dark:bg-[#0f172a]"}`}>{item.id}</span>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <div
                            className="rounded-xl border border-[#dfe5ef] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            <p className="font-extrabold text-slate-900 dark:text-white">Rule đúng</p>
                            <p className="mt-2">1. Điền thông tin trước.</p>
                            <p>2. Nhập bàn giao trước.</p>
                            <p>3. Xuất PDF rồi in cho khách ký.</p>
                            <p>4. Upload bản đã ký sau.</p>
                        </div>
                    </aside>

                    <main className="mt-4 rounded-xl border border-[#dfe5ef] dark:border-white/10 bg-white dark:bg-[#0f172a] p-4 lg:ml-4 lg:mt-0 xl:p-5">
                        {step === 1 && (
                            <div>
                                <h3 className="inline-flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-white">
                                    <FileText className="h-5 w-5 text-indigo-500 dark:text-blue-300"/>
                                    Bước 1: Thông tin hợp đồng
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Dữ liệu lấy từ hợp đồng/API; trường thiếu để
                                    trống, không dùng mock bên B.</p>
                                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                    <section className="rounded-xl border border-[#dfe5ef] dark:border-white/10 p-4">
                                        <h4 className="mb-4 inline-flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
                                            <Home className="h-4 w-4"/>Thông tin phòng</h4>
                                        <div className="grid gap-3">
                                            <Field label="Cơ sở" value={form.propertyName}
                                                   onChange={(value) => updateForm("propertyName", value)}/>
                                            <Field label="Phòng" value={form.roomCode}
                                                   onChange={(value) => updateForm("roomCode", value)}/>
                                            <Field label="Giá thuê/tháng" type="number" value={form.monthlyRent}
                                                   onChange={(value) => updateForm("monthlyRent", value)}/>
                                            <Field label="Tiền cọc" type="number" value={form.depositAmount}
                                                   onChange={(value) => updateForm("depositAmount", value)}/>
                                            <Field label="Số người ở" type="number" value={form.occupantsCount}
                                                   onChange={(value) => updateForm("occupantsCount", value)}/>
                                        </div>
                                    </section>
                                    <section className="rounded-xl border border-[#dfe5ef] dark:border-white/10 p-4">
                                        <h4 className="mb-4 inline-flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
                                            <CalendarDays className="h-4 w-4"/>Thông tin hợp đồng</h4>
                                        <div className="grid gap-3">
                                            <Field label="Mã hợp đồng" value={form.contractCode}
                                                   onChange={(value) => updateForm("contractCode", value)}/>
                                            <Field label="Ngày bắt đầu" type="date" value={form.startDate}
                                                   onChange={(value) => updateForm("startDate", value)}/>
                                            <Field label="Ngày kết thúc" type="date" value={form.endDate}
                                                   onChange={(value) => updateForm("endDate", value)}/>
                                            <Field label="Ngày bắt đầu tính tiền" type="date" value={form.rentStartDate}
                                                   onChange={(value) => updateForm("rentStartDate", value)}/>
                                            <Field label="Chu kỳ thanh toán/tháng" type="number"
                                                   value={form.paymentCycleMonths}
                                                   onChange={(value) => updateForm("paymentCycleMonths", value)}/>
                                        </div>
                                    </section>
                                    <section className="rounded-xl border border-[#dfe5ef] dark:border-white/10 p-4 lg:col-span-2">
                                        <h4 className="mb-4 inline-flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
                                            <Users className="h-4 w-4"/>Thông tin bên thuê</h4>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <Field label="Họ tên" value={form.tenantName}
                                                   onChange={(value) => updateForm("tenantName", value)}/>
                                            <Field label="Ngày sinh" type="date" value={form.tenantBirthDate}
                                                   onChange={(value) => updateForm("tenantBirthDate", value)}/>
                                            <Field label="Số điện thoại" value={form.tenantPhone}
                                                   onChange={(value) => updateForm("tenantPhone", value)}/>
                                            <Field label="Số CCCD" value={form.tenantIdentityNumber}
                                                   onChange={(value) => updateForm("tenantIdentityNumber", value)}
                                                   placeholder="Để trống nếu chưa có"/>
                                            <Field label="Ngày cấp" type="date" value={form.tenantIdentityIssuedDate}
                                                   onChange={(value) => updateForm("tenantIdentityIssuedDate", value)}/>
                                            <Field label="Nơi cấp" value={form.tenantIdentityIssuedPlace}
                                                   onChange={(value) => updateForm("tenantIdentityIssuedPlace", value)}/>
                                            <Field label="Người thân khẩn cấp" value={form.emergencyName}
                                                   onChange={(value) => updateForm("emergencyName", value)}/>
                                            <Field label="SĐT người thân" value={form.emergencyPhone}
                                                   onChange={(value) => updateForm("emergencyPhone", value)}/>
                                            <div className="md:col-span-2">
                                                <Field label="Địa chỉ thường trú" value={form.tenantAddress}
                                                       onChange={(value) => updateForm("tenantAddress", value)}/>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div>
                                <h3 className="inline-flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-white">
                                    <Gauge className="h-5 w-5 text-indigo-500 dark:text-blue-300"/>
                                    Bước 2: Bàn giao phòng
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Thông tin này sẽ được fill vào hợp đồng trước
                                    khi in cho khách ký.</p>
                                <section className="mt-5 rounded-xl border border-[#dfe5ef] dark:border-white/10 p-4">
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <Field label="Ngày bàn giao" type="date" value={handover.handoverDate}
                                               onChange={(value) => updateHandover("handoverDate", value)}/>
                                        <Field label="Chỉ số điện ban đầu" type="number"
                                               value={handover.electricReading}
                                               onChange={(value) => updateHandover("electricReading", value)}/>
                                        <Field label="Chỉ số nước ban đầu" type="number" value={handover.waterReading}
                                               onChange={(value) => updateHandover("waterReading", value)}/>
                                    </div>
                                </section>
                                <div className="mt-4 overflow-x-auto rounded-xl border border-[#dfe5ef] dark:border-white/10">
                                    <table className="w-full min-w-[820px] text-left text-xs">
                                        <thead
                                            className="bg-[#f7f9fe] dark:bg-white/5 text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                                        <tr>
                                            <th className="px-3 py-3">STT</th>
                                            <th className="px-3 py-3">Tên thiết bị</th>
                                            <th className="px-3 py-3">Đơn vị</th>
                                            <th className="px-3 py-3">SL</th>
                                            <th className="px-3 py-3">Hiện trạng</th>
                                            <th className="px-3 py-3">Ghi chú</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#edf1f6]">
                                        {assets.map((asset, index) => (
                                            <tr key={`${asset.name}-${index}`}>
                                                <td className="px-3 py-2 font-bold">{index + 1}</td>
                                                {["name", "unit", "quantity", "condition", "note"].map((field) => (
                                                    <td key={field} className="px-3 py-2">
                                                        <input
                                                            type={field === "quantity" ? "number" : "text"}
                                                            value={asset[field] ?? ""}
                                                            onChange={(event) => updateAsset(index, field, event.target.value)}
                                                            className="h-9 w-full rounded-lg border border-[#dfe5ef] dark:border-white/10 bg-white dark:bg-[#0f172a] px-2 font-semibold outline-none focus:border-[#1e40af]"
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4 grid gap-1.5">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                        Ngày bàn giao
                                        <span className="ml-1 text-rose-600 dark:text-rose-300">*</span>
                                    </span>
                                    <DateInput
                                        value={handover.handoverDate}
                                        disabled={true}
                                        onChange={(event) => updateHandover("handoverDate", event.target.value)}
                                        className="h-10 w-full rounded-lg border border-[#cbd5e1] dark:border-white/10 bg-slate-100 px-3 text-sm font-semibold outline-none focus:border-[#1e40af] disabled:opacity-70"
                                    />
                                </div>
                                <label className="mt-4 grid gap-1.5">
                                    <span className="text-xs font-bold text-[#58667c]">Ghi chú bàn giao</span>
                                    <textarea value={handover.note} rows={3}
                                              onChange={(event) => updateHandover("note", event.target.value)}
                                              className="rounded-lg border border-[#cbd5e1] dark:border-white/10 p-3 outline-none focus:border-[#1e40af]"/>
                                </label>
                            </div>
                        )}

                        {step === 3 && (
                            <div>
                                <h3 className="inline-flex items-center gap-2 text-xl font-extrabold text-slate-900 dark:text-white">
                                    <Printer className="h-5 w-5 text-indigo-500 dark:text-blue-300"/>
                                    Bước 3: Preview / Xuất PDF hợp đồng
                                </h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">PDF sẽ mở ở tab mới, dùng lệnh in của trình
                                    duyệt để xuất PDF.</p>
                                <section
                                    className="mt-5 overflow-hidden rounded-xl border border-[#cbd5e1] dark:border-white/10 bg-[#eef0f4]">
                                    <iframe
                                        title="Preview hợp đồng thuê"
                                        srcDoc={previewHtml}
                                        className="h-[56vh] w-full bg-[#eef0f4]"
                                    />
                                    <div className="hidden">
                                        <h4 className="text-center text-lg font-bold uppercase">Hợp đồng thuê phòng
                                            trọ</h4>
                                        <PrintLine label="Bên A" value={OWNER_INFO.fullName}/>
                                        <PrintLine label="Bên B" value={form.tenantName}/>
                                        <PrintLine label="Phòng" value={form.roomCode}/>
                                        <PrintLine label="Giá thuê" value={`${formatMoney(form.monthlyRent)} VNĐ/tháng`}/>
                                        <PrintLine label="Từ ngày" value={formatDate(form.startDate)}/>
                                        <PrintLine label="Đến ngày" value={formatDate(form.endDate)}/>
                                        <PrintLine label="Ngày bàn giao" value={formatDate(handover.handoverDate)}/>
                                        <PrintLine label="Chỉ số điện ban đầu" value={handover.electricReading}/>
                                        <PrintLine label="Chỉ số nước ban đầu" value={handover.waterReading}/>
                                        <table className="mt-4 w-full border-collapse text-xs">
                                            <thead>
                                            <tr className="[&_th]:border [&_th]:p-2">
                                                <th>STT</th>
                                                <th>Tên thiết bị</th>
                                                <th>Đơn vị</th>
                                                <th>SL</th>
                                                <th>Hiện trạng</th>
                                                <th>Ghi chú</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {assets.map((asset, index) => (
                                                <tr key={`${asset.name}-${index}`} className="[&_td]:border [&_td]:p-2">
                                                    <td>{index + 1}</td>
                                                    <td>{asset.name}</td>
                                                    <td>{asset.unit}</td>
                                                    <td>{asset.quantity}</td>
                                                    <td>{asset.condition}</td>
                                                    <td>{asset.note}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                        <div className="mt-8 grid grid-cols-2 text-center font-bold">
                                            <span>BÊN A</span>
                                            <span>BÊN B</span>
                                        </div>
                                    </div>
                                </section>
                                <button type="button" onClick={handlePrint}
                                        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-4 text-sm font-extrabold text-white hover:bg-[#1d4ed8] dark:hover:bg-[#1d4ed8]">
                                    <Download className="h-4 w-4"/>
                                    Xuất PDF / In hợp đồng
                                </button>
                            </div>
                        )}

                        <div className="mt-6 flex justify-between border-t border-[#dfe5ef] dark:border-white/10 pt-4">
                            <button type="button" onClick={() => setStep((current) => Math.max(1, current - 1))}
                                    disabled={step === 1 || saving}
                                    className="h-10 rounded-lg border border-[#cbd5e1] dark:border-white/10 px-4 text-sm font-extrabold disabled:opacity-50">
                                Quay lại
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (step === 2) {
                                        const ok = await handleSaveStep2();
                                        if (!ok) return; // Wait if it failed? Or continue? Let's just let them fix it or skip.
                                    }
                                    setStep((current) => Math.min(3, current + 1));
                                }}
                                disabled={step === 3 || saving}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1e40af] dark:bg-[#2563eb] px-4 text-sm font-extrabold text-white disabled:opacity-50"
                            >
                                {saving && <Loader2 className="h-4 w-4 animate-spin"/>}
                                {saving ? "Đang lưu..." : "Tiếp tục"}
                            </button>
                        </div>
                    </main>
                </div>
            </section>
        </div>
    );
}
