"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
const features = [
  {
    tagline: "Dành cho khách thuê",
    title: "Tìm & Đặt phòng dễ dàng",
    description:
      "Xem sơ đồ tầng trực quan, kiểm tra phòng trống và tiến hành đặt cọc trực tuyến chỉ trong vài phút.",
    actionText: "Xem phòng trống",
    actionLink: "/rooms",
  },
  {
    tagline: "Dành cho ban quản lý",
    title: "Vận hành hệ thống đơn giản",
    description:
      "Theo dõi trạng thái phòng, hợp đồng, và tự động hóa các quy trình thanh toán từ một bảng điều khiển duy nhất.",
    actionText: "Tìm hiểu thêm",
    actionLink: "/dashboard",
  },
  {
    tagline: "Hỗ trợ 24/7",
    title: "Kết nối & Hỗ trợ tận tâm",
    description:
      "Hệ thống ghi nhận mọi yêu cầu hỗ trợ từ người thuê, đảm bảo xử lý sự cố nhanh chóng và chuyên nghiệp.",
    actionText: "Liên hệ ngay",
    actionLink: "/contact",
  },
];

export function Features() {
  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <p className="text-sm font-bold tracking-widest text-black uppercase text-brand-primary">
            Giải pháp
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-black">
            Đơn giản hóa mọi trải nghiệm lưu trú
          </h2>
          <p className="text-lg text-black/80">
            Từ việc tìm kiếm căn phòng ưng ý cho đến quản lý dữ liệu hợp đồng
            hàng tháng.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full"
            >
              <div
                className="h-48 bg-brand-gray flex-shrink-0 flex items-center justify-center relative overflow-hidden"
                role="img"
                aria-label={`Ảnh minh họa: ${feature.title}`}
              >
                <div className="absolute inset-0 bg-black/40" />
                <span className="text-white relative z-10 font-medium">
                  Ảnh minh họa
                </span>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <p className="text-sm font-semibold text-black uppercase tracking-wide mb-2">
                  {feature.tagline}
                </p>
                <h3 className="text-xl font-bold text-black mb-3">
                  {feature.title}
                </h3>
                <p className="text-black/80 mb-6 flex-grow">
                  {feature.description}
                </p>
                <div className="mt-auto pt-4 border-t border-white/5">
                  <Link href={feature.actionLink}>
                    <Button
                      variant="link"
                      className="p-0 h-auto font-semibold text-white hover:text-blue-400 transition-colors pointer-events-none text-brand-primary"
                    >
                      {feature.actionText}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
