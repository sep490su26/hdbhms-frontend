"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import {
    AlertCircle,
    CheckCircle2,
    Filter,
    KeyRound,
    Loader2,
    LockKeyhole,
    RotateCcw,
    Search,
    ShieldCheck,
    ShieldPlus,
    Trash2,
    UnlockKeyhole,
    UserRoundCog,
    UserPlus,
    UsersRound,
    X,
} from "lucide-react";
import {useAuth} from "@/app/dashboard/_contexts/AuthContext";
import {
    createStaffAccount,
    deleteUser,
    fetchUsers as fetchUsersApi,
    restoreUser,
    updateUserRole,
    updateUserStatus,
} from "@/services/identityAccessService";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";
const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 100;

const staffRoles = ["OWNER", "MANAGER", "ACCOUNTANT"];

const roleOptions = [
    {value: "all", label: "Tất cả loại tài khoản"},
    {value: "OWNER", label: "Chủ trọ"},
    {value: "MANAGER", label: "Quản lý"},
    {value: "ACCOUNTANT", label: "Kế toán"},
    {value: "TENANT", label: "Khách thuê"},
    {value: "LEAD", label: "Khách xem phòng"},
];

const statusOptions = [
    {value: "all", label: "Tất cả trạng thái"},
    {value: "ACTIVE", label: "Đang hoạt động"},
    {value: "DISABLED", label: "Đã khóa"},
    // {value: "PENDING_CONTRACT", label: "Chờ hợp đồng"},
];

const roleMeta = {
    OWNER: {
        label: "Chủ trọ",
        className: "bg-slate-900 text-white ring-slate-900",
    },
    MANAGER: {
        label: "Quản lý",
        className: "bg-blue-50 text-blue-700 ring-blue-100",
    },
    ACCOUNTANT: {
        label: "Kế toán",
        className: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    },
    TENANT: {
        label: "Khách thuê",
        className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
    LEAD: {
        label: "Khách tìm hiểu",
        className: "bg-amber-50 text-amber-700 ring-amber-100",
    },
};

const statusMeta = {
    ACTIVE: {
        label: "Đang hoạt động",
        className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    },
    DISABLED: {
        label: "Đã khóa",
        className: "bg-rose-50 text-rose-700 ring-rose-100",
    },
    PENDING_CONTRACT: {
        label: "Chờ hợp đồng",
        className: "bg-amber-50 text-amber-700 ring-amber-100",
    },
};

const assignableRoleOptions = [
    {value: "MANAGER", label: "Quản lý"},
    {value: "ACCOUNTANT", label: "Kế toán"},
];

const staffCreationRoleOptions = [
    {value: "MANAGER", label: "Quản lý"},
    {value: "ACCOUNTANT", label: "Kế toán"},
];

const mockUsers = [
    {
        id: 1,
        fullName: "Nguyễn Hoàng Hùng",
        phone: "0902118456",
        email: "hung.nguyen@haidang.vn",
        role: "OWNER",
        status: "ACTIVE",
        emailVerified: true,
        mustChangePassword: false,
        lastLoginAt: "2026-05-24T08:40:00",
        createdAt: "2026-05-02T09:00:00",
        personProfileId: 101,
    },
    {
        id: 2,
        fullName: "Trần Minh Phương",
        phone: "0918222016",
        email: "phuong.tran@haidang.vn",
        role: "MANAGER",
        status: "ACTIVE",
        emailVerified: true,
        mustChangePassword: false,
        lastLoginAt: "2026-05-23T17:22:00",
        createdAt: "2026-05-04T10:20:00",
        personProfileId: 102,
    },
    {
        id: 3,
        fullName: "Lê Gia Bảo",
        phone: "0937441009",
        email: "bao.le@haidang.vn",
        role: "MANAGER",
        status: "PENDING_CONTRACT",
        emailVerified: false,
        mustChangePassword: true,
        lastLoginAt: null,
        createdAt: "2026-05-17T14:10:00",
        personProfileId: 103,
    },
    {
        id: 4,
        fullName: "Phạm Thùy Linh",
        phone: "0981533228",
        email: "linh.pham@haidang.vn",
        role: "ACCOUNTANT",
        status: "PENDING_CONTRACT",
        emailVerified: true,
        mustChangePassword: true,
        lastLoginAt: null,
        createdAt: "2026-05-18T11:35:00",
        personProfileId: 104,
    },
    {
        id: 5,
        fullName: "Đặng Quốc Việt",
        phone: "0966340711",
        email: "viet.dang@haidang.vn",
        role: "MANAGER",
        status: "DISABLED",
        emailVerified: true,
        mustChangePassword: false,
        lastLoginAt: "2026-05-10T21:15:00",
        createdAt: "2026-04-25T08:00:00",
        personProfileId: 105,
    },
    {
        id: 42,
        fullName: "Võ Minh Anh",
        phone: "0901234567",
        email: "tenant@example.com",
        role: "TENANT",
        status: "ACTIVE",
        emailVerified: true,
        mustChangePassword: false,
        lastLoginAt: "2026-05-22T12:10:00",
        createdAt: "2026-05-22T12:00:00",
        personProfileId: 9,
    },
    {
        id: 43,
        fullName: "Bùi Thanh Tâm",
        phone: "0909876543",
        email: "tam.bui@example.com",
        role: "TENANT",
        status: "DISABLED",
        emailVerified: true,
        mustChangePassword: false,
        lastLoginAt: "2026-05-12T19:30:00",
        createdAt: "2026-04-19T16:20:00",
        personProfileId: 10,
    },
    {
        id: 44,
        fullName: "Đỗ Khánh Ly",
        phone: "0917001122",
        email: "ly.do@example.com",
        role: "LEAD",
        status: "PENDING_CONTRACT",
        emailVerified: false,
        mustChangePassword: false,
        lastLoginAt: null,
        createdAt: "2026-05-20T09:45:00",
        personProfileId: 11,
    },
    {
        id: 45,
        fullName: "Hồ Nhật Nam",
        phone: "0935007788",
        email: "nam.ho@example.com",
        role: "LEAD",
        status: "ACTIVE",
        emailVerified: true,
        mustChangePassword: false,
        lastLoginAt: "2026-05-21T07:58:00",
        createdAt: "2026-05-19T13:10:00",
        personProfileId: 12,
    },
    {
        id: 46,
        fullName: "Ngô Bảo Châu",
        phone: "0978123456",
        email: "chau.ngo@example.com",
        role: "TENANT",
        status: "DISABLED",
        emailVerified: true,
        mustChangePassword: false,
        lastLoginAt: "2026-05-11T10:25:00",
        createdAt: "2026-03-28T15:00:00",
        deletedAt: "2026-05-22T16:00:00",
        personProfileId: 13,
    },
];

function getToken() {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("token") || "";
}

function buildQueryParams({page, size, status, role, search}) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        includeDeleted: "true",
    });

    if (status !== "all") params.set("status", status);
    if (role !== "all") params.set("role", role);
    if (search.trim()) params.set("search", search.trim());

    return params.toString();
}

