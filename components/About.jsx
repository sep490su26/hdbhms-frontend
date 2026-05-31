"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import {Button} from "@/components/ui/button";

export function About() {
  return (
    <section className="bg-[#091426] py-16 md:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex-1 space-y-6"
          >
            <p className="text-sm font-bold tracking-widest text-brand-primary uppercase">
              Về chúng tôi
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              Nhà trọ Hải Đăng cam kết chất lượng tốt
            </h2>
            <p className="text-lg text-brand-text-muted">
              Chúng tôi tin rằng mỗi khách hàng xứng đáng nhận được dịch vụ tốt
              nhất. Hệ thống của chúng tôi được xây dựng để mang lại sự tin
              tưởng và tiện lợi.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto rounded-xl shadow-lg text-black font-bold"
              >
                Khám phá
              </Button>
              <Button
                variant="link"
                size="lg"
                icon={<ChevronRight className="h-4 w-4" />}
                iconPosition="right"
                className="text-white font-bold hover:text-white/80"
              >
                Xem thêm
              </Button>
            </div>
          </motion.div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1 w-full"
          >
            <div className="relative rounded-2xl bg-brand-darker aspect-square md:aspect-video lg:aspect-square shadow-xl overflow-hidden border border-brand-border">
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
