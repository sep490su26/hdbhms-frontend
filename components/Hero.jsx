"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="bg-[#091426] pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 space-y-8 relative z-10"
          >
            {/* Tích hợp cả 2 thông điệp vào Tiêu đề */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Nền tảng Quản lý & Đặt phòng{" "}
              <span className="text-white underline decoration-2 underline-offset-8">
                Hải Đăng
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl">
              Giải pháp toàn diện giúp khách hàng dễ dàng tìm kiếm, đặt chỗ và
              thanh toán, đồng thời tối ưu hóa mọi quy trình vận hành, quản lý
              nội bộ.
            </p>

            {/* Nút Call-to-action */}
          </motion.div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1 w-full"
          >
            <div className="relative rounded-2xl bg-brand-darker aspect-video shadow-xl overflow-hidden border border-brand-border">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-border to-brand-darker flex items-center justify-center">
                <span className="text-brand-text-muted font-medium">
                  Placeholder Image
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
