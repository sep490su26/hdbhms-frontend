"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Armchair,
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
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
  Search,
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
import { ROLE_LABELS, SECTION_PERMISSIONS, canAccessRole } from "./_lib/rbac";

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
  },
  {
    path: "/dashboard/meter-readings",
    label: "Nhập số điện nước",
    icon: Gauge,
    permissionKey: "meterReadings",
  },
  {
    path: "/dashboard/maintenance",
    label: "Bảo trì",
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
    label: "Công nợ",
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
    path: "/dashboard/contract-template",
    label: "Hợp đồng cọc",
    icon: FileText,
    permissionKey: "contract",
  },
  {
    path: "/dashboard/requests",
    label: "Hộp thư yêu cầu",
    icon: Inbox,
    permissionKey: "requests",
  },
  {
    path: "/dashboard/finance",
    label: "Báo cáo tài chính",
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
  return (
    navigation.find((item) => canAccessRole(role, getAllowedRoles(item)))
      ?.path || "/dashboard"
  );
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
      className={`flex shrink-0 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 ${sizeClass} ${className}`}
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
          className="flex items-center text-gray-700 outline-none transition-colors hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-[#465fff]/20 dark:text-gray-400 dark:hover:text-white"
        >
          <span className="ml-3 mr-1 hidden max-w-32 truncate text-sm font-medium lg:block">
            {displayName}
          </span>
          <ChevronDown className="hidden h-5 w-5 text-gray-500 transition-transform lg:block dark:text-gray-400" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={17}
        className="flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_12px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)] dark:border-gray-800 dark:bg-[#1a2231]"
      >
        <div className="px-1 pb-3">
          <span className="block truncate text-sm font-medium text-gray-700 dark:text-gray-400">
            {displayName}
          </span>
          <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
            {displayEmail}
          </span>
        </div>

        <div className="flex flex-col gap-1 border-y border-gray-200 py-3 dark:border-gray-800">
          <DropdownMenuItem
            asChild
            className="rounded-lg p-0 focus:bg-transparent"
          >
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              Edit profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className="rounded-lg p-0 focus:bg-transparent"
          >
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <UserCog className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              Account settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className="rounded-lg p-0 focus:bg-transparent"
          >
            <Link
              href="/dashboard/requests"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <CircleHelp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              Support
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="hidden" />
        <DropdownMenuItem
          disabled={isLoggingOut}
          onClick={onLogout}
          className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700 focus:bg-gray-100 focus:text-gray-700 disabled:pointer-events-none disabled:opacity-60 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 dark:focus:bg-white/5 dark:focus:text-gray-300"
        >
          {isLoggingOut ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-500 dark:text-gray-400" />
          ) : (
            <LogOut className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
          <span>{isLoggingOut ? "Signing out..." : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AccessDeniedPage() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex max-w-2xl items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          <X className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Không có quyền truy cập
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
            Man hinh nay dang bi an theo phan quyen hien tai. Vui long chon chuc
            nang phu hop voi vai tro cua ban.
          </p>
        </div>
      </div>
    </section>
  );
}

function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const showText = isExpanded || isHovered || isMobileOpen;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen shrink-0 flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:sticky lg:translate-x-0 ${
          showText ? "w-[290px]" : "w-[90px]"
        } ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`flex py-8 ${showText ? "justify-between" : "justify-center"}`}
        >
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#465fff] text-white">
              <Home className="h-5 w-5" />
            </span>
            {showText && (
              <span className="min-w-0">
                <span className="block truncate text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                  Hai Dang
                </span>
                <span className="block truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                  Property management
                </span>
              </span>
            )}
          </Link>
          {showText && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
          <nav className="mb-6">
            <h2
              className={`mb-4 flex text-xs uppercase leading-5 text-gray-400 ${
                showText ? "justify-start" : "justify-center"
              }`}
            >
              {showText ? "Menu" : <MoreHorizontal className="h-5 w-5" />}
            </h2>
            <ul className="flex flex-col gap-4">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = isNavigationPathActive(pathname, item.path);

                return (
                  <PermissionGuard
                    key={item.path}
                    allowedRoles={getAllowedRoles(item)}
                  >
                    <Link
                      href={item.path}
                      onClick={onClose}
                      aria-current={isActive ? "page" : undefined}
                      title={showText ? undefined : item.label}
                      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        showText ? "justify-start" : "justify-center"
                      } ${
                        isActive
                          ? "bg-[#ecf3ff] text-[#465fff] dark:bg-[#465fff]/[0.12] dark:text-[#9cb9ff]"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-gray-300"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          isActive
                            ? "text-[#465fff] dark:text-[#9cb9ff]"
                            : "text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300"
                        }`}
                      />
                      {showText && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
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
  const { theme, toggleTheme } = useTheme();
  const { isMobileOpen, toggleSidebar } = useSidebar();
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const isDarkMode = theme === "dark";

  const handleToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      toggleSidebar();
      return;
    }

    onToggleMobileMenu();
  };

  return (
    <header className="sticky top-0 z-30 flex w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6">
        <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            type="button"
            className="z-30 flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 lg:h-11 lg:w-11"
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
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#465fff] text-white">
              <Home className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Hai Dang
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setApplicationMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:hidden"
            aria-label="Toggle application menu"
          >
            <MoreHorizontal className="h-6 w-6" />
          </button>

          <div className="hidden lg:block">
            <form onSubmit={(event) => event.preventDefault()}>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                  <Search className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </span>
                <input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  type="text"
                  placeholder="Search or type command..."
                  className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-[0_1px_2px_0_rgba(16,24,40,0.05)] outline-none placeholder:text-gray-400 focus:border-[#9cb9ff] focus:ring-4 focus:ring-[#465fff]/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 xl:w-[430px]"
                />
              </div>
            </form>
          </div>
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
              className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-orange-400 ring-2 ring-white dark:ring-gray-900" />
            </button>
            <span className="hidden h-8 items-center justify-center rounded-full bg-[#ecf3ff] px-3 text-xs font-semibold text-[#0F0F0F] dark:bg-[#465fff]/[0.12] dark:text-[#9cb9ff] sm:flex">
              {ROLE_LABELS[user?.role] || "Quản lý"}
            </span>
            <UserMenu
              user={user}
              onLogout={onLogout}
              isLoggingOut={isLoggingOut}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function DashboardLayoutShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, refreshUser, isLoadingUser, logout } = useAuth();
  const { isExpanded, isHovered, isMobileOpen, toggleMobileSidebar } =
    useSidebar();
  const [query, setQuery] = useState("");
  const [hasHydratedAuth, setHasHydratedAuth] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const effectiveRole = user?.role || "";

  const activeNavigationItem = getNavigationItemForPath(pathname);
  const permissionKey = getPermissionKeyForPath(pathname);
  const isAllowed = permissionKey
    ? canAccessRole(effectiveRole, SECTION_PERMISSIONS[permissionKey] || [])
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
    if (!user) {
      if (isLoggingOut) return;
      const redirect = pathname
        ? `?redirect=${encodeURIComponent(pathname)}`
        : "";
      router.replace(`/login${redirect}`);
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
    pathname,
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
      <div className="dashboard-shell min-h-screen w-full overflow-x-hidden bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white/90 lg:flex">
        <Sidebar
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
                <section className="flex min-h-[360px] items-center justify-center rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400">
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
