"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Armchair,
  Bell,
  BellRing,
  Building2,
  CheckCheck,
  ChevronDown,
  FileCheck2,
  FileText,
  Gauge,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  ReceiptText,
  Settings,
  Sun,
  User,
  UserCog,
  UserRoundCog,
  UserSearch,
  UsersRound,
  WalletCards,
  Wrench,
  X,
  Inbox,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthProvider, useAuth } from "./_contexts/AuthContext";
import { DashboardLayoutProvider } from "./_contexts/DashboardLayoutContext";
import { SidebarProvider, useSidebar } from "./_contexts/SidebarContext";
import { ThemeProvider, useTheme } from "./_contexts/ThemeContext";
import { PermissionGuard } from "./_components/PermissionGuard";
import { ProtectedRoute } from "./_components/ProtectedRoute";
import { ROLE_LABELS, ROLES, SECTION_PERMISSIONS, canAccessRole } from "./_lib/rbac";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notificationsService";

const currentContractYear = new Date().getFullYear();
const contractYearChildren = [
  { path: "/dashboard/contract-management", label: "Tất cả năm" },
  ...[currentContractYear, currentContractYear - 1].map((year) => ({
    path: `/dashboard/contract-management?year=${year}`,
    label: `Năm ${year}`,
  })),
];

const navigation = [
  {
    path: "/dashboard",
    label: "Tổng quan",
    icon: LayoutDashboard,
    permissionKey: "dashboard",
  },
  {
    path: "/dashboard/rooms",
    label: "Quản lý phòng và tầng",
    icon: Building2,
    permissionKey: "rooms",
  },
  {
    path: "/dashboard/facilities",
    label: "Quản lý cơ sở",
    icon: Armchair,
    permissionKey: "facilities",
  },
  {
    path: "/dashboard/tenants",
    label: "Quản lý hồ sơ",
    icon: UsersRound,
    permissionKey: "tenants",
  },
  {
    path: "/dashboard/viewing-customers",
    label: "Khách xem phòng",
    icon: UserSearch,
    permissionKey: "viewingCustomers",
  },
  {
    path: "/dashboard/accounts",
    label: "Quản lý tài khoản",
    icon: UserRoundCog,
    permissionKey: "accounts",
    children: [
      {
        path: "/dashboard/accounts/tenants",
        label: "Tài khoản khách thuê",
        permissionKey: "accounts",
      },
      {
        path: "/dashboard/accounts/staff",
        label: "Tài khoản nhân viên",
        permissionKey: "accounts",
      },
    ],
  },
  {
    path: "/dashboard/meter-readings",
    label: "Quản lý điện nước",
    icon: Gauge,
    permissionKey: "meterReadings",
  },
  {
    path: "/dashboard/maintenance",
    label: "Sự cố & Bảo trì",
    icon: Wrench,
    permissionKey: "maintenance",
  },
  {
    path: "/dashboard/billing",
    label: "Hóa đơn & Thu tiền",
    icon: ReceiptText,
    permissionKey: "billing",
  },
  {
    path: "/dashboard/debt",
    label: "Quản lý công nợ",
    icon: WalletCards,
    permissionKey: "debt",
  },
  {
    path: "/dashboard/deposits",
    label: "Danh sách cọc",
    icon: FileCheck2,
    permissionKey: "deposits",
  },
  {
    path: "/dashboard/contract-management",
    label: "Quản lý hợp đồng",
    icon: FileText,
    permissionKey: "contract",
    children: contractYearChildren,
  },
  {
    path: "/dashboard/requests",
    label: "Quản lý yêu cầu",
    icon: Inbox,
    permissionKey: "requests",
  },
  {
    path: "/dashboard/notification-templates",
    label: "Quản lý thông báo",
    icon: BellRing,
    permissionKey: "notificationTemplates",
  },
  {
    path: "/dashboard/finance",
    label: "Báo cáo doanh thu",
    icon: WalletCards,
    permissionKey: "finance",
  },
  {
    path: "/dashboard/settings",
    label: "Cấu hình hệ thống",
    icon: Settings,
    permissionKey: "settings",
  },
];