async function parseApiResponse(response) {
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.code !== 0) {
        const error = new Error(payload.message || payload.details || "Không thể xử lý yêu cầu.");
        error.isApiError = true;
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    return payload.data ?? payload;
}

function isNetworkError(error) {
    return !error?.isApiError;
}

function normalizeRole(role) {
    return String(role || "LEAD").toUpperCase();
}

function normalizeStatus(status) {
    return String(status || "PENDING_CONTRACT").toUpperCase();
}

function getFullName(user) {
    return (
        user.fullName ||
        user.full_name ||
        user.name ||
        user.personName ||
        user.profile?.fullName ||
        user.profile?.full_name ||
        user.email ||
        user.phone ||
        "Chưa cập nhật"
    );
}

function toUserViewModel(user) {
    const role = normalizeRole(user.role);
    const status = normalizeStatus(user.status);

    return {
        id: user.id,
        fullName: getFullName(user),
        phone: user.phone || "",
        email: user.email || "",
        role,
        status,
        emailVerified: Boolean(user.emailVerified ?? user.email_verified),
        mustChangePassword: Boolean(user.mustChangePassword ?? user.must_change_password),
        lastLoginAt: user.lastLoginAt || user.last_login_at || null,
        createdAt: user.createdAt || user.created_at || null,
        updatedAt: user.updatedAt || user.updated_at || null,
        deletedAt: user.deletedAt || user.deleted_at || null,
        personProfileId: user.personProfileId || user.person_profile_id || null,
    };
}

function filterMockUsers({status, role, search}) {
    const normalizedSearch = search.trim().toLowerCase();

    return mockUsers.map(toUserViewModel).filter((user) => {
        const matchesRole = role === "all" || user.role === role;
        const matchesStatus = status === "all" || user.status === status;
        const matchesSearch =
            !normalizedSearch ||
            user.fullName.toLowerCase().includes(normalizedSearch) ||
            user.phone.toLowerCase().includes(normalizedSearch) ||
            user.email.toLowerCase().includes(normalizedSearch);

        return matchesRole && matchesStatus && matchesSearch;
    });
}

