"use client";

import React, { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import { io } from "socket.io-client";
import {
    Activity, AlertCircle, AlertTriangle, ArrowUp, Calendar, CheckCircle, Clock, FileText, Mail, Power, RefreshCw, Settings, Stethoscope, TrendingUp, User, Users, X
} from "lucide-react";

export default function DoctorDashboard() {
    const [doctor, setDoctor] = useState<any>(null);
    const [queue, setQueue] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);

    // Completion state
    const [completingPatient, setCompletingPatient] = useState<any>(null);
    const [nextVisitDate, setNextVisitDate] = useState("");
    const [msg, setMsg] = useState("");
    const [avgTime, setAvgTime] = useState("");
    const [pauseMessage, setPauseMessage] = useState("");
    const router = useRouter();

    async function loadDoctor() {
        try {
            const meRes = await api.get("/auth/me");
            const userData = meRes.data;

            if (userData.role !== "DOCTOR" && userData.role !== "HOSPITAL_ADMIN") {
                router.push("/reception");
                return;
            }

            const res = await api.get("/doctors/info");
            setDoctor(res.data);
            setAvgTime(res.data.avgConsultationTime?.toString() || "5");
        } catch (err: any) {
            if (err.response?.status === 401) router.push("/login");
        }
    }

    const loadQueue = useCallback(async () => {
        if (!doctor?._id) return;
        try {
            const res = await api.get(`/queue/${doctor._id}`);
            setQueue(res.data);
        } catch (err) {
            console.error("Load queue error", err);
        }
    }, [doctor?._id]);

    const loadSummary = useCallback(async () => {
        try {
            const res = await api.get("/queue/summary/today");
            setSummary(res.data);
        } catch (err) {
            console.error("Load summary error", err);
        }
    }, []);

    useEffect(() => { loadDoctor(); }, []);

    useEffect(() => {
        if (!doctor?._id) return;
        loadQueue();
        loadSummary();

        const socket = io("http://localhost:5000", { transports: ["websocket"] });
        socket.on("connect", () => { });
        socket.on("queueUpdated", () => {
            loadQueue();
            loadSummary();
        });

        return () => { socket.disconnect(); };
    }, [doctor?._id]);

    async function updateAvgTime() {
        try {
            await api.put("/doctors/update-avg-time", { avgTime: Number(avgTime) });
            setDoctor((prev: any) => ({ ...prev, avgConsultationTime: Number(avgTime) }));
            showMsg("Average Consultation Time Updated!");
        } catch (err) { console.error(err); }
    }

    async function changeAvailability(state: string) {
        try {
            await api.put("/doctors/availability", {
                availability: state,
                pauseMessage: state === "Not Available" ? pauseMessage : ""
            });
            setDoctor((prev: any) => ({
                ...prev,
                availability: state,
                pauseMessage: state === "Not Available" ? pauseMessage : ""
            }));
            if (state === "Available") setPauseMessage("");
            showMsg(`Availability changed to: ${state}`);
        } catch (err) { console.error(err); }
    }

    async function prioritisePatient(patientId: string) {
        try {
            await api.put(`/queue/prioritise/${patientId}`);
            showMsg("Patient moved to top of queue");
            loadQueue();
        } catch (err) {
            showMsg("Error prioritising patient");
        }
    }

    async function handleCompletePatient() {
        if (!completingPatient) return;
        try {
            await api.put(`/queue/complete/${completingPatient._id}`, {
                nextVisitDate: nextVisitDate || null
            });
            setCompletingPatient(null);
            setNextVisitDate("");
            loadQueue();
            loadSummary();
            showMsg("Patient visit completed!");
        } catch (err) { console.error(err); }
    }

    function showMsg(text: string) {
        setMsg(text);
        setTimeout(() => setMsg(""), 3000);
    }

    if (!doctor) return <Loader />;

    return (
        <div className="w-full min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-info-50 dark:bg-info-500/20 border border-info-200 dark:border-info-500/30 rounded-xl flex items-center justify-center shadow-sm">
                        <Stethoscope className="w-6 h-6 text-info-600 dark:text-info-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-white">Doctor Dashboard</h1>
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium mt-0.5">Dr. {doctor.name} — {doctor.specialization}</p>
                    </div>
                </div>

                {msg && (
                    <div className="mb-6 p-4 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 dark:bg-brand-500/10 dark:border-brand-500/30 dark:text-brand-400 font-semibold animate-fade-up flex items-center gap-2 text-sm shadow-sm">
                        <CheckCircle className="w-4 h-4" /> {msg}
                    </div>
                )}

                {/* Today's Summary — 4 stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        {
                            label: "Seen Today", value: summary?.completed ?? "–",
                            icon: <CheckCircle className="w-6 h-6 text-success-500" />,
                            color: "bg-success-50 dark:bg-success-500/10 border-success-200 dark:border-success-500/20 text-success-700 dark:text-success-400"
                        },
                        {
                            label: "Still Waiting", value: summary?.waiting ?? "–",
                            icon: <Users className="w-6 h-6 text-brand-500" />,
                            color: "bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/20 text-brand-700 dark:text-brand-400"
                        },
                        {
                            label: "Avg. Consult", value: summary?.avgConsultTime ? `${summary.avgConsultTime}m` : "–",
                            icon: <Clock className="w-6 h-6 text-info-500" />,
                            color: "bg-info-50 dark:bg-info-500/10 border-info-200 dark:border-info-500/20 text-info-700 dark:text-info-400"
                        },
                        {
                            label: "Busiest Hour", value: summary?.busiestHour ?? "–",
                            icon: <TrendingUp className="w-6 h-6 text-warning-500" />,
                            color: "bg-warning-50 dark:bg-warning-500/10 border-warning-200 dark:border-warning-500/20 text-warning-700 dark:text-warning-400"
                        },
                    ].map(({ label, value, icon, color }) => (
                        <div key={label} className={`bg-white dark:bg-neutral-800 border rounded-2xl p-5 shadow-sm flex flex-col gap-2 transition-colors ${color}`}>
                            <div className="flex items-center justify-between">
                                {icon}
                                <span className="text-2xl font-black">{value}</span>
                            </div>
                            <p className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400 mt-1">{label}</p>
                        </div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-3 gap-6">

                    {/* Settings column */}
                    <div className="space-y-6">

                        {/* Availability */}
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Settings className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Queue Mode</h3>
                            </div>
                            <div className="flex gap-3 mb-4">
                                <button
                                    onClick={() => changeAvailability("Available")}
                                    className={`flex-1 py-3 rounded-xl font-bold border transition-all text-sm shadow-sm ${doctor.availability === "Available"
                                        ? "border-success-300 dark:border-success-500/50 bg-success-50 dark:bg-success-500/10 text-success-700 dark:text-success-400"
                                        : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-500 hover:border-success-300"}`}
                                >
                                    ✓ Available
                                </button>
                                <button
                                    onClick={() => changeAvailability("Not Available")}
                                    className={`flex-1 py-3 rounded-xl font-bold border transition-all text-sm shadow-sm ${doctor.availability === "Not Available"
                                        ? "border-danger-300 dark:border-danger-500/50 bg-danger-50 dark:bg-danger-500/10 text-danger-700 dark:text-danger-400"
                                        : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-500 hover:border-danger-300"}`}
                                >
                                    ⏸ Paused
                                </button>
                            </div>

                            {doctor.availability === "Not Available" && (
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 block">
                                        Broadcast to Patients <span className="text-neutral-400">(optional)</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            value={pauseMessage}
                                            onChange={(e) => setPauseMessage(e.target.value)}
                                            placeholder="e.g. Back in 20 minutes"
                                            maxLength={200}
                                            className="flex-1 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 outline-none text-sm"
                                        />
                                        <button
                                            onClick={() => changeAvailability("Not Available")}
                                            className="px-4 py-2 rounded-xl bg-danger-600 hover:bg-danger-700 text-white font-bold text-sm transition-all"
                                        >
                                            Send
                                        </button>
                                    </div>
                                    {doctor.pauseMessage && (
                                        <p className="mt-2 text-xs text-danger-600 dark:text-danger-400 font-semibold">
                                            Broadcasting: &ldquo;{doctor.pauseMessage}&rdquo;
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Consultation Time */}
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Consultation Time</h3>
                            </div>
                            <div className="flex flex-col gap-3 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-brand-600 dark:text-brand-400">{doctor.avgConsultationTime || 5}</span>
                                    <span className="text-sm font-bold text-neutral-400">min avg</span>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="number" min="1"
                                        value={avgTime}
                                        onChange={(e) => setAvgTime(e.target.value)}
                                        className="w-20 px-3 py-2 rounded-lg text-center font-bold text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 focus:ring-2 focus:ring-brand-500/50 outline-none text-sm"
                                        placeholder="Mins"
                                    />
                                    <button
                                        onClick={updateAvgTime}
                                        className="flex-1 px-4 py-2 rounded-lg font-bold bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white shadow-md transition-all text-sm"
                                    >
                                        Update
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Profile info */}
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <User className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Profile</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-3 rounded-xl">
                                    <Mail className="w-4 h-4 text-neutral-400" />
                                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">{doctor.email}</span>
                                </div>
                                <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-3 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Activity className="w-4 h-4 text-neutral-400" />
                                        <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Status</span>
                                    </div>
                                    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-black rounded-md border ${doctor.availability === "Available"
                                        ? "bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400 border-success-200 dark:border-success-500/30"
                                        : "bg-danger-100 dark:bg-danger-500/20 text-danger-700 dark:text-danger-400 border-danger-200 dark:border-danger-500/30"}`}>
                                        {doctor.availability || "Available"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Live Queue — with priority flag */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm min-h-[400px]">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-700">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-brand-500 animate-pulse" />
                                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">My Live Queue</h3>
                                    <span className="px-2.5 py-0.5 text-xs font-black bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 rounded-full">
                                        {queue.length} waiting
                                    </span>
                                </div>
                            </div>

                            {queue.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-900 rounded-3xl flex items-center justify-center mb-4 border border-neutral-200 dark:border-neutral-800">
                                        <Calendar className="w-10 h-10 text-neutral-300 dark:text-neutral-600" />
                                    </div>
                                    <h4 className="text-lg font-bold text-neutral-600 dark:text-neutral-300">Queue is Clear</h4>
                                    <p className="text-neutral-500 text-sm mt-1">No patients waiting right now.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {queue.map((p: any, idx: number) => (
                                        <div
                                            key={p._id}
                                            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${idx === 0
                                                ? "bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/30"
                                                : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 hover:border-brand-200 dark:hover:border-brand-500/30"}`}
                                        >
                                            {/* Token badge */}
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 ${idx === 0
                                                ? "bg-brand-600 dark:bg-brand-500 text-white shadow-md"
                                                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"}`}>
                                                {p.tokenNumber}
                                            </div>

                                            {/* Patient info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-neutral-900 dark:text-white truncate">{p.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                                                        ~{p.estimatedWait ?? (idx * (doctor.avgConsultationTime || 5))} min wait
                                                    </span>
                                                    {p.notes && (
                                                        <span className="px-2 py-0.5 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-500/30 text-info-700 dark:text-info-400 rounded text-[10px] font-semibold truncate max-w-[140px]">
                                                            📋 {p.notes}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {/* Priority flag — only show on patients NOT already #1 */}
                                                {idx > 0 && (
                                                    <button
                                                        onClick={() => prioritisePatient(p._id)}
                                                        title="Move to top"
                                                        className="p-2 rounded-lg border border-warning-200 dark:border-warning-500/30 bg-warning-50 dark:bg-warning-500/10 hover:bg-warning-100 dark:hover:bg-warning-500/20 text-warning-600 dark:text-warning-400 transition-colors"
                                                    >
                                                        <ArrowUp className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {/* Complete button — only for #1 patient */}
                                                {idx === 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setCompletingPatient(p);
                                                            setNextVisitDate("");
                                                        }}
                                                        title="Mark as seen"
                                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-success-200 dark:border-success-500/30 bg-success-50 dark:bg-success-500/10 hover:bg-success-100 dark:hover:bg-success-500/20 text-success-700 dark:text-success-400 font-bold text-xs transition-colors"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        Done
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Complete Visit Modal */}
            {completingPatient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Complete Visit</h2>
                                <p className="text-sm font-medium text-brand-600 dark:text-brand-400">{completingPatient.name}</p>
                            </div>
                            <button onClick={() => setCompletingPatient(null)} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <label className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2 block">
                                Set Return Visit <span className="text-neutral-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                value={nextVisitDate}
                                onChange={(e) => setNextVisitDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 outline-none transition-all"
                            />
                            <p className="text-xs text-neutral-500 mt-2">
                                If set, the patient will receive an automated WhatsApp reminder one day before this date.
                            </p>
                        </div>

                        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end gap-3">
                            <button
                                onClick={() => setCompletingPatient(null)}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCompletePatient}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-success-600 hover:bg-success-700 text-white shadow-md transition-all active:scale-95 flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" /> Finalize
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
