"use client";

import {useState} from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";

const revenueData = {
    Tháng: [
        {label: "T8", value: 85},
        {label: "T9", value: 105},
        {label: "T10", value: 112},
        {label: "T11", value: 130},
        {label: "T12", value: 148},
        {label: "T1", value: 20},
    ],
    Quý: [
        {label: "Q1", value: 310},
        {label: "Q2", value: 290},
        {label: "Q3", value: 340},
        {label: "Q4", value: 395},
    ],
    Năm: [
        {label: "2021", value: 980},
        {label: "2022", value: 1150},
        {label: "2023", value: 1340},
        {label: "2024", value: 1420},
    ],
};

const activities = [
    {
        id: 1,
        icon: "check",
        color: "bg-green-100 text-green-600",
        text: "Thanh toán tiền phòng thành công: Phòng 302",
        time: "15 phút trước",
    },
    {
        id: 2,
        icon: "user",
        color: "bg-blue-100 text-blue-600",
        text: "Người thuê mới: Trần Văn A đăng ký Phòng 105",
        time: "1 giờ trước",
    },
    {
        id: 3,
        icon: "wrench",
        color: "bg-orange-100 text-orange-500",
        text: "Yêu cầu sửa chữa: Phòng 401 - Hỏng vòi nước",
        time: "3 giờ trước",
    },
];

const DONUT_RADIUS = 70;
const STROKE = 14;
const CIRCUMFERENCE = 2 * Math.PI * (DONUT_RADIUS - STROKE / 2);

function DonutChart({percent}) {
    const filled = (percent / 100) * CIRCUMFERENCE;
    return (
        <svg width="180" height="180" viewBox="0 0 180 180">
            <circle
                cx="90" cy="90"
                r={DONUT_RADIUS - STROKE / 2}
                fill="none"
                stroke="#EEF2FF"
                strokeWidth={STROKE}
            />
            <circle
                cx="90" cy="90"
                r={DONUT_RADIUS - STROKE / 2}
                fill="none"
                stroke="#4F6EF7"
                strokeWidth={STROKE}
                strokeDasharray={`${filled} ${CIRCUMFERENCE - filled}`}
                strokeLinecap="round"
                transform="rotate(-90 90 90)"
            />
            <text x="90" y="85" textAnchor="middle" fontSize="26" fontWeight="700" fill="#1e293b">{percent}%</text>
            <text x="90" y="105" textAnchor="middle" fontSize="12" fill="#94a3b8">Tháng hiện tại</text>
        </svg>
    );
}

function ActivityIcon({type, color}) {
    const cls = `w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${color}`;
    if (type === "check")
        return (
            <div className={cls}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                </svg>
            </div>
        );
    if (type === "user")
        return (
            <div className={cls}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                </svg>
            </div>
        );
    return (
        <div className={cls}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
        </div>
    );
}

const CustomTooltip = ({active, payload, label}) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-bold text-indigo-600">{payload[0].value}tr</p>
            </div>
        );
    }
    return null;
};

