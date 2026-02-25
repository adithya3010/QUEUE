"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { BarChart3, TrendingDown, Users, CheckCircle2, Stethoscope } from "lucide-react";

export default function AnalyticsDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await api.get("/hospitals/analytics");
                if (res.data.success) {
                    setStats(res.data.data);
                }
            } catch (err) {
                console.error("Failed to load analytics", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="w-full max-w-6xl mx-auto px-6 pb-20 pt-8 animate-fadeIn flex justify-center mt-20">
                <div className="w-16 h-16 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="w-full max-w-6xl mx-auto px-6 pb-20 pt-8 animate-fadeIn">
            <div className="mb-10">
                <h2 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-fuchsia-500 to-pink-500 bg-clip-text text-transparent flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-fuchsia-500" /> Executive Analytics
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">30-Day performance overview for your hospital.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

                <div className="bg-white/80 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 blur-[50px] rounded-full pointer-events-none" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500">
                            <Users className="w-6 h-6" />
                        </div>
                        <h3 className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-sm">Total Visits</h3>
                    </div>
                    <p className="text-5xl font-black text-gray-900 dark:text-white drop-shadow-sm">{stats.totalVisits.toLocaleString()}</p>
                </div>

                <div className="bg-white/80 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-sm">Completed</h3>
                    </div>
                    <p className="text-5xl font-black text-gray-900 dark:text-white drop-shadow-sm">{stats.completed.toLocaleString()}</p>
                </div>

                <div className="bg-white/80 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 dark:bg-red-500/5 blur-[50px] rounded-full pointer-events-none" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500">
                            <TrendingDown className="w-6 h-6" />
                        </div>
                        <h3 className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-sm">Drop-off Rate</h3>
                    </div>
                    <p className="text-5xl font-black text-gray-900 dark:text-white drop-shadow-sm">{stats.dropOffRate}%</p>
                    <p className="text-sm mt-2 text-gray-500">Percent of queue cancellations/no-shows</p>
                </div>

            </div>

            {/* Charts Section (Simulated with bars) */}
            <div className="grid lg:grid-cols-2 gap-8">

                <div className="border border-black/5 dark:border-white/10 bg-white/80 dark:bg-[#110c21] backdrop-blur-xl rounded-3xl p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 dark:bg-fuchsia-500/5 blur-[80px] rounded-full pointer-events-none" />
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                        <Stethoscope className="w-6 h-6 text-fuchsia-500" /> Patient Volume by Doctor
                    </h3>

                    {stats.volumeByDoctor.length === 0 ? (
                        <p className="text-gray-500">No data available for this period.</p>
                    ) : (
                        <div className="space-y-6 relative z-10 w-full">
                            {stats.volumeByDoctor.map((item: any, i: number) => {
                                // Find highest count for relative bar width
                                const maxCount = Math.max(...stats.volumeByDoctor.map((v: any) => v.patientCount));
                                const pct = (item.patientCount / maxCount) * 100;

                                return (
                                    <div key={i}>
                                        <div className="flex justify-between text-sm mb-2 font-bold">
                                            <span className="text-gray-700 dark:text-gray-300">{item.doctorName}</span>
                                            <span className="text-fuchsia-600 dark:text-fuchsia-400">{item.patientCount} pts</span>
                                        </div>
                                        <div className="h-3 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-full shadow-[0_0_10px_rgba(217,70,239,0.5)] transition-all duration-1000 ease-out"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="border border-black/5 dark:border-white/10 bg-white/80 dark:bg-[#110c21] backdrop-blur-xl rounded-3xl p-8 shadow-xl flex items-center justify-center flex-col text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/20">
                        <BarChart3 className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">More Insights Coming Soon</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md">We are continuously aggregating your clinic data. Advanced visualizations like Wait Time Heatmaps and Queue Bottlenecks will appear here shortly.</p>
                </div>

            </div>

        </div>
    );
}
