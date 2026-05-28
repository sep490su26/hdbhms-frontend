"use client";

import {useState} from "react";
import {
    CalendarClock,
    Check,
    Edit3,
    FileText,
    Mail,
    Phone,
    Trash2,
    UserPlus,
    WalletCards,
    X,
} from "lucide-react";
import {tenants} from "@/services/dashboardService";

const money = new Intl.NumberFormat("vi-VN");

function formatMoney(value) {
    return `${money.format(value)} đ`;
}

function Modal({title, children, onClose, footer}) {
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
                        <X className="h-5 w-5"/>
                    </button>
                </div>
                <div className="max-h-[68vh] overflow-y-auto p-6 custom-scrollbar">{children}</div>
                {footer && <div className="border-t border-[#e2e8f0] px-6 py-4">{footer}</div>}
            </div>
        </div>
    );
}

function IconButton({label, icon: Icon, onClick, tone = "neutral"}) {
    const tones = {
        neutral: "text-[#505f76] hover:bg-[#f2f4f6] hover:text-[#091426]",
        good: "text-emerald-600 hover:bg-emerald-50",
        warn: "text-blue-600 hover:bg-blue-50",
        bad: "text-rose-600 hover:bg-rose-50",
    };

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className={`rounded-md p-2 transition ${tones[tone]}`}
        >
            <Icon className="h-4 w-4"/>
        </button>
    );
}

function PageHeader({title, description, actionLabel, actionIcon: ActionIcon = Check, onAction}) {
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
                    <ActionIcon className="h-4 w-4"/>
                    {actionLabel}
                </button>
            )}
        </section>
    );
}

function Card({children, className = ""}) {
    return (
        <section
            className={`rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] ${className}`}>
            {children}
        </section>
    );
}

function InfoMetric({icon: Icon, label, value}) {
    return (
        <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f2f4f6] text-[#505f76]">
        <Icon className="h-4 w-4"/>
      </span>
            <span>
        <span className="block text-xs font-bold uppercase tracking-[0.06em] text-[#6b7280]">{label}</span>
        <span className="block text-sm font-bold text-[#091426]">{value}</span>
      </span>
        </div>
    );
}

function InfoBlock({label, value}) {
    return (
        <div>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#6b7280]">{label}</p>
            <p className="mt-1 text-sm font-bold text-[#091426]">{value}</p>
        </div>
    );
}

function SectionTitle({children}) {
    return <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#45474c]">{children}</h3>;
}

function TenantProfile({profile}) {
    const [preview, setPreview] = useState(null);
    const contract = {
        code: `HD-${profile.roomId}-2025`,
        landlord: "Hải Đăng Boarding House",
        startDate: profile.moveInDate,
        endDate: "14/01/2026",
        paymentCycle: "Thanh toán hàng tháng, trước ngày 05",
    };

    return (
        <Card className="overflow-hidden">
            <div className="bg-[#091426] p-6 text-white">
                <div className="flex items-start justify-between">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-xl font-bold">
            {profile.initials}
          </span>
                    <div className="flex gap-2">
                        <IconButton label="Sửa khách thuê" icon={Edit3}/>
                        <IconButton label="Xóa khách thuê" icon={Trash2} tone="bad"/>
                    </div>
                </div>
                <h2 className="mt-5 text-2xl font-bold">{profile.name}</h2>
                <p className="mt-1 text-sm text-slate-300">ID: {profile.citizenId}</p>
            </div>
            <div className="grid gap-6 p-6">
                <SectionTitle>Thông tin cơ bản</SectionTitle>
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoBlock label="Ngày sinh" value={profile.birthDate}/>
                    <InfoBlock label="Ngày vào ở" value={profile.moveInDate}/>
                    <InfoBlock label="SĐT người thân" value={profile.relativePhone}/>
                    <InfoBlock label="Biển số xe" value={profile.vehiclePlate}/>
                </div>
                <SectionTitle>Liên hệ</SectionTitle>
                <div className="grid gap-3">
                    <InfoMetric icon={Phone} label="Số điện thoại" value={profile.phone}/>
                    <InfoMetric icon={Mail} label="Email" value={profile.email}/>
                </div>
                <SectionTitle>Hồ sơ đính kèm</SectionTitle>
                <div className="grid gap-3 sm:grid-cols-3">
                    {[
                        {id: "front", label: "CCCD mặt trước", meta: profile.citizenId},
                        {id: "back", label: "CCCD mặt sau", meta: `Ngày sinh ${profile.birthDate}`},
                        {id: "contract", label: "Hợp đồng thuê", meta: contract.code},
                    ].map((doc) => (
                        <button
                            key={doc.id}
                            type="button"
                            onClick={() => setPreview(doc.id)}
                            className="rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] p-4 text-left hover:border-[#091426]"
                        >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#505f76]">
                <FileText className="h-4 w-4"/>
              </span>
                            <span className="mt-3 block text-sm font-bold text-[#091426]">{doc.label}</span>
                            <span className="mt-1 block text-xs text-[#6b7280]">{doc.meta}</span>
                        </button>
                    ))}
                </div>
                <div className="grid gap-3 border-t border-[#e2e8f0] pt-5 sm:grid-cols-2">
                    <button
                        type="button"
                        className="h-12 rounded-lg border border-[#c5c6cd] text-sm font-bold text-[#091426] hover:border-[#091426]"
                    >
                        Gia hạn hợp đồng
                    </button>
                    <button
                        type="button"
                        className="h-12 rounded-lg bg-[#091426] text-sm font-bold text-white hover:bg-[#16253a]"
                    >
                        Gửi thông báo
                    </button>
                </div>
            </div>
            {preview && (
                <Modal
                    title={preview === "contract" ? "Chi tiết hợp đồng thuê" : `Xem ${preview === "front" ? "CCCD mặt trước" : "CCCD mặt sau"}`}
                    onClose={() => setPreview(null)}
                >
                    {preview === "contract" ? (
                        <div className="grid gap-4">
                            <div className="rounded-xl border border-[#e2e8f0] bg-[#f7f9fb] p-5">
                                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6b7280]">Thông tin
                                    hai bên</p>
                                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                    <InfoBlock label="Bên cho thuê" value={contract.landlord}/>
                                    <InfoBlock label="Bên thuê" value={profile.name}/>
                                    <InfoBlock label="SĐT bên thuê" value={profile.phone}/>
                                    <InfoBlock label="Email bên thuê" value={profile.email}/>
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <InfoBlock label="Phòng" value={profile.roomId}/>
                                <InfoBlock label="Ngày bắt đầu" value={contract.startDate}/>
                                <InfoBlock label="Ngày kết thúc" value={contract.endDate}/>
                                <InfoBlock label="Giá thuê" value={formatMoney(profile.monthlyRent)}/>
                                <InfoBlock label="Chu kỳ thanh toán" value={contract.paymentCycle}/>
                                <InfoBlock label="Tiền cọc" value={formatMoney(profile.deposit)}/>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
                            <div
                                className="flex aspect-[1.58] items-center justify-center rounded-xl border border-[#c5c6cd] bg-[#eef2f7]">
                                <div className="w-[82%] rounded-lg border border-[#c5c6cd] bg-white p-5 shadow-sm">
                                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6b7280]">Căn cước
                                        công dân</p>
                                    <p className="mt-8 text-xl font-bold text-[#091426]">{profile.name}</p>
                                    <p className="mt-2 text-sm text-[#45474c]">Số: {profile.citizenId}</p>
                                    <p className="mt-1 text-sm text-[#45474c]">Ngày sinh: {profile.birthDate}</p>
                                </div>
                            </div>
                            <div className="grid content-start gap-3">
                                <InfoBlock label="Họ tên" value={profile.name}/>
                                <InfoBlock label="CCCD" value={profile.citizenId}/>
                                <InfoBlock label="Phòng" value={profile.roomId}/>
                                <InfoBlock label="SĐT" value={profile.phone}/>
                            </div>
                        </div>
                    )}
                </Modal>
            )}
        </Card>
    );
}

