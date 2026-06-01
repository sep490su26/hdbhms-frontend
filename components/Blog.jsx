"use client";

import React from "react";
import Link from "next/link";
import {Button} from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const articles = [
  {
    category: "Cập nhật",
    title: "Khánh thành khu phòng trọ cao cấp mới tại cơ sở 2",
    description:
      "Trải nghiệm không gian sống hiện đại với đầy đủ tiện nghi, an ninh 24/7 và bãi để xe rộng rãi dành riêng cho người thuê...",
    date: "15 Thg 05, 2026",
    link: "/blog/phong-moi",
  },
  {
    category: "Dịch vụ",
    title: "Nâng cấp hệ thống wifi băng thông rộng cho toàn khu",
    description:
      "Nhằm đáp ứng nhu cầu học tập và làm việc trực tuyến, Hải Đăng vừa hoàn tất nâng cấp hạ tầng mạng cáp quang tốc độ cao...",
    date: "10 Thg 05, 2026",
    link: "/blog/dich-vu-tot",
  },
];

export function Blog() {
  return (
    <section className="bg-white py-20 md:py-32">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-12 items-start">
          {/* Left column: header */}
          <div className="lg:w-1/3 flex flex-col items-start lg:sticky lg:top-32">
            <span className="text-sm font-bold tracking-widest text-brand-primary uppercase mb-3">
              Tin tức &amp; Sự kiện
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight mb-6 tracking-tight">
              Cập nhật mới nhất từ{" "}
              <span className="text-[#1a223d] whitespace-nowrap">Hải Đăng</span>
            </h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Theo dõi những thông tin mới nhất về dịch vụ, tiện ích và các hoạt
              động cộng đồng dành cho khách thuê của chúng tôi.
            </p>
            <Button variant="dark" size="lg" className="rounded-xl font-semibold">
              Xem tất cả bài viết
            </Button>
          </div>

          {/* Right column: articles */}
          <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
            {articles.map((article, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.15,
                  ease: "easeOut",
                }}
              >
                {/* Use Link for keyboard accessibility */}
                <Link href={article.link} className="group flex flex-col cursor-pointer">
                  {/* Image Wrapper */}
                  <div className="aspect-[4/3] rounded-2xl mb-6 overflow-hidden bg-slate-100 relative shadow-sm border border-slate-100">
                    <div className="absolute inset-0 bg-[#222b4d] transform group-hover:scale-105 transition-transform duration-700 ease-out flex items-center justify-center">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
                      <span className="text-white/60 text-sm font-medium relative z-20">
                        Placeholder Image
                      </span>
                    </div>
                    {/* Category tag */}
                    <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-800 shadow-sm">
                      {article.category}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center text-sm text-slate-500 mb-3 font-medium">
                      <time dateTime={article.date}>{article.date}</time>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-brand-primary transition-colors duration-300 line-clamp-2">
                      {article.title}
                    </h3>

                    <p className="text-slate-600 mb-6 leading-relaxed line-clamp-3 flex-1">
                      {article.description}
                    </p>

                    <div className="mt-auto flex items-center text-[#1a223d] font-semibold text-sm group-hover:text-brand-primary transition-colors">
                      Đọc tiếp
                      <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1.5 transition-transform duration-300" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
