'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
    {
        tagline: 'Quản lý',
        title: 'Quản lý phòng một cách hiệu quả',
        description: 'Theo dõi thông tin phòng, thanh toán và các yêu cầu của bạn từ một nơi duy nhất.',
        actionText: 'Chi tiết',
        actionLink: '/details',
    },
    {
        tagline: 'Hỗ trợ',
        title: 'Hỗ trợ khách hàng tận tâm',
        description: 'Đội ngũ của chúng tôi sẵn sàng giúp bạn giải quyết mọi vấn đề bất kỳ lúc nào.',
        actionText: 'Liên hệ',
        actionLink: '/contact',
    },
    {
        tagline: 'Tin tức',
        title: 'Cập nhật thông tin phòng trọ mới',
        description: 'Nhận thông báo về các phòng trọ mới và ưu đãi đặc biệt từ Hải Đăng.',
        actionText: 'Đăng ký',
        actionLink: '/register',
    },
];

export function Features() {
    return (
        <section className="bg-white py-16 md:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <p className="text-sm font-bold tracking-widest text-black uppercase">
                        Đặt phòng
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold text-black">
                        Đặt phòng trực tuyến dễ dàng
                    </h2>
                    <p className="text-lg text-black/80">
                        Tìm và đặt phòng trọ phù hợp với nhu cầu của bạn chỉ trong vài phút.
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
                                <span className="text-white relative z-10 font-medium">Ảnh minh họa</span>
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
                                <div className="mt-auto pt-4">
                                    <Button
                                        variant="link"
                                        icon={<ChevronRight className="h-4 w-4" />}
                                    >
                                        {feature.actionText}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
