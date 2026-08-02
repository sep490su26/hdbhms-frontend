"use client";

import {useEffect, useMemo, useState} from "react";
import {ImagePlus, Loader2, ShieldAlert, X} from "lucide-react";
import {
    createMaintenanceViolation,
    uploadMaintenanceImage,
} from "@/services/maintenanceService";
import {fetchViewingRooms} from "@/services/viewingCustomersService";
import DateInput from "../../../components/DateInput";
import {VietnameseMoneyInput} from "@/components/ui/vietnamese-money-input";

function nextBillingPeriod() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1, 1);
    return date.toISOString().slice(0, 7);
}

function billingPeriodLabel(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})$/);
    if (!match) return value || "";
    return `Tháng ${Number(match[2])}/${match[1]}`;
}

function ruleFineAmount(rule) {
    return Number(rule?.defaultFineAmount || 0);
}

function defaultViolationDescription(rule) {
    return rule?.title ? `Khách vi phạm nội quy: ${rule.title}.` : "";
}

function buildDefaultForm(propertyId = "", rule = null) {
    return {
        propertyId: propertyId ? String(propertyId) : "",
        roomId: "",
        occupantId: "",
        violationType: rule?.ruleCode || "",
        amount: ruleFineAmount(rule) > 0 ? String(ruleFineAmount(rule)) : "",
        description: defaultViolationDescription(rule),
        collectionMethod: "MONTHLY_SCHEDULED",
        billingPeriod: nextBillingPeriod(),
        occurredAt: new Date().toISOString().slice(0, 10),
        images: [],
    };
}

function inputClassName() {
    return "h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10 disabled:bg-[#f8fafc] disabled:text-slate-500 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:disabled:bg-white/5 dark:disabled:text-slate-400";
}

function textareaClassName() {
    return "min-h-28 w-full resize-y rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/10 dark:border-white/10 dark:bg-[#0f172a] dark:text-white";
}

function Field({label, children, className = ""}) {
    return (
        <label className={`grid gap-1.5 text-sm font-bold text-slate-900 dark:text-white ${className}`}>
            <span>{label}</span>
            {children}
        </label>
    );
}

