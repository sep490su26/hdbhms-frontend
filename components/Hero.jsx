"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export function Hero() {
  return (
    <section className="relative min-h-[680px] md:min-h-[800px] w-full overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        {/* Ảnh DỌC dành riêng cho Mobile (sẽ co lại cực kỳ vừa vặn) */}
        <div className="block md:hidden h-full w-full relative">
          <Image
            src="/image_mob.png" // Đường dẫn tới bức ảnh chụp dọc
            alt="Mobile Background"
            fill
            className="object-cover object-top"
            priority
            sizes="(max-width: 768px) 100vw, 0vw"
          />
        </div>

        {/* Ảnh NGANG dành riêng cho Desktop */}
        <div className="hidden md:block h-full w-full relative">
          <Image
            src="/image_desk.png"
            alt="Hải Đăng Boarding House"
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
        </div>
        {/* Gradient Overlay — left dark, right semi-transparent */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(11, 28, 48, 0.6) 0%, rgba(0, 0, 0, 0.2) 100%)",
          }}
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 mx-auto flex h-full min-h-[680px] md:min-h-[800px] w-full max-w-[1280px] items-center px-8 lg:px-12">
        {/* Left-aligned content wrapper (~710px max width) */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[710px] space-y-6"
        >
          {/* Heading */}
          <h1
            className="text-4xl md:text-5xl lg:text-[48px] font-bold tracking-tight text-white leading-[1.1]"
            style={{ letterSpacing: "-0.02em" }}
          >
            Nền tảng Quản lý & Đặt{"\n"}
            <br className="hidden md:block" />
            phòng trọ{" "}
            <span className="text-white decoration-2 underline-offset-8">
              Hải Đăng
            </span>
          </h1>

          {/* Description */}
          <p className="text-base md:text-lg text-white/90 max-w-[672px] leading-relaxed">
            Trải nghiệm giải pháp quản lý nhà trọ toàn diện. Tối ưu hóa vận
            hành, quản lý hợp đồng chuyên nghiệp và mang đến sự an tâm tuyệt đối
            cho khách thuê với hệ thống hiện đại, minh bạch.
          </p>

          {/* CTA Button */}
          <div className="pt-2">
            <Link href="/rooms">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 rounded-full bg-[#232946] px-8 py-4 text-sm font-semibold tracking-widest text-white shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                ĐẶT PHÒNG
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
