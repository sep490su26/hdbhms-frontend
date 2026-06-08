"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, DoorOpen, RefreshCw, UsersRound } from "lucide-react";
import { authenticatedFetch } from "@/services/identityAccessService";

function SummaryCard({ icon: Icon, label, value }) {
    return (
        <article className="rounded-lg border border-[#dce2ec] bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-[#e7edff] text-[#3e5db7]">
                <Icon className="h-5 w-5" />
            </span>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.06em] text-[#4b5563]">{label}</p>
            <p className="mt-2 text-3xl font-bold text-[#0f1d33]">{value}</p>
        </article>
    );
}

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadDashboard() {
        setLoading(true);
        setError("");
        try {
            setData(await authenticatedFetch("/dashboard"));
        } catch (loadError) {
            setData(null);
            setError(loadError?.message || "Không tải được dữ liệu tổng quan.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let active = true;
        authenticatedFetch("/dashboard")
            .then((result) => {
                if (active) setData(result);
            })
            .catch((loadError) => {
                if (!active) return;
                setData(null);
                setError(loadError?.message || "Không tải được dữ liệu tổng quan.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    const occupancyRate = useMemo(() => {
        const total = Number(data?.totalRoomCount || 0);
        const occupied = Number(data?.totalOccupiedRoomCount || 0);
        return total > 0 ? `${Math.round((occupied / total) * 100)}%` : "0%";
    }, [data]);

    return (
        <div className="grid gap-7 text-[#0f1d33]">
            <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-[-0.02em]">Dashboard tổng quan</h1>
                    <p className="mt-2 text-sm text-[#4b5563]">Dữ liệu phòng được lấy trực tiếp từ hệ thống.</p>
                </div>
                <button
                    type="button"
                    onClick={loadDashboard}
                    disabled={loading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded border border-[#cbd3df] bg-white px-4 text-sm font-bold disabled:opacity-60"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Làm mới
                </button>
            </section>

            {error && (
                <section className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
                    {error}
                </section>
            )}

            <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-5">
                <SummaryCard icon={Building2} label="Tổng số phòng" value={loading ? "..." : Number(data?.totalRoomCount || 0)} />
                <SummaryCard icon={UsersRound} label="Phòng đang thuê" value={loading ? "..." : Number(data?.totalOccupiedRoomCount || 0)} />
                <SummaryCard icon={DoorOpen} label="Phòng trống" value={loading ? "..." : Number(data?.totalVacantRoomCount || 0)} />
                <SummaryCard icon={Building2} label="Tỷ lệ lấp đầy" value={loading ? "..." : occupancyRate} />
            </section>

            <section className="overflow-hidden rounded-lg border border-[#dce2ec] bg-white">
                <div className="border-b border-[#dce2ec] px-6 py-5">
                    <h2 className="text-lg font-bold">Hiệu suất theo tầng</h2>
                </div>
                <div className="dashboard-table">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#eef3fb] text-xs font-bold uppercase text-[#4b5563]">
                            <tr>
                                <th className="px-6 py-4">Tầng</th>
                                <th className="px-6 py-4 text-right">Tổng phòng</th>
                                <th className="px-6 py-4 text-right">Phòng trống</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e2e8f0]">
                            {(data?.floorEfficiencies || []).map((floor) => (
                                <tr key={floor.floorName}>
                                    <td className="px-6 py-4 font-bold">{floor.floorName}</td>
                                    <td className="px-6 py-4 text-right">{floor.roomCount ?? 0}</td>
                                    <td className="px-6 py-4 text-right">{floor.vacantRoomCount ?? 0}</td>
                                </tr>
                            ))}
                            {!loading && !error && (data?.floorEfficiencies || []).length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-[#6b7280]">
                                        Chưa có dữ liệu tầng.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}