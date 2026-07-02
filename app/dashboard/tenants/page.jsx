"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bike,
  BriefcaseBusiness,
  CheckCircle2,
  Contact,
  Eye,
  FileText,
  FolderOpen,
  IdCard,
  ImageOff,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  fetchPrivateFileObjectUrl,
  fetchTenantProfiles,
} from "@/services/tenantProfilesService";
import { fetchManagementLeaseContractDetails } from "@/services/leaseContractsService";
import { formatDate as formatDisplayDate } from "@/lib/dateFormat";
import { DashboardPagination } from "@/components/dashboard/DashboardPagination";

const valueOf = (item, ...keys) => {
  for (const key of keys) {
    if (item && item[key] !== undefined && item[key] !== null && item[key] !== "") {
      return item[key];
    }
  }
  return "";
};



const moneyFormatter = new Intl.NumberFormat("vi-VN");

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");


const formatDate = (value) => {
  return formatDisplayDate(value);
};

const formatYear = (value) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Chưa cập nhật" : String(date.getFullYear());
};

const formatMoney = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? `${moneyFormatter.format(amount)} đ`
    : "Chưa cập nhật";
};

const initialsOf = (name) => {
  const words = String(name || "KH").trim().split(/\s+/).filter(Boolean);
  return words
    .slice(-2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "KH";
};

const roleLabel = (role) =>
  String(role).toUpperCase() === "PRIMARY" ? "Người ký chính" : "Người ở cùng";

const roleClass = (role) =>
  String(role).toUpperCase() === "PRIMARY"
    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
    : "border-slate-200 bg-slate-50 text-slate-700";

const profileStatusLabel = (status, fallback) => {
  const value = String(status || "").toUpperCase();
  if (value === "COMPLETED") return "Hồ sơ đủ";
  if (value === "MISSING_CCCD") return "Thiếu CCCD";
  if (value === "MISSING_PORTRAIT") return "Thiếu ảnh chân dung";
  if (value === "MISSING_EMERGENCY_CONTACT") return "Thiếu liên hệ khẩn cấp";
  return fallback || "Chưa rõ";
};

const profileStatusClass = (status) => {
  const value = String(status || "").toUpperCase();
  if (value === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (
    value === "MISSING_CCCD" ||
    value === "MISSING_PORTRAIT" ||
    value === "MISSING_EMERGENCY_CONTACT"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const accountStatusLabel = (status) => {
  const value = String(status || "").toUpperCase();
  if (value === "ACTIVE") return "Đã kích hoạt";
  if (value === "INACTIVE" || value === "DISABLED" || value === "CLOSED" || value === "ARCHIVED") {
    return "Bị vô hiệu hóa";
  }
  return "Chưa kích hoạt";
};

const accountStatusClass = (status) => {
  const value = String(status || "").toUpperCase();
  if (value === "ACTIVE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "INACTIVE" || value === "DISABLED" || value === "CLOSED" || value === "ARCHIVED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const residenceStatusLabel = (status) => {
  const value = String(status || "").toUpperCase();
  if (value === "RENTING") return "Đang thuê";
  if (value === "MOVED_OUT") return "Đã rời đi";
  return "Chờ duyệt";
};

const contractStatusLabel = (status) => {
  const value = String(status || "").toUpperCase();
  if (value === "ACTIVE") return "Đang hiệu lực";
  if (value === "EXPIRING_SOON") return "Sắp hết hạn";
  if (value === "EXPIRED") return "Hết hạn";
  if (value === "PENDING_SIGNATURE") return "Chờ ký";
  if (value === "DRAFT") return "Bản nháp";
  if (value === "WAITING_UPLOAD") return "Chờ upload";
  if (value === "WAITING_ACTIVATE") return "Chờ kích hoạt";
  if (value === "RENEWED") return "Đã gia hạn";
  if (value === "LIQUIDATED") return "Đã thanh lý";
  if (value === "CANCELLED") return "Đã hủy";
  return value || "Chưa cập nhật";
};

const contractStatusClass = (status) => {
  const value = String(status || "").toUpperCase();
  if (value === "ACTIVE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "EXPIRING_SOON") return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "EXPIRED") return "border-red-200 bg-red-50 text-red-700";
  if (["PENDING_SIGNATURE", "DRAFT", "WAITING_UPLOAD", "WAITING_ACTIVATE"].includes(value)) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (value === "RENEWED") return "border-indigo-200 bg-indigo-50 text-indigo-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const genderLabel = (gender) => {
  const value = String(gender || "").toUpperCase();
  if (value === "MALE") return "Nam";
  if (value === "FEMALE") return "Nữ";
  if (value === "OTHER") return "Khác";
  return gender || "Chưa cập nhật";
};

const vehicleTypeLabel = (type) => {
  const value = String(type || "").toUpperCase();
  if (value === "MOTORBIKE") return "Xe máy";
  if (value === "BICYCLE") return "Xe đạp";
  if (value === "CAR") return "Ô tô";
  if (value === "E_BIKE") return "Xe điện";
  return type || "Khác";
};

const roomOccupancyText = (profile) => {
  const current = Number(valueOf(profile, "roomOccupantCount", "room_occupant_count")) || 0;
  const max = Number(valueOf(profile, "roomMaxOccupants", "room_max_occupants")) || 3;
  return `${current}/${max}`;
};

const profileRowKey = (profile, index) => {
  const profileId = valueOf(profile, "id", "profileId", "profile_id");
  if (profileId) return `profile-${profileId}`;
  return [
    "profile-row",
    valueOf(profile, "contractId", "contract_id") || "contract",
    valueOf(profile, "roomRole", "room_role") || "role",
    valueOf(profile, "phone") || "phone",
    valueOf(profile, "fullName", "full_name") || "name",
    index,
  ].join("-");
};

function Badge({ children, className = "" }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

function InfoItem({ label, value, strong = false }) {
  return (
    <div>
      <p className="text-xs font-bold text-[#7b8494]">{label}</p>
      <p className={`mt-1 text-sm ${strong ? "font-black text-[#091426]" : "font-semibold text-[#243247]"}`}>
        {value || "Chưa cập nhật"}
      </p>
    </div>
  );
}

function DetailSection({ icon: Icon, title, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-[#d8dee8] bg-white p-5 ${className}`}>
      <div className="mb-5 flex items-center gap-3">
        <Icon className="h-5 w-5 text-[#091426]" />
        <h3 className="text-sm font-black uppercase tracking-[0.06em] text-[#45474c]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ProtectedImage({ fileUrl, alt, placeholder }) {
  const [objectUrl, setObjectUrl] = useState("");
  const [state, setState] = useState(fileUrl ? "loading" : "empty");

  useEffect(() => {
    let isActive = true;
    let createdUrl = "";

    if (!fileUrl) {
      return undefined;
    }

    fetchPrivateFileObjectUrl(fileUrl)
      .then((url) => {
        if (!isActive) {
          URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setObjectUrl(url);
        setState("ready");
      })
      .catch(() => {
        if (isActive) setState("error");
      });

    return () => {
      isActive = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [fileUrl]);

  const displayState = fileUrl ? state : "empty";

  if (displayState !== "ready") {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-[#cbd5e1] bg-[#f1f5f9] p-4 text-center text-sm font-bold text-[#64748b]">
        <div>
          <ImageOff className="mx-auto mb-3 h-8 w-8 text-[#94a3b8]" />
          {displayState === "loading" ? "Đang tải ảnh..." : placeholder}
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={objectUrl}
      alt={alt}
      className="h-[220px] w-full rounded-xl border border-[#d8dee8] bg-[#f8fafc] object-contain"
      onError={() => setState("error")}
    />
  );
}

function ChecklistRow({ label, done, doneText, missingText }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-[#f1f5ff] px-4 py-3">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-[#4166b2]" />
        <span className="font-bold text-[#243247]">{label}</span>
      </div>
      <span className={`flex items-center gap-1 text-xs font-black uppercase ${done ? "text-emerald-600" : "text-amber-700"}`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        {done ? doneText : missingText}
      </span>
    </div>
  );
}

function ContactLine({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef4ff] text-[#4166b2]">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-xs font-bold text-[#7b8494]">{label}</span>
        <span className="block text-sm font-black text-[#091426]">{value || "Chưa cập nhật"}</span>
      </span>
    </div>
  );
}

function getProfileContractId(profile) {
  return valueOf(profile, "contractId", "contract_id", "leaseContractId", "lease_contract_id");
}

function ContractDetailInfo({ label, value, strong = false }) {
  return (
    <div className="rounded-xl bg-[#f8fafc] p-4">
      <p className="text-xs font-black uppercase tracking-[0.06em] text-[#7b8494]">{label}</p>
      <p className={`mt-2 text-sm ${strong ? "font-black text-[#091426]" : "font-bold text-[#243247]"}`}>
        {value || "Chưa cập nhật"}
      </p>
    </div>
  );
}

function LeaseContractDetailModal({ contract, onClose }) {
  if (!contract) return null;

  const room = valueOf(contract, "room") || {};
  const property = valueOf(contract, "property") || {};
  const occupants = valueOf(contract, "occupants") || [];
  const contractFile = valueOf(contract, "contractFile", "contract_file") || null;
  const paymentCycleMonths = Number(valueOf(contract, "paymentCycleMonths", "payment_cycle_months")) || 0;
  const monthlyRent = Number(valueOf(contract, "monthlyRent", "monthly_rent")) || 0;
  const amountPerPeriod = paymentCycleMonths > 0 && monthlyRent > 0 ? monthlyRent * paymentCycleMonths : null;
  const status = valueOf(contract, "status", "contractStatus", "contract_status");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#091426]/70 p-4" role="dialog" aria-modal="true">
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="relative bg-[#05091d] px-6 py-7 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết hợp đồng"
            className="absolute right-4 top-4 rounded-md p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-slate-300">Chi tiết hợp đồng</p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.02em]">
            {valueOf(contract, "contractCode", "contract_code") || "Chưa có mã hợp đồng"}
          </h2>
          <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-black ${contractStatusClass(status)}`}>
            {contractStatusLabel(status)}
          </span>
        </header>

        <div className="grid flex-1 gap-5 overflow-y-auto bg-[#fbfcfe] p-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <DetailSection icon={MapPin} title="Thông tin phòng">
              <div className="grid gap-4 md:grid-cols-2">
                <ContractDetailInfo label="Cơ sở" value={valueOf(contract, "propertyName", "property_name") || valueOf(property, "name", "propertyName", "property_name")} />
                <ContractDetailInfo label="Phòng" value={valueOf(contract, "roomCode", "room_code") || valueOf(room, "roomCode", "room_code")} strong />
                <ContractDetailInfo label="Giá thuê/tháng" value={formatMoney(monthlyRent)} />
                <ContractDetailInfo label="Số tiền đóng mỗi kỳ" value={amountPerPeriod ? formatMoney(amountPerPeriod) : "Chưa cập nhật"} />
                <ContractDetailInfo label="Tiền cọc" value={formatMoney(valueOf(contract, "depositAmount", "deposit_amount"))} />
                <ContractDetailInfo label="Số người" value={`${occupants.length || valueOf(contract, "occupantsCount", "occupants_count") || 1} người`} />
              </div>
            </DetailSection>

            <DetailSection icon={BriefcaseBusiness} title="Thông tin hợp đồng">
              <div className="grid gap-4 md:grid-cols-2">
                <ContractDetailInfo label="Mã hợp đồng" value={valueOf(contract, "contractCode", "contract_code")} strong />
                <ContractDetailInfo label="Trạng thái" value={contractStatusLabel(status)} />
                <ContractDetailInfo label="Ngày bắt đầu" value={formatDate(valueOf(contract, "startDate", "start_date"))} />
                <ContractDetailInfo label="Ngày kết thúc" value={formatDate(valueOf(contract, "endDate", "end_date"))} />
                <ContractDetailInfo label="Ngày bắt đầu tính tiền" value={formatDate(valueOf(contract, "rentStartDate", "rent_start_date"))} />
                <ContractDetailInfo label="Chu kỳ thanh toán" value={paymentCycleMonths ? `${paymentCycleMonths} tháng/lần` : "Chưa cập nhật"} />
                <ContractDetailInfo label="Hợp đồng trước" value={valueOf(contract, "previousContractCode", "previous_contract_code") || "Không có"} />
                <ContractDetailInfo label="Hợp đồng tái ký" value={valueOf(contract, "renewedContractCode", "renewed_contract_code") || "Chưa có"} />
              </div>
            </DetailSection>
          </div>

          <DetailSection icon={Users} title="Người ở trong hợp đồng">
            {occupants.length ? (
              <div className="dashboard-table rounded-xl border border-[#e2e8f0]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#f8fafc] text-xs font-black uppercase tracking-[0.04em] text-[#64748b]">
                    <tr>
                      <th className="px-4 py-3">Họ tên</th>
                      <th className="px-4 py-3">Vai trò</th>
                      <th className="px-4 py-3">SĐT</th>
                      <th className="px-4 py-3">CCCD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {occupants.map((occupant, index) => (
                      <tr key={valueOf(occupant, "tenantProfileId", "tenant_profile_id", "id") || index}>
                        <td className="px-4 py-3 font-black text-[#091426]">{valueOf(occupant, "fullName", "full_name") || "Chưa cập nhật"}</td>
                        <td className="px-4 py-3">{roleLabel(valueOf(occupant, "occupantRole", "occupant_role", "roomRole", "room_role"))}</td>
                        <td className="px-4 py-3">{valueOf(occupant, "phone") || "Chưa cập nhật"}</td>
                        <td className="px-4 py-3">{valueOf(occupant, "citizenId", "citizen_id", "docNumber", "doc_number") || "Chưa cập nhật"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-xl bg-[#f8fafc] px-4 py-5 text-sm font-semibold text-[#64748b]">
                Chưa có danh sách người ở trong hợp đồng.
              </p>
            )}
          </DetailSection>

          <DetailSection icon={FileText} title="File hợp đồng đã ký">
            {contractFile ? (
              <div className="rounded-xl bg-[#f8fafc] p-4">
                <p className="font-black text-[#091426]">{valueOf(contractFile, "fileName", "file_name", "name") || "File hợp đồng"}</p>
                <p className="mt-1 text-sm font-semibold text-[#64748b]">
                  Upload: {formatDate(valueOf(contractFile, "uploadedAt", "uploaded_at", "createdAt", "created_at"))}
                </p>
              </div>
            ) : (
              <p className="rounded-xl bg-[#f8fafc] px-4 py-5 text-sm font-semibold text-[#64748b]">
                Chưa có file hợp đồng đã ký.
              </p>
            )}
          </DetailSection>
        </div>
      </section>
    </div>
  );
}

function TenantProfileModal({
  profile,
  profiles,
  onClose,
  onSelectProfile,
  onOpenContractDetails,
  contractDetailsLoadingId,
  contractDetailsError,
}) {
  const identity = valueOf(profile, "identityDocument", "identity_document") || {};
  const vehicles = valueOf(profile, "vehicles") || [];
  const emergencyContacts = valueOf(profile, "emergencyContacts", "emergency_contacts") || [];
  const roommates = valueOf(profile, "roommates") || [];
  const maxOccupants = Number(valueOf(profile, "roomMaxOccupants", "room_max_occupants")) || 3;
  const occupantCount = Number(valueOf(profile, "roomOccupantCount", "room_occupant_count")) || 1;
  const firstEmergency = emergencyContacts[0];
  const contractId = getProfileContractId(profile);
  const isLoadingContractDetails = contractId && String(contractDetailsLoadingId) === String(contractId);

  const openRoommateProfile = (roommateId) => {
    const nextProfile = profiles.find((item) => Number(valueOf(item, "id")) === Number(roommateId));
    if (nextProfile) onSelectProfile(nextProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-[#d8dee8] px-6 py-5">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <UserRound className="h-6 w-6" />
            </span>
            <h2 className="text-2xl font-black text-[#091426]">Chi tiết hồ sơ khách thuê</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#45474c] hover:bg-[#f2f4f6]" aria-label="Đóng">
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="grid flex-1 gap-5 overflow-y-auto bg-[#fbfcfe] p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid content-start gap-5">
            <DetailSection icon={IdCard} title="Thông tin cá nhân">
              <div className="grid gap-5 md:grid-cols-3">
                <InfoItem label="Họ và tên" value={valueOf(profile, "fullName", "full_name")} strong />
                <InfoItem label="Ngày sinh" value={formatDate(valueOf(profile, "dob"))} />
                <InfoItem label="Giới tính" value={genderLabel(valueOf(profile, "gender"))} />
                <InfoItem label="Số CCCD" value={valueOf(identity, "docNumber", "doc_number")} />
                <InfoItem label="Ngày cấp" value={formatDate(valueOf(identity, "issuedDate", "issued_date"))} />
                <InfoItem label="Nơi cấp" value={valueOf(identity, "issuedPlace", "issued_place")} />
                <div className="md:col-span-3">
                  <InfoItem label="Hộ khẩu thường trú" value={valueOf(profile, "permanentAddress", "permanent_address")} />
                </div>
              </div>
            </DetailSection>

            <DetailSection icon={MapPin} title="Nơi cư trú">
              <div className="grid gap-5 md:grid-cols-3">
                <InfoItem label="Tên cơ sở trọ" value={valueOf(profile, "propertyName", "property_name")} />
                <InfoItem label="Số phòng" value={`Phòng ${valueOf(profile, "roomCode", "room_code")}`} strong />
                <InfoItem label="Vai trò trong phòng" value={roleLabel(valueOf(profile, "roomRole", "room_role"))} />
                <InfoItem label="Số người trong phòng" value={`${occupantCount}/${maxOccupants}`} />
                <InfoItem label="Ngày vào ở" value={formatDate(valueOf(profile, "moveInDate", "move_in_date"))} />
                <InfoItem label="Trạng thái cư trú" value={residenceStatusLabel(valueOf(profile, "residenceStatus", "residence_status"))} />
              </div>
            </DetailSection>

            <DetailSection icon={Users} title="Danh sách người cùng phòng">
              {roommates.length ? (
                <div className="dashboard-table rounded-xl border border-[#e2e8f0]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#f8fafc] text-xs font-black uppercase tracking-[0.04em] text-[#64748b]">
                      <tr>
                        <th className="px-4 py-3">Họ tên</th>
                        <th className="px-4 py-3">Năm sinh</th>
                        <th className="px-4 py-3">Số điện thoại</th>
                        <th className="px-4 py-3">Vai trò</th>
                        <th className="px-4 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {roommates.map((roommate, index) => (
                        <tr key={valueOf(roommate, "id") || `${valueOf(roommate, "roomRole", "room_role")}-${valueOf(roommate, "phone")}-${index}`}>
                          <td data-label="Họ tên" className="px-4 py-3 font-bold text-[#091426]">{valueOf(roommate, "fullName", "full_name")}</td>
                          <td data-label="Năm sinh" className="px-4 py-3">{formatYear(valueOf(roommate, "dob"))}</td>
                          <td data-label="Số điện thoại" className="px-4 py-3">{valueOf(roommate, "phone") || "Chưa cập nhật"}</td>
                          <td data-label="Vai trò" className="px-4 py-3">{roleLabel(valueOf(roommate, "roomRole", "room_role"))}</td>
                          <td data-label="Thao tác" className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openRoommateProfile(valueOf(roommate, "id"))}
                              className="rounded-lg border border-[#d8dee8] px-3 py-2 text-xs font-bold text-[#091426] hover:bg-[#f2f4f6]"
                            >
                              Xem hồ sơ
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-xl bg-[#f8fafc] px-4 py-5 text-sm font-semibold text-[#64748b]">
                  Phòng hiện chỉ có 1 người ở.
                </p>
              )}
            </DetailSection>

            <DetailSection icon={Bike} title="Thông tin xe">
              {vehicles.length ? (
                <div className="grid gap-4">
                  {vehicles.map((vehicle, index) => (
                    <div key={valueOf(vehicle, "id") || index} className="grid gap-5 rounded-xl bg-[#f8fafc] p-4 md:grid-cols-3">
                      <InfoItem label="Hãng xe" value={vehicleTypeLabel(valueOf(vehicle, "vehicleType", "vehicle_type"))} />
                      <InfoItem label="Biển số" value={valueOf(vehicle, "licensePlate", "license_plate")} strong />
                      <InfoItem label="Số lượng xe" value={vehicles.length} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-[#f8fafc] px-4 py-5 text-sm font-semibold text-[#64748b]">Chưa đăng ký xe</p>
              )}
            </DetailSection>

            <DetailSection icon={Contact} title="Ảnh căn cước công dân">
              <div className="grid gap-5 md:grid-cols-2">
                <ProtectedImage
                  fileUrl={valueOf(identity, "frontFileUrl", "front_file_url")}
                  alt="Ảnh mặt trước CCCD"
                  placeholder="Chưa có ảnh mặt trước CCCD, thêm sau"
                />
                <ProtectedImage
                  fileUrl={valueOf(identity, "backFileUrl", "back_file_url")}
                  alt="Ảnh mặt sau CCCD"
                  placeholder="Chưa có ảnh mặt sau CCCD, thêm sau"
                />
              </div>
            </DetailSection>

            <DetailSection icon={UserRound} title="Ảnh chân dung">
              <ProtectedImage
                fileUrl={valueOf(profile, "portraitUrl", "portrait_url")}
                alt="Ảnh chân dung khách thuê"
                placeholder="Chưa có ảnh chân dung"
              />
            </DetailSection>
          </div>

          <aside className="grid content-start gap-5">
            <section className="rounded-xl bg-[#050505] p-6 text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
              <div className="flex items-center gap-3">
                <BriefcaseBusiness className="h-5 w-5" />
                <h3 className="text-sm font-black uppercase tracking-[0.08em]">Hợp đồng thuê</h3>
              </div>
              <p className="mt-7 text-2xl font-black">{valueOf(profile, "contractCode", "contract_code") || "Chưa có mã"}</p>
              <p className="mt-3 text-sm font-semibold text-white/70">
                Tiền thuê: {formatMoney(valueOf(profile, "monthlyRent", "monthly_rent"))}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/70">
                Thời hạn: {formatDate(valueOf(profile, "contractStartDate", "contract_start_date"))} - {formatDate(valueOf(profile, "contractEndDate", "contract_end_date"))}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/70">
                Trạng thái: {contractStatusLabel(valueOf(profile, "contractStatus", "contract_status"))}
              </p>
              <button
                type="button"
                onClick={() => onOpenContractDetails(profile)}
                disabled={!contractId || isLoadingContractDetails}
                className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 text-sm font-black hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingContractDetails ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                {isLoadingContractDetails ? "Đang tải..." : "Xem chi tiết"}
              </button>
              {!contractId && (
                <p className="mt-3 text-xs font-semibold text-white/60">Chưa có hợp đồng để xem chi tiết.</p>
              )}
              {contractDetailsError && contractId && (
                <p className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-100">
                  {contractDetailsError}
                </p>
              )}
            </section>

            <DetailSection icon={FolderOpen} title="Danh mục hồ sơ">
              <div className="grid gap-3">
                <ChecklistRow
                  label="CCCD"
                  done={Boolean(
                    valueOf(identity, "docNumber", "doc_number") &&
                    valueOf(identity, "frontFileId", "front_file_id") &&
                    valueOf(identity, "backFileId", "back_file_id")
                  )}
                  doneText="Hoàn tất"
                  missingText="Thiếu"
                />
                <ChecklistRow
                  label="Ảnh chân dung"
                  done={Boolean(valueOf(profile, "portraitFileId", "portrait_file_id"))}
                  doneText="Hoàn tất"
                  missingText="Thiếu"
                />
                <ChecklistRow
                  label="Liên hệ khẩn cấp"
                  done={emergencyContacts.length > 0}
                  doneText="Hoàn tất"
                  missingText="Thiếu"
                />
                <ChecklistRow label="Xe" done={vehicles.length > 0} doneText="Có" missingText="Không có" />
                <ChecklistRow
                  label="Tài khoản app"
                  done={String(valueOf(profile, "appStatus", "app_status")).toUpperCase() === "ACTIVE"}
                  doneText="Đã kích hoạt"
                  missingText="Chưa kích hoạt"
                />
              </div>
            </DetailSection>

            <DetailSection icon={Phone} title="Liên hệ">
              <div className="grid gap-4">
                <ContactLine icon={Phone} label="Số điện thoại" value={valueOf(profile, "phone")} />
                <ContactLine icon={Mail} label="Email" value={valueOf(profile, "email")} />
                <div className="rounded-xl bg-[#f8fafc] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.06em] text-[#64748b]">Liên hệ khẩn cấp</p>
                  {firstEmergency ? (
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-[#243247]">
                      <p>{valueOf(firstEmergency, "fullName", "full_name")}</p>
                      <p>Quan hệ: {valueOf(firstEmergency, "relationship")}</p>
                      <p>SĐT: {valueOf(firstEmergency, "phone")}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm font-semibold text-[#64748b]">Chưa cập nhật liên hệ khẩn cấp</p>
                  )}
                </div>
              </div>
            </DetailSection>
          </aside>
        </div>

        <footer className="flex justify-end border-t border-[#d8dee8] bg-white px-6 py-4">
          <button type="button" onClick={onClose} className="h-11 rounded-lg border border-[#c5c6cd] px-8 text-sm font-bold text-[#45474c] hover:bg-[#f2f4f6]">
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const [contractDetailsLoadingId, setContractDetailsLoadingId] = useState("");
  const [contractDetailsError, setContractDetailsError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [roomFilter, setRoomFilter] = useState("all");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [profileStatusFilter, setProfileStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const openContractDetails = async (profile) => {
    const contractId = getProfileContractId(profile);
    if (!contractId) {
      setContractDetailsError("Chưa có hợp đồng để xem chi tiết.");
      return;
    }

    try {
      setContractDetailsError("");
      setContractDetailsLoadingId(contractId);
      const details = await fetchManagementLeaseContractDetails(contractId);
      setSelectedContract({
        ...details,
        contractId: details?.contractId || contractId,
        roomCode:
          details?.roomCode ||
          details?.room_code ||
          valueOf(profile, "roomCode", "room_code"),
        propertyName:
          details?.propertyName ||
          details?.property_name ||
          valueOf(profile, "propertyName", "property_name"),
        contractCode:
          details?.contractCode ||
          details?.contract_code ||
          valueOf(profile, "contractCode", "contract_code"),
      });
    } catch (loadError) {
      setContractDetailsError(loadError?.message || "Không tải được chi tiết hợp đồng.");
    } finally {
      setContractDetailsLoadingId("");
    }
  };

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await fetchTenantProfiles({ page: page - 1, size });
      setProfiles(data.items);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (loadError) {
      setError(loadError?.message || "Không tải được hồ sơ khách thuê.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    fetchTenantProfiles({ page: page - 1, size })
      .then((data) => {
        if (!isActive) return;
        setProfiles(data.items);
        setTotalElements(data.totalElements);
        setTotalPages(data.totalPages);
        setError("");
      })
      .catch((loadError) => {
        if (!isActive) return;
        setError(loadError?.message || "Không tải được hồ sơ khách thuê.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [page, size]);

  const roomOptions = useMemo(() => {
    const rooms = [...new Set(profiles.map((profile) => valueOf(profile, "roomCode", "room_code")).filter(Boolean))];
    return rooms.sort((a, b) => String(a).localeCompare(String(b), "vi", { numeric: true }));
  }, [profiles]);

  const propertyOptions = useMemo(() => {
    const properties = [...new Set(profiles.map((profile) => valueOf(profile, "propertyName", "property_name")).filter(Boolean))];
    return properties.sort((a, b) => String(a).localeCompare(String(b), "vi"));
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const normalizedKeyword = normalizeText(keyword);
    return profiles.filter((profile) => {
      const searchable = normalizeText(
        [
          valueOf(profile, "fullName", "full_name"),
          valueOf(profile, "phone"),
          valueOf(profile, "email"),
          valueOf(profile, "roomCode", "room_code"),
        ].join(" ")
      );
      const matchKeyword = !normalizedKeyword || searchable.includes(normalizedKeyword);
      const matchRoom = roomFilter === "all" || valueOf(profile, "roomCode", "room_code") === roomFilter;
      const matchProperty = propertyFilter === "all" || valueOf(profile, "propertyName", "property_name") === propertyFilter;
      const matchStatus = profileStatusFilter === "all" || valueOf(profile, "profileStatus", "profile_status") === profileStatusFilter;
      const matchRole = roleFilter === "all" || valueOf(profile, "roomRole", "room_role") === roleFilter;
      return matchKeyword && matchRoom && matchProperty && matchStatus && matchRole;
    });
  }, [keyword, profiles, profileStatusFilter, propertyFilter, roleFilter, roomFilter]);

  const groupedByRoom = useMemo(() => {
    const groups = new Map();
    filteredProfiles.forEach((profile) => {
      const key = `${valueOf(profile, "propertyId", "property_id") || "property"}-${valueOf(profile, "roomId", "room_id") || valueOf(profile, "roomCode", "room_code")}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(profile);
    });
    return [...groups.values()];
  }, [filteredProfiles]);

  return (
    <>
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-[-0.02em] text-[#091426]">Hồ sơ khách thuê</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#45474c]">
            Quản lý hồ sơ từng người ở trong phòng, bao gồm người ký chính và người ở cùng.
          </p>
        </div>
        <button
          type="button"
          onClick={loadProfiles}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d8dee8] bg-white px-4 text-sm font-bold text-[#091426] hover:bg-[#f2f4f6]"
        >
          <RefreshCcw className="h-4 w-4" />
          Làm mới
        </button>
      </section>

      <section className="rounded-xl border border-[#d8dee8] bg-white p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(280px,1fr)_180px_200px_210px_190px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8b97aa]" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm theo tên, SĐT, email hoặc số phòng"
              className="h-12 w-full rounded-lg border border-[#cbd5e1] bg-white pl-12 pr-4 text-sm outline-none focus:border-[#4166b2]"
            />
          </div>
          <select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)} className="h-12 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-semibold outline-none focus:border-[#4166b2]">
            <option value="all">Tất cả phòng</option>
            {roomOptions.map((room) => (
              <option key={room} value={room}>Phòng {room}</option>
            ))}
          </select>
          <select value={propertyFilter} onChange={(event) => setPropertyFilter(event.target.value)} className="h-12 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-semibold outline-none focus:border-[#4166b2]">
            <option value="all">Tất cả cơ sở</option>
            {propertyOptions.map((property) => (
              <option key={property} value={property}>{property}</option>
            ))}
          </select>
          <select value={profileStatusFilter} onChange={(event) => setProfileStatusFilter(event.target.value)} className="h-12 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-semibold outline-none focus:border-[#4166b2]">
            <option value="all">Tất cả trạng thái</option>
            <option value="COMPLETED">Hồ sơ đủ</option>
            <option value="MISSING_CCCD">Thiếu CCCD</option>
            <option value="MISSING_PORTRAIT">Thiếu ảnh chân dung</option>
            <option value="MISSING_EMERGENCY_CONTACT">Thiếu liên hệ khẩn cấp</option>
          </select>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="h-12 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-semibold outline-none focus:border-[#4166b2]">
            <option value="all">Tất cả vai trò</option>
            <option value="PRIMARY">Người ký chính</option>
            <option value="CO_OCCUPANT">Người ở cùng</option>
          </select>
        </div>
      </section>

      {isLoading && (
        <section className="rounded-xl border border-[#d8dee8] bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-bold text-[#64748b]">Đang tải hồ sơ khách thuê...</p>
        </section>
      )}

      {!isLoading && error && (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-10 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-600" />
          <p className="mt-3 text-sm font-bold text-rose-700">{error}</p>
          <button type="button" onClick={loadProfiles} className="mt-5 h-10 rounded-lg bg-[#091426] px-5 text-sm font-bold text-white">
            Thử lại
          </button>
        </section>
      )}

      {!isLoading && !error && groupedByRoom.length === 0 && (
        <section className="rounded-xl border border-dashed border-[#cbd5e1] bg-white py-16 text-center">
          <UserRound className="mx-auto h-10 w-10 text-[#94a3b8]" />
          <p className="mt-3 text-sm font-bold text-[#64748b]">Không tìm thấy hồ sơ khách thuê phù hợp.</p>
        </section>
      )}

      {!isLoading && !error && groupedByRoom.length > 0 && (
        <section className="grid gap-5">
          {groupedByRoom.map((roomProfiles) => {
            const roomProfile = roomProfiles[0];
            const maxOccupants = Number(valueOf(roomProfile, "roomMaxOccupants", "room_max_occupants")) || 3;
            const currentOccupants = Number(valueOf(roomProfile, "roomOccupantCount", "room_occupant_count")) || roomProfiles.length;

            return (
              <div key={`${valueOf(roomProfile, "propertyId", "property_id")}-${valueOf(roomProfile, "roomCode", "room_code")}`} className="overflow-hidden rounded-xl border border-[#d8dee8] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d8dee8] bg-[#f8fafc] px-6 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-black text-[#091426]">Phòng {valueOf(roomProfile, "roomCode", "room_code")}</h2>
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">{residenceStatusLabel(valueOf(roomProfile, "residenceStatus", "residence_status"))}</Badge>
                      {currentOccupants >= maxOccupants && <Badge className="border-amber-200 bg-amber-50 text-amber-700">Đã đủ người</Badge>}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[#64748b]">
                      {valueOf(roomProfile, "propertyName", "property_name") || "Chưa có cơ sở"} · Hợp đồng {valueOf(roomProfile, "contractCode", "contract_code") || "chưa cập nhật"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-black text-[#091426] ring-1 ring-[#d8dee8]">
                    <Users className="h-4 w-4 text-[#4166b2]" />
                    {roomOccupancyText(roomProfile)} người
                  </div>
                </div>

                <div className="dashboard-table">
                  <table className="w-full text-left">
                    <thead className="bg-white text-xs font-black uppercase tracking-[0.05em] text-[#64748b]">
                      <tr>
                        <th className="px-6 py-4">Họ tên</th>
                        <th className="px-6 py-4">SĐT</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Số phòng</th>
                        <th className="px-6 py-4">Số người</th>
                        <th className="px-6 py-4">Vai trò</th>
                        <th className="px-6 py-4">Hồ sơ</th>
                        <th className="px-6 py-4">Tài khoản app</th>
                        <th className="px-6 py-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {roomProfiles.map((profile, index) => (
                        <tr key={profileRowKey(profile, index)} className="hover:bg-[#f8fafc]">
                          <td data-label="Họ tên" className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dbeafe] text-sm font-black text-[#1d4ed8]">
                                {initialsOf(valueOf(profile, "fullName", "full_name"))}
                              </span>
                              <span>
                                <span className="block font-black text-[#091426]">{valueOf(profile, "fullName", "full_name")}</span>
                                <span className="mt-1 block text-xs font-semibold text-[#64748b]">ID hồ sơ: #{valueOf(profile, "id")}</span>
                              </span>
                            </div>
                          </td>
                          <td data-label="SĐT" className="px-6 py-5 text-sm font-semibold text-[#243247]">{valueOf(profile, "phone") || "Chưa cập nhật"}</td>
                          <td data-label="Email" className="break-words px-6 py-5 text-sm font-semibold text-[#243247]">{valueOf(profile, "email") || "Chưa cập nhật"}</td>
                          <td data-label="Số phòng" className="px-6 py-5 text-sm font-black text-[#091426]">Phòng {valueOf(profile, "roomCode", "room_code")}</td>
                          <td data-label="Số người" className="px-6 py-5 text-sm font-black text-[#091426]">{roomOccupancyText(profile)}</td>
                          <td data-label="Vai trò" className="px-6 py-5"><Badge className={roleClass(valueOf(profile, "roomRole", "room_role"))}>{roleLabel(valueOf(profile, "roomRole", "room_role"))}</Badge></td>
                          <td data-label="Hồ sơ" className="px-6 py-5"><Badge className={profileStatusClass(valueOf(profile, "profileStatus", "profile_status"))}>{profileStatusLabel(valueOf(profile, "profileStatus", "profile_status"), valueOf(profile, "profileStatusLabel", "profile_status_label"))}</Badge></td>
                          <td data-label="Tài khoản app" className="px-6 py-5"><Badge className={accountStatusClass(valueOf(profile, "appStatus", "app_status"))}>{accountStatusLabel(valueOf(profile, "appStatus", "app_status"))}</Badge></td>
                          <td data-label="Thao tác" className="px-6 py-5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedProfile(profile)}
                              className="inline-flex items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-black text-[#091426] hover:bg-[#f2f4f6]"
                            >
                              <Eye className="h-4 w-4" />
                              Xem hồ sơ
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {!isLoading && !error && (
        <DashboardPagination
          page={page}
          size={size}
          totalElements={totalElements}
          totalPages={totalPages}
          itemLabel="hồ sơ"
          onPageChange={setPage}
          onSizeChange={(nextSize) => {
            setSize(nextSize);
            setPage(1);
          }}
        />
      )}

      {selectedProfile && (
        <TenantProfileModal
          profile={selectedProfile}
          profiles={profiles}
          onClose={() => setSelectedProfile(null)}
          onSelectProfile={setSelectedProfile}
          onOpenContractDetails={openContractDetails}
          contractDetailsLoadingId={contractDetailsLoadingId}
          contractDetailsError={contractDetailsError}
        />
      )}

      {selectedContract && (
        <LeaseContractDetailModal
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
        />
      )}
    </>
  );
}
