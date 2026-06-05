"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  FileCheck2,
  FileText,
  Gauge,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Search,
  Settings,
  UserRoundCog,
  UserSearch,
  UsersRound,
  WalletCards,
  Wrench,
  X,
} from "lucide-react";
import { AuthProvider, useAuth } from "./_contexts/AuthContext";
import { DashboardLayoutProvider } from "./_contexts/DashboardLayoutContext";
import { PermissionGuard } from "./_components/PermissionGuard";
import { ProtectedRoute } from "./_components/ProtectedRoute";
import {
  ROLE_LABELS,
  SECTION_PERMISSIONS,
  canAccessRole,
} from "./_lib/rbac";

const navigation = [
  { path: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, permissionKey: "dashboard" },
  { path: "/dashboard/rooms", label: "Quản lý Phòng & Tầng", icon: Building2, permissionKey: "rooms" },
  { path: "/dashboard/tenants", label: "Quản lý hồ sơ", icon: UsersRound, permissionKey: "tenants" },
  { path: "/dashboard/viewing-customers", label: "Khách xem phòng", icon: UserSearch, permissionKey: "viewingCustomers" },
  { path: "/dashboard/accounts", label: "Quản lý tài khoản", icon: UserRoundCog, permissionKey: "accounts" },
  { path: "/dashboard/meter-readings", label: "Nhập số điện nước", icon: Gauge, permissionKey: "meterReadings" },
  { path: "/dashboard/maintenance", label: "Bảo trì", icon: Wrench, permissionKey: "maintenance" },
  { path: "/dashboard/deposits", label: "Danh sách cọc", icon: FileCheck2, permissionKey: "deposits" },
  { path: "/dashboard/contract-template", label: "Hợp đồng thuê", icon: FileText, permissionKey: "contract" },
  { path: "/dashboard/finance", label: "Báo cáo Tài chính", icon: WalletCards, permissionKey: "finance" },
  { path: "/dashboard/settings", label: "Cấu hình hệ thống", icon: Settings, permissionKey: "settings" },
];