export default function Dashboard() {
    const [revenueTab, setRevenueTab] = useState("Tháng");
    const data = revenueData[revenueTab];
    const maxVal = Math.max(...data.map((d) => d.value));

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <div className="mb-7">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard tổng quan</h1>
                <p className="text-sm text-gray-400 mt-0.5">Thống kê hoạt động của Nhà trọ Hải Đăng</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {/* Doanh thu */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor"
                                 viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                        </div>
                        <span className="text-xs font-semibold text-green-500 flex items-center gap-0.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round"
                                                                                                   strokeLinejoin="round"
                                                                                                   strokeWidth={2.5}
                                                                                                   d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
              +12%
            </span>
                    </div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Doanh thu tháng</p>
                    <p className="text-xl font-bold text-gray-900">125,000,000</p>
                    <p className="text-xs text-gray-400 font-medium">VND</p>
                </div>

                {/* Tỷ lệ lấp đầy */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor"
                                 viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                            </svg>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">92%</span>
                    </div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Tỷ lệ lấp đầy</p>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{width: "92%"}}></div>
                    </div>
                </div>

                {/* Phòng trống */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor"
                                 viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                        </div>
                        <span
                            className="text-xs bg-orange-50 text-orange-500 border border-orange-100 px-2 py-0.5 rounded-full font-medium">Cần chú ý</span>
                    </div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Phòng trống</p>
                    <p className="text-2xl font-bold text-gray-900">4 <span
                        className="text-base font-medium text-gray-500">Phòng</span></p>
                    <p className="text-xs text-orange-500 mt-1">Đang xử lý dọn dẹp: 2</p>
                </div>

                {/* Tổng công nợ */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor"
                                 viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Tổng công nợ</p>
                    <p className="text-xl font-bold text-red-500">15,400,000</p>
                    <p className="text-xs text-red-400 font-medium">VND</p>
                    <p className="text-xs text-gray-400 mt-1">Dự kiến thu hồi trong 3 ngày</p>
                </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-5 gap-4 mb-6">
                {/* Bar chart */}
                <div className="col-span-3 bg-white border border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-semibold text-gray-800">Biểu đồ doanh thu</h2>
                        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                            {["Tháng", "Quý", "Năm"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setRevenueTab(tab)}
                                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${revenueTab === tab ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data} barCategoryGap="30%">
                            <XAxis dataKey="label" axisLine={false} tickLine={false}
                                   tick={{fontSize: 12, fill: "#94a3b8"}}/>
                            <YAxis hide/>
                            <Tooltip content={<CustomTooltip/>} cursor={{fill: "#f1f5f9"}}/>
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell
                                        key={index}
                                        fill={entry.value === maxVal ? "#4F6EF7" : "#C7D2FE"}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Donut chart */}
                <div className="col-span-2 bg-white border border-gray-200 rounded-2xl p-5">
                    <h2 className="font-semibold text-gray-800 mb-4">Tỷ lệ lấp đầy</h2>
                    <div className="flex justify-center mb-4">
                        <DonutChart percent={92}/>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                                <span className="text-gray-600">Đã thuê (46 phòng)</span>
                            </div>
                            <span className="font-semibold text-gray-800">92%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0"></span>
                                <span className="text-gray-600">Phòng trống (4 phòng)</span>
                            </div>
                            <span className="font-semibold text-red-500">8%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-5 gap-4">
                {/* Activity feed */}
                <div className="col-span-2 bg-white border border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">Hoạt động gần đây</h2>
                        <button className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Xem tất cả
                        </button>
                    </div>
                    <div className="space-y-4">
                        {activities.map((a) => (
                            <div key={a.id} className="flex items-start gap-3">
                                <ActivityIcon type={a.icon} color={a.color}/>
                                <div>
                                    <p className="text-sm text-gray-700 leading-snug">{a.text}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{a.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right column: utilities + expiring contracts */}
                <div className="col-span-3 flex flex-col gap-4">
                    {/* Utility row */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Điện */}
                        <div className="bg-indigo-600 rounded-2xl p-5 text-white">
                            <p className="text-xs text-indigo-200 uppercase tracking-wide font-medium mb-2">Tiêu thụ
                                điện</p>
                            <p className="text-3xl font-bold">1,420 <span className="text-lg font-semibold">kWh</span>
                            </p>
                            <p className="text-xs text-indigo-300 mt-2 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                          d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                                </svg>
                                +5% so với tháng trước
                            </p>
                        </div>
                        {/* Nước */}
                        <div className="bg-blue-500 rounded-2xl p-5 text-white">
                            <p className="text-xs text-blue-100 uppercase tracking-wide font-medium mb-2">Tiêu thụ
                                nước</p>
                            <p className="text-3xl font-bold">85 <span className="text-lg font-semibold">m³</span></p>
                            <p className="text-xs text-blue-200 mt-2 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                          d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                                </svg>
                                -2% so với tháng trước
                            </p>
                        </div>
                    </div>

                    {/* Expiring contracts */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5">
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Sắp hết hạn hợp
                            đồng</p>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-gray-900">12 <span
                                    className="text-base font-medium text-gray-500">Người thuê</span></p>
                                <button
                                    className="text-sm text-indigo-500 hover:text-indigo-700 font-medium mt-1 flex items-center gap-1">
                                    Xem danh sách
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M9 5l7 7-7 7"/>
                                    </svg>
                                </button>
                            </div>
                            {/* Avatar stack */}
                            <div className="flex items-center">
                                {["bg-orange-400", "bg-teal-400", "bg-purple-400"].map((c, i) => (
                                    <div
                                        key={i}
                                        className={`w-9 h-9 rounded-full ${c} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}
                                        style={{marginLeft: i === 0 ? 0 : "-10px", zIndex: 3 - i}}
                                    >
                                        {["T", "N", "H"][i]}
                                    </div>
                                ))}
                                <div
                                    className="w-9 h-9 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-500 text-xs font-bold"
                                    style={{marginLeft: "-10px"}}
                                >
                                    +10
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}