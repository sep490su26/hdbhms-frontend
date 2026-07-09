"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Home, LayoutDashboard, LogIn, Menu, X } from "lucide-react";

const STAFF_ROLES = new Set(["OWNER", "MANAGER", "owner", "manager"]);

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [staffRole, setStaffRole] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const syncAuthState = () => {
      const token = window.localStorage.getItem("token");
      const role = window.localStorage.getItem("userRole");
      setStaffRole(token && STAFF_ROLES.has(role) ? role : null);
    };

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    window.addEventListener("focus", syncAuthState);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("focus", syncAuthState);
    };
  }, []);

  const navLinks = [
    { name: "Trang chủ", href: "/" },
    { name: "Phòng trọ", href: "/rooms" },
    { name: "Nội quy", href: "/rules" },
    // { name: "Liên hệ", href: "/contact" },
  ];

  const toggleMobileMenu = () => setIsMobileMenuOpen((current) => !current);
  const goToPrimaryAction = () => {
    setIsMobileMenuOpen(false);
    if (staffRole === "MANAGER" || staffRole === "manager") {
      router.push("/dashboard/rooms");
      return;
    }

    if (staffRole) {
      router.push("/dashboard");
      return;
    }

    router.push("/login");
  };
  const primaryActionLabel = staffRole ? "Quản lý trọ" : "Đăng nhập";
  const PrimaryActionIcon = staffRole ? LayoutDashboard : LogIn;

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/5 bg-[#091426]/80 py-4 shadow-lg shadow-black/5 backdrop-blur-md" // Chỉnh lại màu ở đây cho đồng bộ
          : "bg-[#091426] py-6"
      }`}
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-12 items-center justify-between">
          <div className="shrink-0">
            <Link
              href="/"
              className="group flex items-center gap-3 text-xl font-bold text-white"
            >
              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="group-hover:scale-105 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#091426] to-[#091426] text-white shadow-md transition-transform duration-300">
                  <svg
                    viewBox="0 0 64 64"
                    className="h-6 w-6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g transform="translate(32 33) scale(1.2) translate(-32 -33)">
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
                    </g>
                  </svg>
                </div>

                {/* 2. Logo Chữ "HDBHMS" bằng SVG */}
                <svg
                  viewBox="0 0 160 40"
                  className="h-7 w-auto drop-shadow-sm"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    {/* Tạo dải màu gradient từ Trắng sang Xanh nhạt cho chữ */}
                    <linearGradient
                      id="textGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#dbeafe" />{" "}
                      {/* Màu blue-100 của Tailwind */}
                    </linearGradient>
                  </defs>

                  <text
                    x="0"
                    y="32"
                    fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                    fontSize="28"
                    fontWeight="900"
                    letterSpacing="1.5"
                    fill="url(#textGrad)"
                  >
                    HDBH<tspan fill="#f6c915">MS</tspan>{" "}
                    {/* HMS được đổi sang màu xanh blue-500 để làm điểm nhấn */}
                  </text>
                </svg>
              </div>
            </Link>
          </div>

          {/* Desktop: navigation remains grouped, login is anchored at the far right. */}
          <div className="hidden items-center gap-5 md:flex">
            <div className="flex items-center gap-5">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="group relative px-1 py-2 text-sm font-medium transition-colors"
                  >
                    <span
                      className={`relative z-10 transition-colors duration-200 ${
                        isActive
                          ? "font-bold text-white"
                          : "text-slate-300 group-hover:text-white"
                      }`}
                    >
                      {link.name}
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="navbar-indicator"
                        className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded-full bg-white/70"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            <button
              type="button"
              onClick={goToPrimaryAction}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[#1a223d] shadow-sm transition-all duration-200 hover:bg-slate-100 hover:shadow-md"
            >
              <PrimaryActionIcon className="h-4 w-4" />
              {primaryActionLabel}
            </button>
          </div>

          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "Đóng menu" : "Mở menu"}
              className="inline-flex items-center justify-center rounded-xl bg-white/5 p-2.5 text-white transition-colors hover:bg-white/10 focus:outline-none"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute left-0 right-0 top-full px-4 pt-2 md:hidden"
          >
            <div className="space-y-1 rounded-2xl border border-white/10 bg-[#1a223d]/95 p-4 shadow-2xl backdrop-blur-xl">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`block rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                      isActive
                        ? "bg-white/10 font-bold text-white"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={goToPrimaryAction}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-base font-bold text-[#1a223d] transition-colors hover:bg-slate-100"
              >
                <PrimaryActionIcon className="h-4 w-4" />
                {primaryActionLabel}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