function InlineNotice({type = "info", children}) {
    const tone =
        type === "error"
            ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
            : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";

    return (
        <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${tone}`}>
            {children}
        </div>
    );
}

export function RuleViolationRecorder({
    propertyId,
    propertyName = "",
    rules = [],
    onCreated,
    embedded = false,
    showHeader = true,
}) {
    const initialRule = rules.find((rule) => rule?.ruleCode && ruleFineAmount(rule) > 0) || null;
    const [rooms, setRooms] = useState([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);
    const [form, setForm] = useState(() => buildDefaultForm(propertyId, initialRule));
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const ruleOptions = useMemo(
        () =>
            rules
                .filter((rule) => rule?.ruleCode && ruleFineAmount(rule) > 0)
                .map((rule) => ({
                    ...rule,
                    id: String(rule.id || rule.ruleCode),
                    ruleCode: String(rule.ruleCode),
                })),
        [rules],
    );
    const selectedRule = useMemo(
        () => ruleOptions.find((rule) => rule.ruleCode === form.violationType) || null,
        [form.violationType, ruleOptions],
    );
    const roomOptions = useMemo(
        () =>
            rooms
                .filter((room) => room?.id)
                .map((room) => ({
                    id: String(room.id),
                    label: room.roomCode || room.name || `Phòng ${room.id}`,
                })),
        [rooms],
    );

    useEffect(() => {
        let ignore = false;
        const timer = window.setTimeout(async () => {
            if (!propertyId) {
                setRooms([]);
                return;
            }

            setIsLoadingRooms(true);
            try {
                const data = await fetchViewingRooms(propertyId);
                if (!ignore) setRooms(data);
            } catch {
                if (!ignore) setRooms([]);
            } finally {
                if (!ignore) setIsLoadingRooms(false);
            }
        }, 0);

        return () => {
            ignore = true;
            window.clearTimeout(timer);
        };
    }, [propertyId]);

    function updateForm(name, value) {
        setForm((current) => ({
            ...current,
            [name]: value,
            ...(name === "violationType"
                ? (() => {
                    const rule = ruleOptions.find((item) => item.ruleCode === value);
                    return {
                        amount: ruleFineAmount(rule) > 0 ? String(ruleFineAmount(rule)) : "",
                        description: defaultViolationDescription(rule),
                    };
                })()
                : {}),
            ...(name === "collectionMethod" && value === "MONTHLY_SCHEDULED"
                ? {billingPeriod: nextBillingPeriod()}
                : {}),
        }));
    }

    function handleImageChange(event) {
        const files = Array.from(event.target.files || []);
        const imageFiles = files.filter((file) => file.type.startsWith("image/"));
        setForm((current) => ({
            ...current,
            images: [...current.images, ...imageFiles].slice(0, 3),
        }));
        event.target.value = "";
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        const numericPropertyId = Number(propertyId || form.propertyId);
        const roomId = Number(form.roomId);
        const amount = Number(form.amount);

        if (!Number.isFinite(numericPropertyId) || numericPropertyId <= 0) {
            setError("Vui lòng chọn cơ sở trước khi ghi nhận vi phạm.");
            return;
        }
        if (!Number.isFinite(roomId) || roomId <= 0) {
            setError("Vui lòng chọn phòng.");
            return;
        }
        if (!form.violationType || !selectedRule) {
            setError("Vui lòng chọn nội quy bị vi phạm.");
            return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            setError("Số tiền phạt phải lớn hơn 0.");
            return;
        }
        if (form.description.trim().length < 10) {
            setError("Vui lòng nhập mô tả vi phạm tối thiểu 10 ký tự.");
            return;
        }

        setIsSubmitting(true);
        try {
            const uploaded = await Promise.all(
                form.images.map((file) => uploadMaintenanceImage(file)),
            );
            const result = await createMaintenanceViolation({
                propertyId: numericPropertyId,
                roomId,
                occupantId: form.occupantId ? Number(form.occupantId) : null,
                violationType: form.violationType,
                amount,
                description: form.description.trim(),
                collectionMethod: form.collectionMethod,
                billingPeriod:
                    form.collectionMethod === "MONTHLY_SCHEDULED"
                        ? form.billingPeriod
                        : null,
                includeInMonthlyInvoice: form.collectionMethod === "MONTHLY_SCHEDULED",
                occurredAt: form.occurredAt || new Date().toISOString().slice(0, 10),
                attachmentIds: uploaded.map((file) => file.fileId).filter(Boolean),
            });

            setSuccess(
                form.collectionMethod === "MONTHLY_SCHEDULED"
                    ? `Đã ghi nhận "${selectedRule.title}" và lên lịch gộp vào hóa đơn đầu tháng kỳ ${billingPeriodLabel(form.billingPeriod)}.`
                    : result?.message ||
                    "Đã tạo hóa đơn nháp. Khách thuê chỉ thấy sau khi phát hành.",
            );
            setForm(buildDefaultForm(String(numericPropertyId), ruleOptions[0] || null));
            onCreated?.(result);
        } catch (submitError) {
            setError(submitError?.message || "Không ghi nhận được vi phạm nội quy.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={
                embedded
                    ? "grid gap-5 p-5"
                    : "grid gap-5 rounded-lg border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)] dark:border-white/10 dark:bg-[#0f172a]"
            }
        >
            {showHeader ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="text-sm font-black text-slate-900 dark:text-white">
                            Ghi nhận vi phạm nội quy
                        </h2>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Ghi nhận khoản phạt theo cơ sở/phòng và chọn cách thu tiền cho khách thuê.
                        </p>
                    </div>
                    <span
                        className="w-fit rounded-full bg-rose-50 px-3 py-1 text-xs font-black uppercase text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
              Phạt vi phạm nội quy
            </span>
                </div>
            ) : null}

            {success ? <InlineNotice>{success}</InlineNotice> : null}
            {error ? <InlineNotice type="error">{error}</InlineNotice> : null}

            <div className="grid gap-4 lg:grid-cols-4">
                <Field label="Cơ sở">
                    <input
                        value={propertyName || (propertyId ? `Cơ sở #${propertyId}` : "Chưa chọn cơ sở")}
                        disabled
                        className={inputClassName()}
                    />
                </Field>
                <Field label="Phòng *">
                    <select
                        value={form.roomId}
                        onChange={(event) => updateForm("roomId", event.target.value)}
                        disabled={!propertyId || isLoadingRooms}
                        className={inputClassName()}
                    >
                        <option value="">
                            {isLoadingRooms
                                ? "Đang tải phòng..."
                                : roomOptions.length > 0
                                    ? "Chọn phòng"
                                    : "Chưa có phòng"}
                        </option>
                        {roomOptions.map((room) => (
                            <option key={room.id} value={room.id}>
                                {room.label}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Người vi phạm">
                    <input value="Ghi nhận ở cấp phòng" disabled className={inputClassName()}/>
                </Field>
                <Field label="Ngày ghi nhận *">
                    <DateInput
                        name="occurredAt"
                        value={form.occurredAt}
                        onChange={(event) => updateForm("occurredAt", event.target.value)}
                        className={inputClassName()}
                    />
                </Field>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_240px]">
                <Field label="Nội quy vi phạm *">
                    <select
                        value={form.violationType}
                        onChange={(event) => updateForm("violationType", event.target.value)}
                        className={inputClassName()}
                    >
                        {ruleOptions.length === 0 ? (
                            <option value="">Chưa có nội quy phạt</option>
                        ) : null}
                        {ruleOptions.map((rule) => (
                            <option key={rule.id} value={rule.ruleCode}>
                                {rule.title}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Số tiền phạt *">
                    <VietnameseMoneyInput
                        value={form.amount}
                        onValueChange={(value) => updateForm("amount", value)}
                        suffix="VNĐ"
                        className={inputClassName()}
                    />
                </Field>
                <Field label="Cách thu tiền *">
                    <select
                        value={form.collectionMethod}
                        onChange={(event) => updateForm("collectionMethod", event.target.value)}
                        className={inputClassName()}
                    >
                        <option value="BILL_NOW">Tạo hóa đơn ngay</option>
                        <option value="MONTHLY_SCHEDULED">Gộp hóa đơn đầu tháng</option>
                    </select>
                </Field>
            </div>

            <InlineNotice>
                {form.collectionMethod === "MONTHLY_SCHEDULED"
                    ? `Khoản phạt sẽ tự gộp vào hóa đơn kỳ sau (${billingPeriodLabel(form.billingPeriod)}). Khách thuê chưa thấy khoản này cho đến khi hóa đơn được phát hành.`
                    : "Hóa đơn nháp sẽ được tạo ngay. Khách thuê chỉ thấy hóa đơn và QR sau khi bạn phát hành."}
            </InlineNotice>

            <Field label="Mô tả/ghi chú *">
        <textarea
            value={form.description}
            onChange={(event) => updateForm("description", event.target.value)}
            className={textareaClassName()}
            placeholder="Ví dụ: Khách tự ý reset modem wifi trong phòng, làm thay đổi mật khẩu hệ thống."
        />
            </Field>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-3">
                    {form.images.map((file, index) => (
                        <div
                            key={`${file.name}-${index}`}
                            className="relative flex h-20 w-32 items-center justify-center rounded-lg border border-[#d8dee8] bg-[#f8fafc] px-2 text-center text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                        >
                            <span className="line-clamp-2">{file.name}</span>
                            <button
                                type="button"
                                onClick={() =>
                                    setForm((current) => ({
                                        ...current,
                                        images: current.images.filter((_, fileIndex) => fileIndex !== index),
                                    }))
                                }
                                className="absolute right-1 top-1 rounded-full bg-[#091426]/80 p-1 text-white"
                                aria-label="Xóa ảnh"
                            >
                                <X className="h-3 w-3"/>
                            </button>
                        </div>
                    ))}
                    {form.images.length < 3 ? (
                        <label
                            className="flex h-20 w-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#94a3b8] bg-[#f8fafc] text-xs font-bold text-slate-600 hover:border-[#1e40af] dark:bg-white/5 dark:text-slate-300">
                            <ImagePlus className="h-5 w-5"/>
                            Thêm bằng chứng
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                onChange={handleImageChange}
                                className="sr-only"
                            />
                        </label>
                    ) : null}
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting || !propertyId || !selectedRule}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#b42318] px-5 text-sm font-bold text-white transition hover:bg-[#971b12] disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin"/>
                    ) : (
                        <ShieldAlert className="h-4 w-4"/>
                    )}
                    Ghi nhận vi phạm
                </button>
            </div>
        </form>
    );
}
