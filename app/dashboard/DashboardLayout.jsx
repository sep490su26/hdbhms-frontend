"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Home, LogOut, Menu, Search, X } from "lucide-react";
import { roles } from "@/services/dashboardService";
import { AuthProvider } from "@/app/dashboard/_contexts/AuthContext";
import { PermissionGuard } from "@/app/dashboard/_components/PermissionGuard";
import {
  ROLE_LABELS,
  ACTION_PERMISSIONS,
  SECTION_PERMISSIONS,
  canAccessRole,
} from "@/app/dashboard/_lib/rbac";
import {
  getNavigationItemForPath,
  isNavigationPathActive,
  navigation,
  navigationPermissionKeys,
} from "./_lib/navigation";
import { DashboardLayoutProvider } from "./_contexts/DashboardLayoutContext";
import { AccessDeniedPage } from "@/app/dashboard/layout";

function getAllowedRoles(path) {
  return SECTION_PERMISSIONS[navigationPermissionKeys[path]] || [];
}

function getFirstAllowedPath(role) {
  return navigation.find((item) => canAccessRole(role, getAllowedRoles(item.path)))?.path || "/dashboard";
}

function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#091426]/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(280px,calc(100vw_-_2rem))] max-w-full flex-col border-r border-[#172235] bg-[#091426] px-5 py-6 text-white transition-transform duration-300 lg:w-[280px] lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
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
              <PermissionGuard key={item.path} allowedRoles={getAllowedRoles(item.path)}>
                <Link
                  href={item.path}
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-r-lg border-l-4 px-4 py-3 text-left text-sm transition ${
                    isActive
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
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-[#091426]">
              A
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-white">Admin User</span>
              <span className="block truncate text-xs text-[#647089]">admin@haidang.vn</span>
            </span>
          </div>
          <button
            type="button"
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

function Topbar({ activeRole, onRoleChange, search, onSearchChange, onToggleMobileMenu }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 min-w-0 flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] bg-white px-4 py-2 shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:px-6 lg:ml-[280px]">
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

      <label className="relative hidden w-full max-w-sm md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm phòng, khách thuê, mã cọc..."
          className="h-9 w-full rounded-full bg-[#f2f4f6] pl-10 pr-4 text-sm font-semibold text-[#091426] outline-none placeholder:text-[#6b7280] focus:ring-2 focus:ring-[#091426]/10"
        />
      </label>

      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-3">
        <PermissionGuard
          allowedRoles={ACTION_PERMISSIONS.changeOwnRole}
          fallback={
            <div className="rounded-full border border-[#e2e8f0] bg-[#f7f9fb] px-3 py-2 text-xs font-bold text-[#091426]">
              {ROLE_LABELS[activeRole] || "Không rõ quyền"}
            </div>
          }
          mode="disabled"
        >
          <div className="flex rounded-full border border-[#e2e8f0] bg-[#f7f9fb] p-1">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => onRoleChange(role.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  activeRole === role.id
                    ? "bg-[#091426] text-white shadow-sm"
                    : "text-[#505f76] hover:text-[#091426]"
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>
        </PermissionGuard>
        <button type="button" aria-label="Thông báo" className="relative rounded-full p-2 text-[#505f76] hover:bg-[#f2f4f6]">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="hidden items-center gap-2 border-l border-[#e2e8f0] pl-3 sm:flex">
          <span className="text-xs font-bold text-[#505f76]">{ROLE_LABELS[activeRole] || "User"}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d3e4fe] text-xs font-bold text-[#091426]">
            A
          </span>
        </div>
      </div>
    </header>
  );
}

export function DashboardLayoutClient({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeRole, setActiveRole] = useState("owner");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  const activeNavigationItem = getNavigationItemForPath(pathname);
  const isAllowed = activeNavigationItem
    ? canAccessRole(activeRole, getAllowedRoles(activeNavigationItem.path))
    : false;

  useEffect(() => {
    if (!activeNavigationItem) return;
    if (!isAllowed) {
      router.replace(getFirstAllowedPath(activeRole));
    }
  }, [activeNavigationItem, activeRole, isAllowed, router]);

  const contextValue = useMemo(
    () => ({
      activeRole,
      query,
      setQuery,
    }),
    [activeRole, query],
  );

  return (
    <AuthProvider user={{ role: activeRole, name: "Admin User", email: "admin@haidang.vn" }}>
      <DashboardLayoutProvider value={contextValue}>
        <div className="dashboard-shell min-h-screen bg-[#f7f9fb] text-[#191c1e]">
          <Sidebar
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />
          <Topbar
            activeRole={activeRole}
            onRoleChange={setActiveRole}
            search={query}
            onSearchChange={setQuery}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          />
          <main className="dashboard-main px-4 py-6 sm:px-6 lg:ml-[280px]">
            <div className="dashboard-content mx-auto grid w-full max-w-[1440px] gap-8">
              {isAllowed ? children : <AccessDeniedPage />}
            </div>
          </main>
        </div>
      </DashboardLayoutProvider>
    </AuthProvider>
  );
}
