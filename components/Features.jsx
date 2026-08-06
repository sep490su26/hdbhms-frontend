"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

const features = [
  {
    icon: "/icon-search.png",
    title: "Tìm Kiếm Phòng Dễ Dàng",
    description:
      "Hệ thống giúp bạn tìm kiếm không gian sống phù hợp dựa trên vị trí, diện tích và mức giá mong muốn một cách nhanh chóng.",
  },
  {
    icon: "/icon-booking.png",
    title: "Đặt Chỗ Nhanh Chóng",
    description:
      "Quy trình đặt phòng được số hóa hoàn toàn. Đặt cọc và xác nhận ngay lập tức, tiết kiệm tối đa thời gian chờ đợi.",
  },
  {
    icon: "/icon-contract.png",
    title: "Quản Lý Hợp Đồng Thông Minh",
    description:
      "Lưu trữ hợp đồng điện tử, tự động nhắc nhở gia hạn, tính toán chi phí minh bạch hàng tháng trực tiếp trên nền tảng.",
  },
];

export function Features() {
  return (
    <section className="bg-white py-12 md:py-20">
      <div className="mx-auto max-w-[1280px] px-8 lg:px-12">
        {/* Section Header — centered */}
        <div className="mb-10 flex flex-col items-center gap-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-brand-primary">
            GIẢI PHÁP
          </p>
          <h2
            className="text-2xl md:text-[32px] font-semibold leading-[1.3] tracking-[0.01em]"
            style={{ color: "#0B1C30" }}
          >
            Đơn giản hóa mọi trải nghiệm lưu trú
          </h2>
        </div>

        {/* Cards Grid — 3 columns on desktop */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              // 1. Đưa thẻ cha về lại flex-col để chia 2 phần trên/dưới
              className="relative flex flex-col overflow-hidden rounded-3xl p-6 xl:p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              style={{
                backgroundColor: "#F8F9FF",
                boxShadow: "0px 10px 30px 0px rgba(10, 25, 47, 0.05)",
              }}
            >
              {/* --- PHẦN TRÊN: ICON + TITLE --- */}
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "#D6E3FF" }}
                >
                  <Image
                    src={feature.icon}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                  />
                </div>

                {/* Title */}
                <h3
                  className="text-lg xl:text-[22px] font-semibold leading-snug"
                  style={{ color: "#0B1C30" }}
                >
                  {feature.title}
                </h3>
              </div>

              {/* --- PHẦN DƯỚI: DESCRIPTION --- */}
              {/* 2. Đẩy mô tả xuống dưới, dùng text-justify để căn đều 2 bên */}
              <p
                className="mt-5 text-sm xl:text-base leading-relaxed text-justify flex-1"
                style={{ color: "#44474D" }}
              >
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