function getIdentifier(user) {
    const meta = roleMeta[user.role] || roleMeta.LEAD;
    return `${meta.idPrefix}-${String(user.id).padStart(3, "0")}`;
}

function formatDateTime(value) {
    if (!value) return "Chưa đăng nhập";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("vi-VN");
}

function getInitials(name) {
    return String(name || "U")
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function RoleBadge({role}) {
    const meta = roleMeta[role] || roleMeta.LEAD;

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${meta.className}`}>
            {meta.label}
    </span>
    );
}

function StatusBadge({status, mustChangePassword}) {
    const meta = statusMeta[status] || statusMeta.PENDING_CONTRACT;

    return (
        <div className="flex flex-col items-start gap-1.5">
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${meta.className}`}>
        {meta.label}
      </span>
        </div>
    );
}

function MetricCard({icon: Icon, label, value, tone = "slate"}) {
    const tones = {
        slate: "bg-slate-100 text-slate-700",
        emerald: "bg-emerald-50 text-emerald-700",
        amber: "bg-amber-50 text-amber-700",
        rose: "bg-rose-50 text-rose-700",
    };

    return (
        <article
            className="flex min-h-[96px] items-center gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5"/>
      </span>
            <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-[0.06em] text-[#45474c]">{label}</p>
                <p className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#091426]">{value}</p>
            </div>
        </article>
    );
}

function InlineAlert({tone = "error", children}) {
    const styles = {
        error: "border-rose-100 bg-rose-50 text-rose-700",
        success: "border-emerald-100 bg-emerald-50 text-emerald-700",
        info: "border-blue-100 bg-blue-50 text-blue-700",
    };
    const Icon = tone === "success" ? CheckCircle2 : AlertCircle;

    return (
        <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${styles[tone]}`}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0"/>
            <span>{children}</span>
        </div>
    );
}

function Modal({title, children, footer, onClose}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#091426]/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-modal-title"
        >
            <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4">
                    <h2 id="account-modal-title" className="text-lg font-bold text-[#091426]">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Đóng"
                        className="rounded-md p-2 text-[#505f76] hover:bg-[#f2f4f6]"
                    >
                        <X className="h-5 w-5"/>
                    </button>
                </div>
                <div className="p-6">{children}</div>
                {footer && <div className="border-t border-[#e2e8f0] px-6 py-4">{footer}</div>}
            </div>
        </div>
    );
}

export default function AccountsPage() {
    const {user: currentUser} = useAuth();
    const [users, setUsers] = useState([]);
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isUsingMock, setIsUsingMock] = useState(false);
    const [pageNotice, setPageNotice] = useState("");
    const [pageError, setPageError] = useState("");
    const [totalElements, setTotalElements] = useState(0);
    const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE);
    const [totalPages, setTotalPages] = useState(1);
    const [lockTarget, setLockTarget] = useState(null);
    const [lockReason, setLockReason] = useState("");
    const [lockError, setLockError] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [roleTarget, setRoleTarget] = useState(null);
    const [selectedRole, setSelectedRole] = useState("");
    const [roleError, setRoleError] = useState("");
    const [isCreateStaffOpen, setIsCreateStaffOpen] = useState(false);
    const [staffForm, setStaffForm] = useState({
        fullName: "",
        phone: "",
        email: "",
        role: "MANAGER",
    });
    const [staffFormErrors, setStaffFormErrors] = useState({});
    const [isMutating, setIsMutating] = useState(false);

    const canChangeRole = ["owner", "manager"].includes(currentUser?.role);
    const canCreateStaff = currentUser?.role === "owner";

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setPageError("");

        try {
            const response = await fetchUsersApi({
                page: DEFAULT_PAGE,
                size: DEFAULT_SIZE,
                status: statusFilter,
                role: roleFilter,
                search,
            });
            const content = Array.isArray(response.data) ? response.data : [];
            const nextUsers = content.map(toUserViewModel);
            console.log(nextUsers);
            setUsers(nextUsers);
            setTotalElements(response.totalElements ?? nextUsers.length);
            setCurrentPage(response.currentPage ?? DEFAULT_PAGE);
            setTotalPages(response.totalPages ?? 1);
            setIsUsingMock(false);
        } catch (error) {
            if (isNetworkError(error)) {
                const fallbackUsers = filterMockUsers({
                    status: statusFilter,
                    role: roleFilter,
                    search,
                });

                setUsers(fallbackUsers);
                setTotalElements(fallbackUsers.length);
                setCurrentPage(DEFAULT_PAGE);
                setTotalPages(1);
                setIsUsingMock(true);
            } else {
                setUsers([]);
                setTotalElements(0);
                setCurrentPage(DEFAULT_PAGE);
                setTotalPages(1);
                setIsUsingMock(false);
                setPageError(error.message || "Không thể tải danh sách tài khoản.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [roleFilter, search, statusFilter]);

    useEffect(() => {
        const task = window.setTimeout(() => {
            fetchUsers();
        }, 0);

        return () => window.clearTimeout(task);
    }, [fetchUsers]);

    const allKnownUsers = users;

    const metrics = useMemo(() => {
        return {
            totalStaff: allKnownUsers.filter((account) => staffRoles.includes(account.role)).length,
            active: allKnownUsers.filter((account) => account.status === "ACTIVE").length,
            pending: allKnownUsers.filter(
                (account) => account.status === "PENDING_CONTRACT" || account.mustChangePassword,
            ).length,
            disabled: allKnownUsers.filter((account) => account.status === "DISABLED").length,
        };
    }, [allKnownUsers]);

    function updateUserLocally(userId, patch) {
        setUsers((currentUsers) =>
            currentUsers.map((account) => (account.id === userId ? {...account, ...patch} : account)),
        );
    }

    function openStatusDialog(account) {
        setPageNotice("");
        setPageError("");
        setLockError("");
        setLockReason("");
        setLockTarget(account);
    }

    async function submitStatusChange() {
        if (!lockTarget) return;

        const nextStatus = lockTarget.status === "DISABLED" ? "ACTIVE" : "DISABLED";

        if (nextStatus === "DISABLED" && !lockReason.trim()) {
            setLockError("Vui lòng nhập lý do khóa tài khoản.");
            return;
        }

        setIsMutating(true);

        try {
            const body = {
                status: nextStatus,
                reason: nextStatus === "DISABLED" ? lockReason.trim() : "Mở khóa tài khoản",
            };

            if (!isUsingMock) {
                await updateUserStatus(lockTarget.id, body);
            }

            updateUserLocally(lockTarget.id, {
                status: nextStatus,
            });
            setPageNotice(
                nextStatus === "DISABLED"
                    ? `Đã khóa tài khoản ${lockTarget.fullName}.`
                    : `Đã mở khóa tài khoản ${lockTarget.fullName}.`,
            );
            setLockTarget(null);
        } catch (error) {
            if (isNetworkError(error)) {
                updateUserLocally(lockTarget.id, {status: nextStatus});
                setPageNotice("Backend chưa phản hồi, thao tác đã được mô phỏng trên dữ liệu dự phòng.");
                setLockTarget(null);
            } else {
                setLockError(error.message || "Không thể cập nhật trạng thái tài khoản.");
            }
        } finally {
            setIsMutating(false);
        }
    }

    function openRoleDialog(account) {
        setPageNotice("");
        setPageError("");
        setRoleError("");
        setRoleTarget(account);
        setSelectedRole(account.role);
    }

    async function submitRoleChange() {
        if (!roleTarget) return;

        if (!selectedRole) {
            setRoleError("Vui lòng chọn vai trò mới.");
            return;
        }

        setIsMutating(true);

        try {
            if (!isUsingMock) {
                await updateUserRole(roleTarget.id, selectedRole);
            }

            updateUserLocally(roleTarget.id, {role: selectedRole});
            setPageNotice(`Đã cập nhật vai trò của ${roleTarget.fullName} thành ${roleMeta[selectedRole]?.label}.`);
            setRoleTarget(null);
        } catch (error) {
            if (isNetworkError(error)) {
                updateUserLocally(roleTarget.id, {role: selectedRole});
                setPageNotice("Backend chưa phản hồi, vai trò đã được mô phỏng trên dữ liệu dự phòng.");
                setRoleTarget(null);
            } else {
                setRoleError(error.message || "Không thể cập nhật vai trò tài khoản.");
            }
        } finally {
            setIsMutating(false);
        }
    }

    function openDeleteDialog(account) {
        setPageNotice("");
        setPageError("");
        setDeleteTarget(account);
    }

    async function submitSoftDelete() {
        if (!deleteTarget) return;

        setIsMutating(true);

        try {
            let deletedAt = new Date().toISOString();

            if (!isUsingMock) {
                const data = await deleteUser(deleteTarget.id);
                deletedAt = data.deletedAt || deletedAt;
            }

            updateUserLocally(deleteTarget.id, {deletedAt});
            setPageNotice(`Đã xóa mềm tài khoản ${deleteTarget.fullName}.`);
            setDeleteTarget(null);
        } catch (error) {
            if (isNetworkError(error)) {
                updateUserLocally(deleteTarget.id, {deletedAt: new Date().toISOString()});
                setPageNotice("Backend chưa phản hồi, thao tác xóa mềm đã được mô phỏng trên dữ liệu dự phòng.");
                setDeleteTarget(null);
            } else {
                setPageError(error.message || "Không thể xóa mềm tài khoản.");
            }
        } finally {
            setIsMutating(false);
        }
    }

    async function submitRestore(account) {
        setPageNotice("");
        setPageError("");
        setIsMutating(true);

        try {
            if (!isUsingMock) {
                await restoreUser(account.id);
            }

            updateUserLocally(account.id, {deletedAt: null});
            setPageNotice(`Đã khôi phục tài khoản ${account.fullName}.`);
        } catch (error) {
            if (error.status === 409) {
                setPageError(
                    "Lỗi trùng lặp: Số điện thoại hoặc Email này đang thuộc về một tài khoản đang hoạt động khác, không thể khôi phục!",
                );
            } else if (isNetworkError(error)) {
                updateUserLocally(account.id, {deletedAt: null});
                setPageNotice("Backend chưa phản hồi, thao tác khôi phục đã được mô phỏng trên dữ liệu dự phòng.");
            } else {
                setPageError(error.message || "Không thể khôi phục tài khoản.");
            }
        } finally {
            setIsMutating(false);
        }
    }

    function openCreateStaffModal() {
        setPageNotice("");
        setPageError("");
        setStaffForm({fullName: "", phone: "", email: "", role: "MANAGER"});
        setStaffFormErrors({});
        setIsCreateStaffOpen(true);
    }

    function updateStaffForm(field, value) {
        setStaffForm((currentForm) => ({...currentForm, [field]: value}));
        setStaffFormErrors((currentErrors) => ({...currentErrors, [field]: ""}));
    }

    function validateStaffForm() {
        const nextErrors = {};

        if (!staffForm.fullName.trim()) {
            nextErrors.fullName = "Vui lòng nhập họ và tên";
        }

        if (!staffForm.phone.trim()) {
            nextErrors.phone = "Vui lòng nhập số điện thoại";
        }

        if (!staffForm.email.trim()) {
            nextErrors.email = "Vui lòng nhập email";
        }

        if (!staffForm.role) {
            nextErrors.role = "Vui lòng chọn vai trò";
        }

        setStaffFormErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    }

    async function submitCreateStaff(event) {
        event.preventDefault();

        if (!validateStaffForm()) return;

        setIsMutating(true);
        setPageError("");

        try {
            // The response includes temporaryPassword once; keep it in the success notice.
            const createdStaff = await createStaffAccount({
                fullName: staffForm.fullName.trim(),
                phone: staffForm.phone.trim(),
                email: staffForm.email.trim(),
                role: staffForm.role,
            });
            const normalizedStaff = toUserViewModel(createdStaff);

            setUsers((currentUsers) => [normalizedStaff, ...currentUsers]);
            setTotalElements((currentTotal) => currentTotal + 1);
            setPageNotice(
                `Đã tạo tài khoản ${roleMeta[normalizedStaff.role]?.label || normalizedStaff.role}. Mật khẩu tạm thời: ${createdStaff.temporaryPassword}`,
            );
            setIsCreateStaffOpen(false);
        } catch (error) {
            if (error.code === 1002) {
                setStaffFormErrors((currentErrors) => ({
                    ...currentErrors,
                    email: "Email này đã được sử dụng bởi một tài khoản khác",
                }));
            } else if (error.code === 1005) {
                setPageError("Bạn không có quyền thực hiện chức năng này");
                setIsCreateStaffOpen(false);
            } else {
                setPageError(error.message || "Không thể tạo tài khoản nhân sự.");
            }
        } finally {
            setIsMutating(false);
        }
    }

    return (
        <>
            <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#505f76]">Admin Dashboard</p>
                    <h1 className="mt-2 text-2xl font-bold tracking-[-0.01em] text-[#191c1e]">Quản lý tài khoản hệ
                        thống</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#45474c]">
                        Theo dõi và quản trị toàn bộ tài khoản nhân sự, khách thuê và khách tìm hiểu trong hệ thống nhà
                        trọ.
                    </p>
                </div>
                {canCreateStaff && (
                    <button
                        type="button"
                        onClick={openCreateStaffModal}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#16253a]"
                    >
                        <UserPlus className="h-4 w-4"/>
                        Tạo nhân sự
                    </button>
                )}
            </section>

            <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
                <MetricCard icon={UsersRound} label="Tổng nhân sự" value={metrics.totalStaff}/>
                <MetricCard icon={ShieldCheck} label="Đang hoạt động" value={metrics.active} tone="emerald"/>
                <MetricCard icon={LockKeyhole} label="Đã khóa" value={metrics.disabled} tone="rose"/>
            </section>

            {(pageNotice || pageError || isUsingMock) && (
                <section className="grid gap-3">
                    {isUsingMock && (
                        <InlineAlert tone="info">
                            Backend chưa sẵn sàng, trang đang dùng dữ liệu giả lập và vẫn hỗ trợ lọc trực tiếp.
                            Nhéeeeeeeeeeeee
                        </InlineAlert>
                    )}
                    {pageNotice && <InlineAlert tone="success">{pageNotice}</InlineAlert>}
                    {pageError && <InlineAlert>{pageError}</InlineAlert>}
                </section>
            )}

            <section className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
                <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_240px_240px]">
                    <label className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"/>
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Tìm theo họ tên, số điện thoại hoặc email"
                            className="h-11 w-full rounded-lg border border-[#e2e8f0] bg-white pl-10 pr-3 text-sm font-semibold text-[#091426] outline-none placeholder:text-[#6b7280] focus:border-[#091426]"
                        />
                    </label>
                    <label className="relative">
                        <Filter
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"/>
                        <select
                            value={roleFilter}
                            onChange={(event) => setRoleFilter(event.target.value)}
                            className="h-11 w-full appearance-none rounded-lg border border-[#e2e8f0] bg-white pl-10 pr-3 text-sm font-bold text-[#091426] outline-none focus:border-[#091426]"
                        >
                            {roleOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="relative">
                        <Filter
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"/>
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            className="h-11 w-full appearance-none rounded-lg border border-[#e2e8f0] bg-white pl-10 pr-3 text-sm font-bold text-[#091426] outline-none focus:border-[#091426]"
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                </div>
            </section>

            <section
                className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
                <div className="flex items-center justify-between gap-4 border-b border-[#e2e8f0] px-5 py-4">
                    <div>
                        <h2 className="font-bold text-[#091426]">Danh sách tài khoản</h2>
                        <p className="mt-1 text-xs font-semibold text-[#6b7280]">
                            {totalElements} tài khoản phù hợp với bộ lọc hiện tại - Trang {currentPage}/{totalPages}
                        </p>
                    </div>
                    {isLoading && <Loader2 className="h-5 w-5 animate-spin text-[#091426]"/>}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1120px] text-left text-sm">
                        <thead className="bg-[#f7f9fb] text-xs font-bold uppercase tracking-[0.06em] text-[#505f76]">
                        <tr>
                            <th className="px-5 py-4">Tài khoản</th>
                            <th className="px-5 py-4">Loại tài khoản</th>
                            <th className="px-5 py-4">Số điện thoại</th>
                            <th className="px-5 py-4">Email</th>
                            <th className="px-5 py-4">Trạng thái</th>
                            <th className="px-5 py-4 text-right">Thao tác</th>
                        </tr>
                        </thead>
                        <tbody>
                        {users.map((account) => (
                            <tr
                                key={account.id}
                                className={`border-t border-[#e2e8f0] align-top ${account.deletedAt ? "bg-slate-50 opacity-70" : ""}`}
                            >
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                      <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d3e4fe] text-xs font-bold text-[#091426]">
                        {getInitials(account.fullName)}
                      </span>
                                        <div className="min-w-0">
                                            <p className="font-bold text-[#091426]">{account.fullName}</p>
                                            <p className="text-xs font-semibold text-[#6b7280]">{getIdentifier(account)}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-4"><RoleBadge role={account.role}/></td>
                                <td className="px-5 py-4 font-semibold text-[#45474c]">{account.phone || "Chưa cập nhật"}</td>
                                <td className="px-5 py-4 text-[#45474c]">{account.email || "Chưa cập nhật"}</td>
                                <td className="px-5 py-4">
                                    <StatusBadge status={account.status}
                                                 mustChangePassword={account.mustChangePassword}/>
                                    {account.deletedAt && (
                                        <span
                                            className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                        Đã xóa mềm
                      </span>
                                    )}
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex justify-end gap-2">
                                        {account.deletedAt ? (
                                            <button
                                                type="button"
                                                onClick={() => submitRestore(account)}
                                                disabled={isMutating}
                                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-100 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <RotateCcw className="h-4 w-4"/>
                                                Khôi phục
                                            </button>
                                        ) : (
                                            <>
                                                {canChangeRole && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openRoleDialog(account)}
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 text-blue-700 hover:bg-blue-50"
                                                        aria-label={`Cấp quyền cho ${account.fullName}`}
                                                        title="Cấp quyền"
                                                    >
                                                        <ShieldPlus className="h-4 w-4"/>
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => openStatusDialog(account)}
                                                    className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold ${account.status === "DISABLED"
                                                        ? "border border-emerald-100 text-emerald-700 hover:bg-emerald-50"
                                                        : "border border-rose-100 text-rose-700 hover:bg-rose-50"
                                                    }`}
                                                >
                                                    {account.status === "DISABLED" ? (
                                                        <UnlockKeyhole className="h-4 w-4"/>
                                                    ) : (
                                                        <LockKeyhole className="h-4 w-4"/>
                                                    )}
                                                    {account.status === "DISABLED" ? "Mở khóa" : "Khóa"}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!isLoading && users.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-5 py-10 text-center text-sm font-semibold text-[#6b7280]">
                                    Không có tài khoản phù hợp.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </section>

            {isCreateStaffOpen && (
                <Modal
                    title="Tạo tài khoản nhân sự"
                    onClose={() => setIsCreateStaffOpen(false)}
                    footer={
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setIsCreateStaffOpen(false)}
                                className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                form="create-staff-form"
                                disabled={isMutating}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white hover:bg-[#16253a] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isMutating && <Loader2 className="h-4 w-4 animate-spin"/>}
                                Tạo tài khoản
                            </button>
                        </div>
                    }
                >
                    <form id="create-staff-form" onSubmit={submitCreateStaff} className="grid gap-4">
                        <InlineAlert tone="info">
                            Hệ thống sẽ tạo mật khẩu tạm thời và chỉ hiển thị một lần sau khi tạo tài khoản thành công.
                        </InlineAlert>
                        <label className="grid gap-2">
                            <span className="text-sm font-bold text-[#091426]">Họ và tên</span>
                            <input
                                value={staffForm.fullName}
                                onChange={(event) => updateStaffForm("fullName", event.target.value)}
                                className={`h-11 rounded-lg border bg-white px-3 text-sm font-semibold text-[#091426] outline-none focus:border-[#091426] ${
                                    staffFormErrors.fullName ? "border-rose-300" : "border-[#c5c6cd]"
                                }`}
                                placeholder="Nguyễn Văn A"
                            />
                            {staffFormErrors.fullName && (
                                <span className="text-xs font-bold text-rose-600">{staffFormErrors.fullName}</span>
                            )}
                        </label>
                        <label className="grid gap-2">
                            <span className="text-sm font-bold text-[#091426]">Số điện thoại</span>
                            <input
                                value={staffForm.phone}
                                onChange={(event) => updateStaffForm("phone", event.target.value)}
                                className="h-11 rounded-lg border border-[#c5c6cd] bg-white px-3 text-sm font-semibold text-[#091426] outline-none focus:border-[#091426]"
                                placeholder="0902222222"
                            />
                            {staffFormErrors.phone &&
                                <span className="text-xs font-bold text-rose-600">{staffFormErrors.phone}</span>}
                        </label>
                        <label className="grid gap-2">
                            <span className="text-sm font-bold text-[#091426]">Email</span>
                            <input
                                value={staffForm.email}
                                onChange={(event) => updateStaffForm("email", event.target.value)}
                                className={`h-11 rounded-lg border bg-white px-3 text-sm font-semibold text-[#091426] outline-none focus:border-[#091426] ${staffFormErrors.email ? "border-rose-300" : "border-[#c5c6cd]"
                                }`}
                                placeholder="manager@example.com"
                            />
                            {staffFormErrors.email &&
                                <span className="text-xs font-bold text-rose-600">{staffFormErrors.email}</span>}
                        </label>
                        <label className="grid gap-2">
                            <span className="text-sm font-bold text-[#091426]">Vai trò</span>
                            <select
                                value={staffForm.role}
                                onChange={(event) => updateStaffForm("role", event.target.value)}
                                className="h-11 rounded-lg border border-[#c5c6cd] bg-white px-3 text-sm font-semibold text-[#091426] outline-none focus:border-[#091426]"
                            >
                                {staffCreationRoleOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            {staffFormErrors.role &&
                                <span className="text-xs font-bold text-rose-600">{staffFormErrors.role}</span>}
                        </label>
                    </form>
                </Modal>
            )}

            {deleteTarget && (
                <Modal
                    title={`Xóa mềm tài khoản ${deleteTarget.fullName}`}
                    onClose={() => setDeleteTarget(null)}
                    footer={
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={submitSoftDelete}
                                disabled={isMutating}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 text-sm font-bold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isMutating && <Loader2 className="h-4 w-4 animate-spin"/>}
                                Xác nhận xóa mềm
                            </button>
                        </div>
                    }
                >
                    <div className="grid gap-4">
                        <div className="rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] p-4">
                            <p className="text-sm font-bold text-[#091426]">{deleteTarget.fullName}</p>
                            <p className="mt-1 text-sm text-[#45474c]">{deleteTarget.email || deleteTarget.phone}</p>
                        </div>
                        <InlineAlert tone="info">
                            Tài khoản sẽ được đánh dấu xóa mềm bằng trường deletedAt, không bị xóa khỏi bảng dữ liệu.
                        </InlineAlert>
                    </div>
                </Modal>
            )}

            {lockTarget && (
                <Modal
                    title={`${lockTarget.status === "DISABLED" ? "Mở khóa" : "Khóa"} tài khoản ${lockTarget.fullName}`}
                    onClose={() => setLockTarget(null)}
                    footer={
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setLockTarget(null)}
                                className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={submitStatusChange}
                                disabled={isMutating}
                                className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70 ${lockTarget.status === "DISABLED" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                                }`}
                            >
                                {isMutating && <Loader2 className="h-4 w-4 animate-spin"/>}
                                Xác nhận
                            </button>
                        </div>
                    }
                >
                    <div className="grid gap-4">
                        <div className="rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] p-4">
                            <p className="text-sm font-bold text-[#091426]">{lockTarget.fullName}</p>
                            <p className="mt-1 text-sm text-[#45474c]">{roleMeta[lockTarget.role]?.label} - {lockTarget.email}</p>
                        </div>
                        {lockTarget.status !== "DISABLED" && (
                            <label className="grid gap-2">
                                <span className="text-sm font-bold text-[#091426]">Lý do khóa</span>
                                <textarea
                                    value={lockReason}
                                    onChange={(event) => {
                                        setLockReason(event.target.value);
                                        setLockError("");
                                    }}
                                    rows={4}
                                    className="min-h-28 resize-none rounded-lg border border-[#c5c6cd] bg-white px-3 py-3 text-sm font-semibold text-[#091426] outline-none focus:border-[#091426]"
                                    placeholder="Nhập lý do khóa tài khoản"
                                />
                            </label>
                        )}
                        {lockTarget.status === "DISABLED" && (
                            <InlineAlert tone="info">
                                Tài khoản sẽ được chuyển về trạng thái Đang hoạt động.
                            </InlineAlert>
                        )}
                        {lockError && <InlineAlert>{lockError}</InlineAlert>}
                    </div>
                </Modal>
            )}

            {roleTarget && (
                <Modal
                    title={`Cấp quyền cho ${roleTarget.fullName}`}
                    onClose={() => setRoleTarget(null)}
                    footer={
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setRoleTarget(null)}
                                className="h-10 rounded-lg border border-[#c5c6cd] px-4 text-sm font-bold text-[#091426]"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={submitRoleChange}
                                disabled={isMutating}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#091426] px-4 text-sm font-bold text-white hover:bg-[#16253a] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isMutating && <Loader2 className="h-4 w-4 animate-spin"/>}
                                Xác nhận cấp quyền
                            </button>
                        </div>
                    }
                >
                    <div className="grid gap-4">
                        <div className="rounded-lg border border-[#e2e8f0] bg-[#f7f9fb] p-4">
                            <p className="text-sm font-bold text-[#091426]">{roleTarget.fullName}</p>
                            <p className="mt-1 text-sm text-[#45474c]">{roleTarget.email || roleTarget.phone}</p>
                        </div>
                        <label className="grid gap-2">
                            <span className="text-sm font-bold text-[#091426]">Vai trò mới</span>
                            <span className="relative">
                <KeyRound
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"/>
                <select
                    value={selectedRole}
                    onChange={(event) => {
                        setSelectedRole(event.target.value);
                        setRoleError("");
                    }}
                    className="h-11 w-full appearance-none rounded-lg border border-[#c5c6cd] bg-white pl-10 pr-3 text-sm font-semibold text-[#091426] outline-none focus:border-[#091426]"
                >
                  {assignableRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </span>
                        </label>
                        {roleError && <InlineAlert>{roleError}</InlineAlert>}
                    </div>
                </Modal>
            )}
        </>
    );
}
