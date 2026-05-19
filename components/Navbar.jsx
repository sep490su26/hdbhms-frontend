'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const navLinks = [
    { name: 'Giới thiệu', href: '/about' },
    { name: 'Phòng trọ', href: '/rooms' },
    { name: 'Liên hệ', href: '/contact' },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-[#1a223d]/70 backdrop-blur-md border-b border-white/5 py-4 shadow-lg shadow-black/5' 
          : 'bg-transparent py-6' // Khi chưa scroll, hoàn toàn trong suốt, không có vệt đen nào
      }`}
    >
      {/* Tăng chiều rộng tối đa (max-w-7xl) và padding hai bên để kéo giãn các phần tử ra biên */}
      <div className="w-full px-6 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center h-12">
          
          {/* LOGO: Cố định góc bên trái */}
          <div className="flex-shrink-0">
            <Link href="/" className="font-bold text-xl text-white flex items-center gap-3 group">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105">
                <Home className="w-5 h-5 text-[#1a223d]" />
              </div>
              <span className="tracking-tight font-bold text-white transition-colors">
                Hải Đăng
              </span>
            </Link>
          </div>

          {/* DESKTOP MENU: Đẩy hẳn sang bên phải (right-aligned), không gom cụm ở giữa */}
          <div className="hidden md:flex items-center gap-4"> 
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link 
                  key={link.name}
                  href={link.href} 
                  className="relative px-4 py-2 rounded-xl text-sm font-medium transition-all group"
                >
                  <span className={`relative z-10 transition-colors duration-200 ${
                    isActive ? 'text-white font-bold' : 'text-slate-300 group-hover:text-white'
                  }`}>
                    {link.name}
                  </span>
                  {isActive && (
                    <motion.div 
                      layoutId="navbar-indicator"
                      className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl z-0" 
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
            
            {/* DROPDOWN MENU */}
            <div className="relative">
              <button 
                onClick={toggleDropdown}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
                aria-label="Xem thêm trang"
                className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isDropdownOpen 
                    ? 'text-white bg-white/10' 
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
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
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 mt-3 w-44 rounded-xl shadow-2xl bg-[#1e2746] border border-white/10 overflow-hidden z-50 origin-top-right"
                  >
                    <div className="p-1">
                      <Link href="/policy" className="block px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        Chính sách
                      </Link>
                      <Link href="/support" className="block px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        Hỗ trợ
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* MOBILE MENU BUTTON */}
          <div className="flex items-center md:hidden">
            <button
              onClick={toggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
              className="inline-flex items-center justify-center p-2.5 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-colors focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU DROP DOWN */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden absolute top-full left-0 right-0 px-4 pt-2"
          >
            <div className="p-4 space-y-1 bg-[#1a223d]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link 
                    key={link.name}
                    href={link.href} 
                    className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                      isActive ? 'bg-white/10 text-white font-bold' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              <div className="h-px bg-white/10 my-2"></div>
              <Link href="/policy" className="block px-4 py-3 rounded-xl text-base font-medium text-slate-300 hover:bg-white/5">
                Chính sách
              </Link>
              <Link href="/support" className="block px-4 py-3 rounded-xl text-base font-medium text-slate-300 hover:bg-white/5">
                Hỗ trợ
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}