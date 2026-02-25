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
        <div className="w-full min-h-screen text-white selection:bg-primary-500/30 relative overflow-x-hidden">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-light-blue-500/20 to-primary-500/20 border border-light-blue-500/30 rounded-xl flex items-center justify-center">
                            <Stethoscope className="w-6 h-6 text-light-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                                Doctor Dashboard
                            </h1>
                            <p className="text-gray-400 text-sm font-medium mt-0.5">Manage availability & consultation settings</p>
                        </div>
                    </div>
                </div>

                {msg && (
                    <div className="mb-6 p-4 rounded-xl bg-primary-500/10 border border-primary-500/30 text-light-blue-400 font-semibold animate-fade-up flex items-center justify-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4" /> {msg}
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-6">

                    {/* Profile Card */}
                    <div className="md:col-span-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-light-blue-500/20 to-primary-500/20 border border-light-blue-500/30 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-light-blue-500/10">
                                <Stethoscope className="w-10 h-10 text-light-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">{doctor.name}</h3>
                            <p className="text-light-blue-400 font-semibold mt-1 text-sm">{doctor.specialization}</p>

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
                                    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-black rounded-md shadow-inner border border-white/5 ${doctor.availability === "Available" ? "bg-success-500/20 text-success-400 shadow-[0_0_10px_rgba(18,152,32,0.3)]" : "bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)]"}`}>
                                        {doctor.availability || "Not Configured"}
                                    </span>
                                </div>
                            </div>


                        </div>
                    </div>

                    {/* Settings Area */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Availability Settings */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Settings className="w-5 h-5 text-light-blue-400" />
                                <h3 className="text-lg font-bold text-white">Queue Mode</h3>
                            </div>

                            <p className="text-gray-400 mb-5 text-sm">
                                Control whether reception can add patients to your queue.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => changeAvailability("Available")}
                                    className={`flex-1 py-3 rounded-xl font-bold border transition-all text-sm ${doctor.availability === "Available"
                                        ? "border-success-500/50 bg-success-500/10 text-success-400"
                                        : "border-white/10 bg-black/20 text-gray-400 hover:border-success-500/30"
                                        }`}
                                >
                                    Available
                                </button>
                                <button
                                    onClick={() => changeAvailability("Not Available")}
                                    className={`flex-1 py-3 rounded-xl font-bold border transition-all text-sm ${doctor.availability === "Not Available"
                                        ? "border-red-500/50 bg-red-500/10 text-red-400"
                                        : "border-white/10 bg-black/20 text-gray-400 hover:border-red-500/30"
                                        }`}
                                >
                                    Paused
                                </button>
                            </div>
                        </div>

                        {/* Consultation Time Settings */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-5 h-5 text-light-blue-400" />
                                <h3 className="text-lg font-bold text-white">Consultation Time</h3>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-black/30 rounded-xl border border-white/10">
                                <div>
                                    <p className="text-gray-500 text-xs font-semibold mb-1">Current Average</p>
                                    <p className="text-3xl font-black text-light-blue-400">
                                        {doctor.avgConsultationTime || "--"} <span className="text-sm font-semibold text-gray-500">minutes</span>
                                    </p>
                                </div>

                                <div className="flex gap-2 w-full sm:w-auto">
                                    <input
                                        type="number"
                                        min="1"
                                        value={avgTime}
                                        onChange={(e) => setAvgTime(e.target.value)}
                                        className="w-20 px-3 py-2 rounded-lg text-center font-bold text-white bg-black/50 border border-white/10 focus:ring-2 focus:ring-primary-500/50 outline-none transition-all text-sm"
                                        placeholder="Mins"
                                    />
                                    <button
                                        onClick={updateAvgTime}
                                        className="px-5 py-2 rounded-lg font-bold bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white shadow-lg shadow-primary-500/30 transition-all active:scale-95 text-sm"
                                    >
                                        Update
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