const specialRoutePermissions = [
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
  const specialRoute = specialRoutePermissions.find((item) => pathname?.startsWith(item.prefix));
  if (specialRoute) {
    return navigation.find((item) => item.path === specialRoute.navigationPath);
  }

  return navigation
    .filter((item) => isNavigationPathActive(pathname, item.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
}

function getPermissionKeyForPath(pathname) {
  const specialRoute = specialRoutePermissions.find((item) => pathname?.startsWith(item.prefix));
  if (specialRoute) {
    return specialRoute.permissionKey;
  }

  return getNavigationItemForPath(pathname)?.permissionKey || "";
}

function getFirstAllowedPath(role) {
  return navigation.find((item) => canAccessRole(role, getAllowedRoles(item)))?.path || "/dashboard";
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
    md: "h-9 w-9 text-sm",
  };
  const sizeClass = sizes[size] || sizes.md;
  const label = user?.fullName || user?.name || user?.email || "User";

  if (user?.avatarUrl) {
    return (
      <span
        aria-label={label}
        role="img"
        className={`${sizeClass} shrink-0 rounded-full bg-cover bg-center ${className}`}
        style={{ backgroundImage: `url("${user.avatarUrl}")` }}
      />
    );
  }

  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-[#d3e4fe] font-bold text-[#091426] ${sizeClass} ${className}`}>
      {getInitials(label)}
    </span>
  );
}

function AccessDeniedPage() {
  return (
    <section className="rounded-xl border border-[#e2e8f0] bg-white p-8 shadow-[0_1px_2px_rgba(9,20,38,0.06)]">
      <div className="flex max-w-2xl items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
          <X className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[#091426]">Không có quyền truy cập</h1>
          <p className="mt-2 text-sm leading-6 text-[#45474c]">
            Màn hình này đang bị ẩn theo phân quyền hiện tại. Vui lòng chọn chức năng phù hợp với vai trò của bạn.
          </p>
        </div>
      </div>
    </section>
  );
}

function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#091426]/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-[#172235] bg-[#091426] px-5 py-6 text-white transition-transform duration-300 lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
          } lg:flex`}
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 px-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#091426]">
              <Home className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xl font-bold leading-7">Hải Đăng</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8590a6]">
                Property management
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#8590a6] hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-11 text-xs font-semibold uppercase tracking-[0.12em] text-[#3c475a]">
          Main menu
        </div>
        <nav className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = isNavigationPathActive(pathname, item.path);

            return (
              <PermissionGuard key={item.path} allowedRoles={getAllowedRoles(item)}>
                <Link
                  href={item.path}
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-r-lg border-l-4 px-4 py-3 text-left text-sm transition ${isActive
                      ? "border-emerald-400 bg-[#1e293b] text-white"
                      : "border-transparent text-[#647089] hover:bg-white/5 hover:text-white"
                    }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {item.label}
                </Link>
              </PermissionGuard>
            );
          })}
        </nav>

        <div className="border-t border-[#172235] pt-5">
          <div className="flex items-center justify-between rounded-lg px-3 py-3 text-[#647089]">
            <span className="inline-flex items-center gap-3 text-sm">
              <Bell className="h-5 w-5" />
              Thông báo
            </span>
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">5</span>
          </div>
          <div className="mt-3 flex items-center gap-3 px-3 py-4">
            <UserAvatar user={user} className="bg-slate-200" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-white">{user?.fullName || user?.name}</span>
              <span className="block truncate text-xs text-[#647089]">{user?.email}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-[#647089] hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}

function Topbar({ search, onSearchChange, onToggleMobileMenu }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-[#e2e8f0] bg-white px-4 shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:px-6 lg:ml-[280px]">
      <div className="flex min-w-0 items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="rounded-lg border border-[#e2e8f0] p-1.5 text-[#505f76] hover:bg-[#f2f4f6]"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#091426] text-white">
          <Home className="h-5 w-5" />
        </span>
        <span className="truncate text-sm font-bold text-[#091426]">Hải Đăng</span>
      </div>

      {/*<label className="relative hidden w-full max-w-sm md:block">*/}
      {/*  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />*/}
      {/*  <input*/}
      {/*    value={search}*/}
      {/*    onChange={(event) => onSearchChange(event.target.value)}*/}
      {/*    placeholder="Tìm phòng, khách thuê, mã cọc..."*/}
      {/*    className="h-9 w-full rounded-full bg-[#f2f4f6] pl-10 pr-4 text-sm font-semibold text-[#091426] outline-none placeholder:text-[#6b7280] focus:ring-2 focus:ring-[#091426]/10"*/}
      {/*  />*/}
      {/*</label>*/}

      <div className="ml-auto flex items-center gap-3">
        <button type="button" aria-label="Thông báo" className="relative rounded-full p-2 text-[#505f76] hover:bg-[#f2f4f6]">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="hidden items-center gap-3 border-l border-[#e2e8f0] pl-3 sm:flex">
          <span className="rounded-full border border-[#e2e8f0] bg-[#f7f9fb] px-3 py-2 text-xs font-bold text-[#091426]">
            {ROLE_LABELS[user?.role] || user?.roleLabel || "User"}
          </span>
          <span className="min-w-0 text-right">
            <span className="block truncate text-xs font-bold text-[#091426]">{user?.fullName || user?.name}</span>
            <span className="block max-w-44 truncate text-xs text-[#6b7280]">{user?.email}</span>
          </span>
          <UserAvatar user={user} size="sm" />
        </div>
      </div>
    </header>
  );
}

function DashboardLayoutShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, refreshUser, isLoadingUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hasHydratedAuth, setHasHydratedAuth] = useState(false);
  const isDevelopmentPreview = process.env.NODE_ENV === "development";
  const effectiveRole = user?.role || (isDevelopmentPreview ? "owner" : "");

  const activeNavigationItem = getNavigationItemForPath(pathname);
  const permissionKey = getPermissionKeyForPath(pathname);
  const isAllowed = permissionKey ? canAccessRole(effectiveRole, SECTION_PERMISSIONS[permissionKey] || []) : false;

  useEffect(() => {
    let isActive = true;

    async function hydrateUser() {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : "";

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
    if (!user && !isDevelopmentPreview) {
      const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${redirect}`);
      return;
    }
    if (!activeNavigationItem) return;
    if (!isAllowed) {
      router.replace(getFirstAllowedPath(effectiveRole));
    }
  }, [activeNavigationItem, effectiveRole, hasHydratedAuth, isAllowed, isDevelopmentPreview, pathname, router, user]);

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
      <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e]">
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <Topbar
          search={query}
          onSearchChange={setQuery}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />
        <main className="px-4 py-6 sm:px-6 lg:ml-[280px]">
          <div className="mx-auto grid max-w-[1440px] gap-8">
            {!hasHydratedAuth || isLoadingUser ? (
              <section className="flex min-h-[360px] items-center justify-center rounded-xl border border-[#e2e8f0] bg-white">
                <span className="inline-flex items-center gap-2 text-sm font-bold text-[#505f76]">
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
    </DashboardLayoutProvider>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <DashboardLayoutShell>{children}</DashboardLayoutShell>
      </ProtectedRoute>
    </AuthProvider>
  );
}
