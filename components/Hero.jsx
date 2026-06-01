"use client";

import React from "react";
import {Button} from "@/components/ui/button";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="bg-[#091426] py-16 md:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 space-y-8"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Hệ thống quản lý nhà trọ{" "}
              <span className="text-white underline decoration-2 underline-offset-8">
                Hải Đăng
              </span>
            </h1>
            <p className="text-lg md:text-xl text-brand-text-muted max-w-2xl">
              Website giúp quản lý thông tin phòng, người thuê và các hoạt động
              vận hành một cách thuận tiện, đồng thời nâng cao sự chuyên nghiệp
              và uy tín đối với khách hàng.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button variant="primary" size="lg" className="w-full sm:w-auto rounded-xl shadow-lg">
                Khám phá
              </Button>
              <Button variant="dark" size="lg" className="w-full sm:w-auto rounded-xl border border-white/20">
                Tìm hiểu
              </Button>
            </div>
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
