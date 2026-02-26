"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import Loader from "@/components/Loader";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Clock, CheckCircle, XCircle, Users, BarChart3, TrendingUp } from "lucide-react";

export default function AnalyticsDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const res = await api.get("/admin/analytics");
            setData(res.data);
        } catch (err) {
            console.error("Failed to load analytics", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !data) return <Loader />;

    const { dailyVolume, doctorPerformance, heatmap } = data;

    // Heatmap Preparation
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM commonly

    // Get max count for heatmap color scaling
    const maxHeatmapCount = Math.max(...heatmap.map((h: any) => h.count), 1);

    const getHeatmapColor = (count: number) => {
        if (!count) return "bg-neutral-800/40 border-white/5";
        const intensity = count / maxHeatmapCount;
        if (intensity < 0.2) return "bg-brand-500/20 border-brand-500/20";
        if (intensity < 0.5) return "bg-brand-500/40 border-brand-500/40";
        if (intensity < 0.8) return "bg-brand-500/70 border-brand-500/60 text-white";
        return "bg-brand-500 border-brand-400 text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.5)]";
    };

    // Calculate totals
    const totalPatients = doctorPerformance.reduce((acc: number, doc: any) => acc + doc.total, 0);
    const totalCompleted = doctorPerformance.reduce((acc: number, doc: any) => acc + (doc.completed || 0), 0);
    const totalCancelled = doctorPerformance.reduce((acc: number, doc: any) => acc + (doc.cancelled || 0), 0);
    const completedRate = totalPatients ? Math.round((totalCompleted / totalPatients) * 100) : 0;

    // Average wait overall
    const validWaitTimes = doctorPerformance.filter((d: any) => d.avgWaitTime != null).map((d: any) => d.avgWaitTime);
    const avgOverallWait = validWaitTimes.length ? Math.round(validWaitTimes.reduce((a: number, b: number) => a + b, 0) / validWaitTimes.length) : 0;

    return (
        <div className="w-full min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white transition-colors duration-300 relative overflow-x-hidden pt-8 pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                {/* Header */}
                <div className="mb-8 animate-fade-up">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-brand-500/20 to-indigo-500/20 border border-brand-500/30 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/10">
                            <BarChart3 className="w-6 h-6 text-brand-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-white">
                                Analytics Overview
                            </h1>
                            <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium mt-0.5">30-Day Hospital Performance Metrics</p>
                        </div>
                    </div>
                </div>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-brand-500" />
                            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Total Volume</h3>
                        </div>
                        <p className="text-3xl font-black text-white">{totalPatients}</p>
                    </div>

                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-success-500" />
                            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Completion Rate</h3>
                        </div>
                        <p className="text-3xl font-black text-success-400">{completedRate}%</p>
                    </div>

                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-2">
                            <XCircle className="w-5 h-5 text-danger-500" />
                            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Cancelled</h3>
                        </div>
                        <p className="text-3xl font-black text-danger-400">{totalCancelled}</p>
                    </div>

                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-5 h-5 text-info-500" />
                            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Avg Wait Time</h3>
                        </div>
                        <p className="text-3xl font-black text-info-400">{avgOverallWait} <span className="text-lg font-bold text-neutral-500 lowercase">min</span></p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 mb-8 animate-fade-up" style={{ animationDelay: '0.2s' }}>

                    {/* Patient Volume Line Chart */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp className="w-5 h-5 text-brand-500" />
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Daily Patient Volume</h3>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dailyVolume}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => val.slice(5)} // Show MM-DD
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                                        itemStyle={{ color: '#60a5fa' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={{ fill: '#3b82f6', r: 4 }}
                                        activeDot={{ r: 6, fill: '#60a5fa', stroke: '#fff', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Doctor Performance Bar Chart */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="w-5 h-5 text-success-500" />
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Completion by Doctor</h3>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={doctorPerformance}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis
                                        dataKey="doctorName"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <RechartsTooltip
                                        cursor={{ fill: '#ffffff05' }}
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                                    />
                                    <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                                    <Bar dataKey="cancelled" fill="#ef4444" radius={[4, 4, 0, 0]} name="Cancelled" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Heatmap Section */}
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm animate-fade-up" style={{ animationDelay: '0.3s' }}>
                    <div className="flex items-center gap-2 mb-6">
                        <Activity className="w-5 h-5 text-indigo-500" />
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Traffic Heatmap</h3>
                        <span className="text-xs text-neutral-500 ml-2">(Peak Hours)</span>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="min-w-[700px]">
                            {/* Hours Header */}
                            <div className="flex ml-16 mb-2">
                                {hours.map(h => (
                                    <div key={h} className="flex-1 text-center text-xs font-bold text-neutral-500">
                                        {h > 12 ? `${h - 12}p` : h === 12 ? '12p' : `${h}a`}
                                    </div>
                                ))}
                            </div>

                            {/* Grid */}
                            <div className="flex flex-col gap-1">
                                {days.map((dayName, dayIndex) => (
                                    <div key={dayName} className="flex items-center">
                                        <div className="w-16 text-xs font-bold text-neutral-400 text-right pr-4">{dayName}</div>
                                        <div className="flex-1 flex gap-1">
                                            {hours.map(hour => {
                                                const point = heatmap.find((h: any) => h.dayOfWeek === dayIndex && h.hourOfDay === hour);
                                                const count = point ? point.count : 0;
                                                return (
                                                    <div
                                                        key={`${dayIndex}-${hour}`}
                                                        title={`${dayName} ${hour}:00 - ${count} patients`}
                                                        className={`flex-1 h-8 md:h-10 rounded-md border flex items-center justify-center text-[10px] transition-all hover:scale-110 cursor-pointer ${getHeatmapColor(count)}`}
                                                    >
                                                        {count > 0 ? count : ""}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
