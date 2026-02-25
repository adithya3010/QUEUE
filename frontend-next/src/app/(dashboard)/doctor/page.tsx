"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import { User, Mail, Settings, Activity, Power, Clock, Stethoscope } from "lucide-react";

export default function DoctorDashboard() {
    const [doctor, setDoctor] = useState(null);
    const [msg, setMsg] = useState("");
    const [avgTime, setAvgTime] = useState("");
    const router = useRouter();

    async function loadDoctor() {
        try {
            // First fetch the unified User object
            const meRes = await api.get("/auth/me");
            const userData = meRes.data;

            if (userData.role !== "DOCTOR" && userData.role !== "HOSPITAL_ADMIN") {
                router.push("/reception"); // Not authorized for doctor dashboard
                return;
            }

            // Now fetch the queue/availability specifics needed for the dashboard
            const res = await api.get("/doctors/info");
            setDoctor(res.data);
            setAvgTime(res.data.avgConsultationTime);
        } catch (err: any) {
            console.error("Dashboard auth check failed", err);
            if (err.response?.status === 401) {
                router.push("/login");
            }
        }
    }

    async function updateAvgTime() {
        try {
            await api.put("/doctors/update-avg-time", { avgTime });
            setDoctor(prev => ({ ...prev, avgConsultationTime: avgTime }));
            setMsg("Average Consultation Time Updated!");
            setTimeout(() => setMsg(""), 2000);
        } catch (err) {
            console.error(err);
        }
    }

    useEffect(() => {
        loadDoctor();
    }, []);

    async function changeAvailability(state) {
        try {
            await api.put("/doctors/availability", { availability: state });
            setDoctor(prev => ({ ...prev, availability: state }));
            setMsg(`Availability changed to: ${state}`);
            setTimeout(() => setMsg(""), 2000);
        } catch (err) {
            console.error(err);
        }
    }

    async function logout() {
        try {
            await api.post("/auth/logout");
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            localStorage.removeItem("doctorId");
            localStorage.clear();
            router.push("/login");
        }
    }

    if (!doctor) return <Loader />;

    return (
        <div className="w-full min-h-screen bg-[#060c21] text-white selection:bg-blue-500/30 relative overflow-x-hidden pt-10">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[150px] rounded-full pointer-events-none" />

            <div className="max-w-5xl mx-auto px-6 pb-20 relative z-10 animate-fade-up">

                <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                            Doctor Profile
                        </h2>
                        <p className="text-gray-400 mt-2 font-medium">Manage your availability and settings</p>
                    </div>
                </div>

                {msg && (
                    <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-cyan-400 font-bold animate-fade-up flex items-center gap-3 shadow-inner">
                        <Activity className="w-5 h-5" /> {msg}
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-8">

                    {/* Profile Card */}
                    <div className="md:col-span-1 bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl p-8">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-full flex items-center justify-center mb-4 text-cyan-400 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                                <Stethoscope className="w-12 h-12" />
                            </div>
                            <h3 className="text-2xl font-black text-white">{doctor.name}</h3>
                            <p className="text-cyan-400 font-medium mt-1 uppercase tracking-widest text-xs">{doctor.specialization}</p>

                            <div className="mt-8 w-full space-y-4 text-left">
                                <div className="flex items-center gap-3 text-gray-300 bg-black/30 border border-white/10 p-3 rounded-xl shadow-inner">
                                    <Mail className="w-5 h-5 text-gray-500 shrink-0" />
                                    <span className="text-sm overflow-hidden text-ellipsis font-medium">{doctor.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-300 bg-black/30 border border-white/10 p-3 rounded-xl shadow-inner mb-4">
                                    <Stethoscope className="w-5 h-5 text-gray-500 shrink-0" />
                                    <span className="text-sm overflow-hidden text-ellipsis font-medium">Role: {doctor.role || "DOCTOR"}</span>
                                </div>
                                <div className="flex items-center justify-between text-gray-300 bg-black/30 border border-white/10 p-3 rounded-xl shadow-inner">
                                    <div className="flex items-center gap-3">
                                        <Activity className="w-5 h-5 text-gray-500" />
                                        <span className="text-sm font-bold">Status</span>
                                    </div>
                                    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-black rounded-md shadow-inner border border-white/5 ${doctor.availability === "Available" ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]"}`}>
                                        {doctor.availability || "Not Configured"}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={logout}
                                className="mt-8 w-full py-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Power className="w-5 h-5 text-red-400" /> Logout
                            </button>
                        </div>
                    </div>

                    {/* Settings Area */}
                    <div className="md:col-span-2 space-y-8">

                        {/* Availability Settings */}
                        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl p-8">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3 border-b border-white/5 pb-4">
                                <Settings className="w-6 h-6 text-cyan-400" /> Queue Mode
                            </h3>

                            <p className="text-gray-400 mb-6 text-sm font-medium">
                                Control whether the reception can add patients to your queue. Disabling this will pause the queue.
                            </p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => changeAvailability("Available")}
                                    className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all shadow-inner uppercase tracking-wider text-xs sm:text-sm ${doctor.availability === "Available"
                                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                        : "border-white/10 bg-black/20 text-gray-500 hover:border-emerald-500/30 hover:text-emerald-400/70"
                                        }`}
                                >
                                    Available Mode
                                </button>
                                <button
                                    onClick={() => changeAvailability("Not Available")}
                                    className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all shadow-inner uppercase tracking-wider text-xs sm:text-sm ${doctor.availability === "Not Available"
                                        ? "border-red-500/50 bg-red-500/10 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                        : "border-white/10 bg-black/20 text-gray-500 hover:border-red-500/30 hover:text-red-400/70"
                                        }`}
                                >
                                    Pause Queue
                                </button>
                            </div>
                        </div>

                        {/* Consultation Time Settings */}
                        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl p-8">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3 border-b border-white/5 pb-4">
                                <Clock className="w-6 h-6 text-cyan-400" /> Consultation Time
                            </h3>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-black/30 rounded-2xl border border-white/10 shadow-inner">
                                <div>
                                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Average Time</p>
                                    <p className="text-4xl font-black text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                                        {doctor.avgConsultationTime ? `${doctor.avgConsultationTime}` : "--"} <span className="text-lg font-bold text-gray-500">mins</span>
                                    </p>
                                </div>

                                <div className="flex gap-3 w-full sm:w-auto">
                                    <input
                                        type="number"
                                        min="1"
                                        value={avgTime}
                                        onChange={(e) => setAvgTime(e.target.value)}
                                        className="w-24 p-4 rounded-xl text-center font-black text-lg
                                            bg-black/50 border border-white/10 text-white
                                            focus:ring-2 focus:ring-blue-500/50 outline-none shadow-inner transition-all focus:border-blue-400"
                                        placeholder="Mins"
                                    />
                                    <button
                                        onClick={updateAvgTime}
                                        className="px-6 py-4 rounded-xl font-bold bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,0.4)] border border-blue-400/50 transition-transform active:scale-95 uppercase tracking-wider text-xs"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