export default function TenantsPage() {
    const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.id ?? null);
    const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId) || tenants[0];

    return (
        <>
            <PageHeader
                title="Khách thuê"
                description="Quản lý danh sách và hồ sơ khách thuê đang ở tại Hải Đăng."
                actionLabel="Thêm khách thuê"
                actionIcon={UserPlus}
            />
            <div className="flex flex-wrap gap-2">
                {["Tất cả", "Đang ở", "Nợ phí", "Sắp hết hạn", "Thiếu hồ sơ", "Đã rời"].map((filter, index) => (
                    <button
                        key={filter}
                        type="button"
                        className={`rounded-lg px-5 py-2 text-sm font-bold ${
                            index === 0 ? "bg-[#091426] text-white" : "border border-[#e2e8f0] bg-white text-[#505f76]"
                        }`}
                    >
                        {filter}
                    </button>
                ))}
            </div>
            <section className="grid gap-6 xl:grid-cols-[minmax(0,626px)_minmax(360px,1fr)]">
                <div className="grid gap-4">
                    {tenants.map((tenant, index) => {
                        const active = tenant.id === selectedTenant.id;

                        return (
                            <button
                                key={tenant.id}
                                type="button"
                                onClick={() => setSelectedTenantId(tenant.id)}
                                className={`rounded-xl border bg-white p-5 text-left shadow-[0_1px_2px_rgba(9,20,38,0.06)] transition ${
                                    active ? "border-[#091426] ring-2 ring-[#091426]/5" : "border-[#e2e8f0] hover:border-[#091426]"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                    <span
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d3e4fe] text-sm font-bold text-[#091426]">
                      {tenant.initials}
                    </span>
                                        <span>
                      <span className="block font-bold text-[#091426]">{tenant.name}</span>
                      <span className="mt-1 block text-xs text-[#45474c]">{tenant.roomId} · {tenant.phone}</span>
                    </span>
                                    </div>
                                    <span className="text-right">
                    <span className="block font-bold text-[#091426]">{formatMoney(tenant.monthlyRent)}</span>
                    <span className="text-xs text-[#6b7280]">/ tháng</span>
                  </span>
                                </div>
                                {index === 0 && (
                                    <div className="mt-5 grid gap-3 border-t border-[#e2e8f0] pt-5 sm:grid-cols-2">
                                        <InfoMetric icon={CalendarClock} label="Ngày vào ở" value={tenant.moveInDate}/>
                                        <InfoMetric icon={WalletCards} label="Tiền cọc"
                                                    value={formatMoney(tenant.deposit)}/>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
                <TenantProfile profile={selectedTenant}/>
            </section>
        </>
    );
}
