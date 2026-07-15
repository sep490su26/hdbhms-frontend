"use client";

import React from "react";
import { MapPin, Phone, Clock, ArrowRight } from "lucide-react";

export function LocationSection() {
  return (
    <section className="relative w-full h-[500px] md:h-[600px] bg-slate-100">
      {/* 1. Google Maps Iframe */}
      <iframe
        // Đây là tọa độ giả định khu vực Thạch Hòa, Thạch Thất. Bạn thay link embed thực tế của cơ sở vào đây nhé
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.1882546013962!2d105.51967551083528!3d21.02515218054236!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31345b3515defff5%3A0x69926224fd0915f7!2zTmjDoCBUcuG7jSBI4bqjaSDEkMSDbmcgMQ!5e0!3m2!1svi!2s!4v1783610389412!5m2!1svi!2s"
        width="600"
        height="450"
        loading="lazy"
        allowFullScreen=""
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0 w-full h-full object-cover grayscale-[20%] contrast-125" // Thêm chút filter cho bản đồ ngầu hơn
      ></iframe>

      {/* 2. Lớp phủ Overlay chứa Card thông tin */}
      {/* Sử dụng pointer-events-none để không chặn thao tác kéo thả bản đồ ở vùng trống */}
      <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pointer-events-none flex items-end md:items-center pb-8 md:pb-0">
        {/* Floating Contact Card */}
        {/* Bật lại pointer-events-auto cho thẻ này để người dùng có thể click vào nút bấm */}
        <div className="bg-[#151c2c]/70 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto border border-white/10 flex flex-col gap-6">
          {" "}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Vị trí cơ sở
            </h2>
            <p className="text-slate-400 text-sm">
              Trực tiếp đến xem phòng hoặc gọi cho chúng tôi để được hỗ trợ
              24/7.
            </p>
          </div>
          <div className="flex flex-col gap-5">
            {/* Địa chỉ */}
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-2.5 rounded-lg shrink-0">
                <MapPin className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Địa chỉ</p>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Số 70A1, Thôn 4, xã Thạch Hoà,
                  <br />
                  Thạch Thất, Hà Nội
                </p>
              </div>
            </div>

            {/* Hotline */}
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-2.5 rounded-lg shrink-0">
                <Phone className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Hotline tư vấn</p>
                <p className="text-slate-300 text-sm">
                  0914.339.682
                  <br />
                  0846.557.999
                </p>
              </div>
            </div>

            {/* Giờ làm việc */}
            <div className="flex items-start gap-4">
              <div className="bg-white/10 p-2.5 rounded-lg shrink-0">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Giờ làm việc</p>
                <p className="text-slate-300 text-sm">
                  24/7 (Tất cả các ngày trong tuần)
                </p>
              </div>
            </div>
          </div>
          {/* Nút chỉ đường */}
          <a
            // Sử dụng API dẫn đường của Google Maps (dir/?api=1&destination=...)
            href="https://www.google.com/maps/dir/?api=1&destination=Số+70A1,+Thôn+4,+xã+Thạch+Hoà,+Thạch+Thất,+Hà+Nội"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 group"
          >
            Chỉ đường
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
}
