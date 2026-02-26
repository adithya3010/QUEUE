"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Loader from "@/components/Loader";
import { Users, Activity, Stethoscope } from "lucide-react";

const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type DoctorDisplay = {
    doctorId: string;
    doctorName: string;
    specialization: string;
    servingToken: number | string;
    nextTokens: number[];
};

export default function KioskDisplayMode() {
    const { hospitalId } = useParams();
    const [doctors, setDoctors] = useState<DoctorDisplay[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchDisplayData = async () => {
        try {
            const res = await fetch(`${NEXT_PUBLIC_API_URL}/kiosk/${hospitalId}/display`);
            const data = await res.json();
            if (data.success) {
                setDoctors(data.data);
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.error("Display fetch error:", err);
            // Optionally show toast, but maybe not on a TV
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!hospitalId) return;

        // Fetch immediately
        fetchDisplayData();

        // Setup polling every 10 seconds
        const intervalId = setInterval(fetchDisplayData, 10000);

        return () => clearInterval(intervalId);
    }, [hospitalId]);

    // Setup full screen toggle
    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    if (loading) return <Loader />;

    return (
        <div
            className="min-h-screen bg-[#060c21] text-white p-8 md:p-12 relative flex flex-col overflow-hidden"
            onClick={toggleFullScreen}
        >
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-600/20 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[150px] rounded-full pointer-events-none" />

            {/* Header */}
            <header className="flex items-center justify-between mb-12 relative z-10 bg-neutral-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                        <Activity className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white mb-1">
                            Live Patient Queue
                        </h1>
                        <p className="text-xl text-brand-300 font-bold">
                            Please check your screen for your token number
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-5xl font-black font-mono text-white mb-1">
                        {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-lg font-bold text-neutral-400">
                        {lastUpdated.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                </div>
            </header>

            {/* Grid */}
            <main className="flex-1 relative z-10">
                {doctors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Stethoscope className="w-24 h-24 text-neutral-700 mb-6" />
                        <h2 className="text-4xl font-bold text-neutral-500">No active queues right now</h2>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 h-full auto-rows-max">
                        {doctors.map((doc) => (
                            <div
                                key={doc.doctorId}
                                className="bg-gradient-to-br from-neutral-900/90 to-black/90 backdrop-blur-xl border-2 border-white/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col transition-all duration-500"
                            >
                                <div className="border-b border-white/10 pb-6 mb-6">
                                    <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2 truncate">
                                        Dr. {doc.doctorName}
                                    </h2>
                                    <p className="text-xl text-neutral-400 font-semibold">{doc.specialization}</p>
                                </div>

                                <div className="flex-1 flex flex-col justify-center items-center py-6 bg-black/40 rounded-3xl mb-8 border border-white/5 relative overflow-hidden">
                                    {/* Subtle pulse behind the main number */}
                                    <div className="absolute inset-0 bg-brand-500/5 animate-pulse rounded-3xl"></div>
                                    <p className="text-lg font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4 relative z-10">
                                        Now Serving
                                    </p>
                                    <p className={`text-[7rem] leading-none font-black tracking-tight relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] ${doc.servingToken === '---' ? 'text-neutral-600' : 'text-white'}`}>
                                        {doc.servingToken}
                                    </p>
                                </div>

                                <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl p-6">
                                    <p className="text-sm font-bold text-brand-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Users className="w-4 h-4" /> Next In Line
                                    </p>
                                    <div className="flex gap-4">
                                        {[0, 1, 2].map((index) => {
                                            const hasToken = index < doc.nextTokens.length;
                                            return (
                                                <div
                                                    key={index}
                                                    className={`flex-1 aspect-square rounded-xl flex items-center justify-center text-3xl font-black ${hasToken ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'bg-white/5 text-neutral-600 border border-white/5'}`}
                                                >
                                                    {hasToken ? doc.nextTokens[index] : '-'}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <div className="fixed bottom-4 right-4 text-xs font-bold text-neutral-600 opacity-50 z-50 pointer-events-none">
                Tap anywhere to enter full screen
            </div>
        </div>
    );
}
