'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Home, LayoutDashboard, LogIn, Menu, X } from 'lucide-react';

const STAFF_ROLES = new Set(['OWNER', 'MANAGER', 'owner', 'manager']);

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [staffRole, setStaffRole] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const syncAuthState = () => {
      const token = window.localStorage.getItem('token');
      const role = window.localStorage.getItem('userRole');
      setStaffRole(token && STAFF_ROLES.has(role) ? role : null);
    };

    syncAuthState();
    window.addEventListener('storage', syncAuthState);
    window.addEventListener('focus', syncAuthState);

    return () => {
      window.removeEventListener('storage', syncAuthState);
      window.removeEventListener('focus', syncAuthState);
    };
  }, []);

  const navLinks = [
    { name: 'Giới thiệu', href: '/about' },
    { name: 'Phòng trọ', href: '/rooms' },
    { name: 'Liên hệ', href: '/contact' },
  ];

  const toggleMobileMenu = () => setIsMobileMenuOpen((current) => !current);
  const toggleDropdown = () => setIsDropdownOpen((current) => !current);
  const goToPrimaryAction = () => {
    setIsMobileMenuOpen(false);
    router.push(staffRole === 'MANAGER' || staffRole === 'manager' ? '/dashboard/rooms' : staffRole ? '/dashboard' : '/login');
  };
  const primaryActionLabel = staffRole ? 'Quản lý trọ' : 'Đăng nhập';
  const PrimaryActionIcon = staffRole ? LayoutDashboard : LogIn;

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${scrolled
        ? 'border-b border-white/5 bg-[#1a223d]/70 py-4 shadow-lg shadow-black/5 backdrop-blur-md'
        : 'bg-transparent py-6'
        }`}
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-12 items-center justify-between">
          <div className="shrink-0">
            <Link href="/" className="group flex items-center gap-3 text-xl font-bold text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md transition-transform duration-300 group-hover:scale-105">
                <Home className="h-5 w-5 text-[#1a223d]" />
              </div>
              <span className="font-bold tracking-tight text-white">Hải Đăng</span>
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
                      className={`relative z-10 transition-colors duration-200 ${isActive ? 'font-bold text-white' : 'text-slate-300 group-hover:text-white'
                        }`}
                    >
                      {link.name}
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="navbar-indicator"
                        className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded-full bg-white/70"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}

              <div className="relative">
                <button
                  type="button"
                  onClick={toggleDropdown}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  aria-label="Xem thêm trang"
                  className={`flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-all ${isDropdownOpen
                    ? 'bg-white/10 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  Khác
                  <ChevronDown className={`ml-1 h-4 w-4 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 z-50 mt-3 w-44 origin-top-right overflow-hidden rounded-xl border border-white/10 bg-[#1e2746] shadow-2xl"
                    >
                      <div className="p-1">
                        <Link href="/policy" className="block rounded-lg px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
                          Chính sách
                        </Link>
                        <Link href="/support" className="block rounded-lg px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white">
                          Hỗ trợ
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
              aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
              className="inline-flex items-center justify-center rounded-xl bg-white/5 p-2.5 text-white transition-colors hover:bg-white/10 focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
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
                    className={`block rounded-xl px-4 py-3 text-base font-medium transition-colors ${isActive ? 'bg-white/10 font-bold text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              <div className="my-2 h-px bg-white/10" />
              <Link href="/policy" className="block rounded-xl px-4 py-3 text-base font-medium text-slate-300 hover:bg-white/5">
                Chính sách
              </Link>
              <Link href="/support" className="block rounded-xl px-4 py-3 text-base font-medium text-slate-300 hover:bg-white/5">
                Hỗ trợ
              </Link>
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