const specialRoutePermissions = [
  {
    prefix: "/dashboard/profile",
    permissionKey: "dashboard",
    navigationPath: "/dashboard",
  },
  {
    prefix: "/dashboard/maintenance-details/test",
    permissionKey: "dashboard",
    navigationPath: "/dashboard",
  },
  {
    prefix: "/dashboard/maintenance-details",
    permissionKey: "maintenance",
    navigationPath: "/dashboard/maintenance",
  },
];

function getAllowedRoles(item) {
  return SECTION_PERMISSIONS[item.permissionKey] || [];
}

function getVisibleNavigation(role) {
  if (role !== ROLES.OWNER) return navigation;
  return navigation.filter((item) => item.path !== "/dashboard/rooms");
}

function isOwnerRoomsRoute(role, pathname, propertyId) {
  return (
    role === ROLES.OWNER &&
    !propertyId &&
    (pathname === "/dashboard/rooms" ||
      pathname?.startsWith("/dashboard/rooms/"))
  );
}

function isNavigationPathActive(pathname, path) {
  if (path === "/dashboard") {
    return pathname === path;
  }

  return pathname === path || pathname?.startsWith(`${path}/`);
}

function getNavigationItemForPath(pathname) {
  const specialRoute = specialRoutePermissions.find((item) =>
    pathname?.startsWith(item.prefix),
  );
  if (specialRoute) {
    return navigation.find((item) => item.path === specialRoute.navigationPath);
  }

  return navigation
    .filter((item) => isNavigationPathActive(pathname, item.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
}

function getPermissionKeyForPath(pathname) {
  const specialRoute = specialRoutePermissions.find((item) =>
    pathname?.startsWith(item.prefix),
  );
  if (specialRoute) {
    return specialRoute.permissionKey;
  }

  return getNavigationItemForPath(pathname)?.permissionKey || "";
}

function getFirstAllowedPath(role) {
  const item = getVisibleNavigation(role).find((navItem) =>
    canAccessRole(role, getAllowedRoles(navItem)),
  );
  return item?.children?.[0]?.path || item?.path || "/dashboard";
}

function getInitials(name) {
  return String(name || "A")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatNotificationTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function notificationHref(notification) {
  const eventType = String(notification?.eventType || "").toUpperCase();
  const targetType = String(notification?.targetType || "").toUpperCase();

  if (eventType === "TENANT_PROFILE_ACCESS_REQUESTED" || targetType === "CHANGE_REQUEST") {
    return "/dashboard/requests";
  }
  if (
    eventType === "TENANT_PROFILE_ACCESS_APPROVED" ||
    eventType === "TENANT_PROFILE_ACCESS_REJECTED" ||
    targetType === "TENANT_PROFILE"
  ) {
    return "/dashboard/tenants";
  }
  return "/dashboard/requests";
}

function UserAvatar({ user, size = "md", className = "" }) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-sm",
  };
  const sizeClass = sizes[size] || sizes.md;
  const label = user?.fullName || user?.name || user?.email || "User";

  if (user?.avatarUrl) {
    return (
      <span
        aria-label={label}
        role="img"
        className={`${sizeClass} shrink-0 overflow-hidden rounded-full bg-gray-100 bg-cover bg-center dark:bg-gray-800 ${className}`}
        style={{ backgroundImage: `url("${user.avatarUrl}")` }}
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-gray-100 font-semibold text-slate-700 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 ${sizeClass} ${className}`}
    >
      {getInitials(label)}
    </span>
  );
}

function UserMenu({ user, onLogout, isLoggingOut }) {
  const displayName = user?.fullName || user?.name || user?.email || "User";
  const displayEmail =
    user?.email || user?.phone || ROLE_LABELS[user?.role] || "Account";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center text-slate-700 outline-none transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-[#1e40af]/20 dark:text-slate-400 dark:hover:text-white"
        >
          <span className="ml-3 mr-1 hidden max-w-32 truncate text-sm font-medium lg:block">
            {displayName}
          </span>
          <ChevronDown className="hidden h-5 w-5 text-slate-500 transition-transform dark:text-slate-400 lg:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={17}
        className="flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)] dark:border-white/10 dark:bg-[#0f172a]"
      >
        <div className="px-1 pb-3">
          <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-300">
            {displayName}
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
            {displayEmail}
          </span>
        </div>

        <div className="flex flex-col gap-1 border-y border-gray-200 py-3 dark:border-white/10">
          <DropdownMenuItem
            asChild
            className="rounded-lg p-0 focus:bg-transparent"
          >
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-300"
            >
              <User className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              Chỉnh sửa hồ sơ
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className="rounded-lg p-0 focus:bg-transparent"
          >
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-300"
            >
              <UserCog className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              Tùy chọn cá nhân
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="hidden" />
        <DropdownMenuItem
          disabled={isLoggingOut}
          onClick={onLogout}
          className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-gray-100 hover:text-slate-900 focus:bg-gray-100 focus:text-slate-900 disabled:pointer-events-none disabled:opacity-60 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-300 dark:focus:bg-white/5 dark:focus:text-slate-300"
        >
          {isLoggingOut ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-500 dark:text-slate-400" />
          ) : (
            <LogOut className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          )}
          <span>{isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AccessDeniedPage() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#0f172a]">
      <div className="flex max-w-2xl items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 dark:bg-rose-500/10 dark:text-rose-300">
          <X className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Không có quyền truy cập
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Man hinh nay dang bi an theo phan quyen hien tai. Vui long chon chuc
            nang phu hop voi vai tro cua ban.
          </p>
        </div>
      </div>
    </section>
  );
}

function Sidebar({ isOpen, onClose, role }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const showText = isExpanded || isHovered || isMobileOpen;
  const [openGroups, setOpenGroups] = useState({});
  const queryString = searchParams.toString();
  const currentHref = queryString ? `${pathname}?${queryString}` : pathname;
  const visibleNavigation = useMemo(() => getVisibleNavigation(role), [role]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen shrink-0 flex-col border-r border-gray-200 bg-white px-5 text-slate-900 transition-all duration-300 ease-in-out dark:border-white/10 dark:bg-[#0f172a] dark:text-white lg:sticky lg:translate-x-0 ${
          showText ? "w-[290px]" : "w-[90px]"
        } ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`flex py-8 ${showText ? "justify-between" : "justify-center"}`}
        >
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-[#1e40af] text-white shadow-sm">
              <Home className="h-4 w-4" />
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e40af] to-[#1e40af] text-white shadow-md">
                <svg
                  viewBox="0 0 64 64"
                  className="h-7 w-7"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M14 31L32 16L50 31"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 29V49H44V29"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M28 49V38H36V49"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </span>
            {showText && (
              <span className="min-w-0">
                <span className="block truncate text-lg font-semibold leading-6 text-slate-900 dark:text-white">
                  Hai Dang
                </span>
                <span className="block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                  Boarding house management
                </span>
              </span>
            )}
          </Link>
          {showText && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-gray-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-300 lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
          <nav className="mb-6">
            <h2
              className={`mb-4 flex text-xs uppercase leading-5 text-slate-400 dark:text-slate-500 ${
                showText ? "justify-start" : "justify-center"
              }`}
            >
              {showText ? "Menu" : <MoreHorizontal className="h-5 w-5" />}
            </h2>
            <ul className="flex flex-col gap-4">
              {visibleNavigation.map((item) => {
                const Icon = item.icon;
                const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                const isActive =
                  isNavigationPathActive(pathname, item.path) ||
                  item.children?.some((child) =>
                    isNavigationPathActive(pathname, child.path),
                  );
                const isGroupOpen =
                  showText && (isActive || openGroups[item.path]);
                const primaryHref = item.children?.[0]?.path || item.path;
                const itemClasses = `group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  showText ? "justify-start" : "justify-center"
                } ${
                  isActive
                    ? "bg-[#ecf3ff] text-[#465fff] dark:bg-[#465fff]/[0.12] dark:text-[#9cb9ff]"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-gray-300"
                }`;
                const iconClasses = `h-5 w-5 shrink-0 ${
                  isActive
                    ? "text-[#465fff] dark:text-[#9cb9ff]"
                    : "text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300"
                }`;

                return (
                  <PermissionGuard
                    key={item.path}
                    allowedRoles={getAllowedRoles(item)}
                  >
                    <li>
                      {hasChildren && showText ? (
                        <button
                          type="button"
                          onClick={() =>
                            setOpenGroups((current) => ({
                              ...current,
                              [item.path]: !current[item.path],
                            }))
                          }
                          aria-expanded={isGroupOpen}
                          aria-current={isActive ? "page" : undefined}
                          className={itemClasses}
                        >
                          <Icon className={iconClasses} />
                          <span className="min-w-0 flex-1 truncate text-left">
                            {item.label}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 transition-transform ${
                              isGroupOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      ) : (
                        <Link
                          href={primaryHref}
                          onClick={onClose}
                          aria-current={isActive ? "page" : undefined}
                          title={showText ? undefined : item.label}
                          className={itemClasses}
                        >
                          <Icon className={iconClasses} />
                          {showText && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </Link>
                      )}

                      {hasChildren && isGroupOpen ? (
                        <ul className="mt-2 grid gap-1 border-l border-gray-200 pl-5 dark:border-gray-800">
                          {item.children.map((child) => {
                            const childActive =
                              child.path === currentHref ||
                              (!queryString &&
                                isNavigationPathActive(pathname, child.path));

                            return (
                              <li key={child.path}>
                                <Link
                                  href={child.path}
                                  onClick={onClose}
                                  aria-current={childActive ? "page" : undefined}
                                  className={`block rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                                    childActive
                                      ? "bg-[#ecf3ff] text-[#465fff] dark:bg-[#465fff]/[0.12] dark:text-[#9cb9ff]"
                                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </li>
                  </PermissionGuard>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}

function Topbar({
  search,
  onSearchChange,
  onToggleMobileMenu,
  onLogout,
  isLoggingOut,
}) {
  const { user } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { isMobileOpen, toggleSidebar } = useSidebar();
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [isNotificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const isDarkMode = theme === "dark";

  const loadNotifications = useCallback(
    async ({ silent = false } = {}) => {
      if (!user) return;
      if (!silent) setLoadingNotifications(true);
      setNotificationError("");

      try {
        const [list, count] = await Promise.all([
          fetchNotifications({ page: 0, size: 6 }),
          fetchUnreadNotificationCount(),
        ]);
        setNotifications(list.items || []);
        setUnreadCount(count);
      } catch (error) {
        console.error(error);
        setNotificationError("Không tải được thông báo.");
      } finally {
        if (!silent) setLoadingNotifications(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (!user) return undefined;

    const initialLoadId = window.setTimeout(() => loadNotifications(), 0);
    const intervalId = window.setInterval(
      () => loadNotifications({ silent: true }),
      60000,
    );
    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
    };
  }, [loadNotifications, user]);

  const handleNotificationClick = useCallback(
    async (notification) => {
      setNotificationOpen(false);
      if (!notification?.isRead && notification?.id) {
        setNotifications((items) =>
          items.map((item) =>
            item.id === notification.id ? { ...item, isRead: true } : item,
          ),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
        try {
          await markNotificationAsRead(notification.id);
        } catch (error) {
          console.error(error);
          loadNotifications({ silent: true });
        }
      }
      router.push(notificationHref(notification));
    },
    [loadNotifications, router],
  );

  const handleMarkAllNotificationsRead = useCallback(async () => {
    if (!unreadCount) return;
    setNotifications((items) =>
      items.map((item) => ({ ...item, isRead: true })),
    );
    setUnreadCount(0);
    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      console.error(error);
      loadNotifications({ silent: true });
    }
  }, [loadNotifications, unreadCount]);

  const handleToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      toggleSidebar();
      return;
    }

    onToggleMobileMenu();
  };

  return (
    <header className="sticky top-0 z-30 flex w-full border-b border-gray-200 bg-white dark:border-white/10 dark:bg-[#0f172a]">
      <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6">
        <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 dark:border-white/10 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            type="button"
            className="z-30 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-slate-500 hover:bg-gray-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 lg:h-11 lg:w-11"
            onClick={handleToggle}
            aria-label="Toggle sidebar"
          >
            {isMobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e40af] text-white">
              <Home className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Hai Dang
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setApplicationMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-white/5 lg:hidden"
            aria-label="Toggle application menu"
          >
            <MoreHorizontal className="h-6 w-6" />
          </button>

          {/*<div className="hidden lg:block">
            <form onSubmit={(event) => event.preventDefault()}>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                  <Search className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </span>
                <input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  type="text"
                  placeholder="Search or type command..."
                  className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-slate-800 shadow-[0_1px_2px_0_rgba(16,24,40,0.05)] outline-none placeholder:text-slate-400 focus:border-[#9cb9ff] focus:ring-4 focus:ring-[#1e40af]/10 dark:border-white/10 dark:bg-[#0f172a] dark:text-white dark:placeholder:text-slate-500 xl:w-[430px]"
                />
              </div>
            </form>
          </div>*/}
        </div>

        <div
          className={`${
            isApplicationMenuOpen ? "flex" : "hidden"
          } w-full items-center justify-between gap-4 px-5 py-4 shadow-[0_4px_8px_-2px_rgba(16,24,40,0.1),0_2px_4px_-2px_rgba(16,24,40,0.06)] lg:flex lg:justify-end lg:px-0 lg:shadow-none`}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                isDarkMode ? "Switch to light mode" : "Switch to dark mode"
              }
              className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-500 transition-colors hover:bg-gray-100 hover:text-slate-700 dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-300"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            {user ? (
              <>
                <DropdownMenu
                  modal={false}
                  open={isNotificationOpen}
                  onOpenChange={(open) => {
                    setNotificationOpen(open);
                    if (open) loadNotifications({ silent: notifications.length > 0 });
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Notifications"
                      className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                    >
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={12}
                    className="w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-gray-200 bg-white p-0 shadow-xl dark:border-gray-800 dark:bg-[#1a2231]"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          Thông báo
                        </p>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {unreadCount > 0 ? `${unreadCount} chưa đọc` : "Không có thông báo mới"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleMarkAllNotificationsRead}
                        disabled={!unreadCount}
                        title="Đánh dấu tất cả đã đọc"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="max-h-[360px] overflow-y-auto p-2">
                      {isLoadingNotifications && notifications.length === 0 ? (
                        <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm font-semibold text-gray-500 dark:text-gray-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tải thông báo...
                        </div>
                      ) : notificationError ? (
                        <div className="px-4 py-8 text-center text-sm font-semibold text-rose-600">
                          {notificationError}
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Inbox className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                          <p className="mt-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
                            Chưa có thông báo.
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <DropdownMenuItem
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className="cursor-pointer items-start gap-3 rounded-lg px-3 py-3 focus:bg-gray-50 dark:focus:bg-white/5"
                          >
                            <span
                              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                                notification.isRead ? "bg-gray-300 dark:bg-gray-600" : "bg-orange-500"
                              }`}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-gray-900 dark:text-white">
                                {notification.title || "Thông báo"}
                              </span>
                              <span className="mt-1 line-clamp-2 block text-xs leading-5 text-gray-500 dark:text-gray-400">
                                {notification.body || "Có cập nhật mới cần xem."}
                              </span>
                              {notification.createdAt && (
                                <span className="mt-2 block text-[11px] font-semibold text-gray-400">
                                  {formatNotificationTime(notification.createdAt)}
                                </span>
                              )}
                            </span>
                          </DropdownMenuItem>
                        ))
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="hidden h-8 items-center justify-center rounded-full bg-[#ecf3ff] px-3 text-xs font-semibold text-[#0F0F0F] dark:bg-[#465fff]/[0.12] dark:text-[#9cb9ff] sm:flex">
                  {ROLE_LABELS[user.role] || "Quản lý"}
                </span>
                <UserMenu
                  user={user}
                  onLogout={onLogout}
                  isLoggingOut={isLoggingOut}
                />
              </>
            ) : (
              <Link
                href="/login?redirect=%2Fdashboard%2Ffinance"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#465fff] px-4 text-sm font-bold text-white transition hover:bg-[#3641f5]"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function DashboardLayoutShell({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser, isLoadingUser, logout } = useAuth();
  const { isExpanded, isHovered, isMobileOpen, toggleMobileSidebar } =
    useSidebar();
  const [query, setQuery] = useState("");
  const [hasHydratedAuth, setHasHydratedAuth] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const effectiveRole = user?.role || "";
  const routePropertyId =
    searchParams.get("propertyId") || searchParams.get("facilityId") || "";

  const activeNavigationItem = getNavigationItemForPath(pathname);
  const permissionKey = getPermissionKeyForPath(pathname);
  const allowedRoles = permissionKey
    ? SECTION_PERMISSIONS[permissionKey] || []
    : [];
  const isPublicRoute = pathname?.startsWith("/dashboard/finance");
  const isAllowed = permissionKey
    ? canAccessRole(effectiveRole, allowedRoles)
    : false;

  useEffect(() => {
    let isActive = true;

    async function hydrateUser() {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("token")
          : "";

      if (!token) {
        if (isActive) setHasHydratedAuth(true);
        return;
      }

      try {
        await refreshUser(token);
      } catch {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("token");
          window.localStorage.removeItem("userRole");
        }
      } finally {
        if (isActive) setHasHydratedAuth(true);
      }
    }

    hydrateUser();

    return () => {
      isActive = false;
    };
  }, [refreshUser]);

  useEffect(() => {
    if (!hasHydratedAuth) return;
    if (!user && !isPublicRoute) {
      if (isLoggingOut) return;
      const redirect = pathname
        ? `?redirect=${encodeURIComponent(pathname)}`
        : "";
      router.replace(`/login${redirect}`);
      return;
    }
    if (isOwnerRoomsRoute(effectiveRole, pathname, routePropertyId)) {
      router.replace("/dashboard/facilities");
      return;
    }
    if (!activeNavigationItem) return;
    if (!isAllowed) {
      router.replace(getFirstAllowedPath(effectiveRole));
    }
  }, [
    activeNavigationItem,
    effectiveRole,
    hasHydratedAuth,
    isAllowed,
    isLoggingOut,
    isPublicRoute,
    pathname,
    routePropertyId,
    router,
    user,
  ]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      if (isMobileOpen) {
        toggleMobileSidebar();
      }
      router.replace("/login");
    }
  }, [isLoggingOut, isMobileOpen, logout, router, toggleMobileSidebar]);

  const contextValue = useMemo(
    () => ({
      activeRole: effectiveRole,
      query,
      setQuery,
    }),
    [effectiveRole, query],
  );

  return (
    <DashboardLayoutProvider value={contextValue}>
      <div className="dashboard-shell min-h-screen w-full overflow-x-hidden bg-gray-50 text-slate-900 dark:bg-[#020817] dark:text-white lg:flex">
        <Sidebar
          role={effectiveRole}
          isOpen={isMobileOpen}
          onClose={() => {
            if (isMobileOpen) {
              toggleMobileSidebar();
            }
          }}
        />
        <div className="min-w-0 flex flex-1 flex-col transition-all duration-300 ease-in-out">
          <Topbar
            search={query}
            onSearchChange={setQuery}
            onToggleMobileMenu={toggleMobileSidebar}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
          />
          <main className="dashboard-main !w-full !max-w-none min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
            <div className="dashboard-content flex w-full max-w-none min-w-0 flex-col items-stretch gap-8">
              {!hasHydratedAuth || isLoadingUser ? (
                <section className="flex min-h-[360px] items-center justify-center rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#0f172a]">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang kiểm tra quyền truy cập...
                  </span>
                </section>
              ) : isAllowed ? (
                children
              ) : (
                <AccessDeniedPage />
              )}
            </div>
          </main>
        </div>
      </div>
    </DashboardLayoutProvider>
  );
}

export function DashboardLayoutClient({ children }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SidebarProvider>
          <ProtectedRoute>
            <DashboardLayoutShell>{children}</DashboardLayoutShell>
          </ProtectedRoute>
        </SidebarProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default DashboardLayoutClient;
