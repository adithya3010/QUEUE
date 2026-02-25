"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { socket } from "@/services/socket";
import Loader from "@/components/Loader";
import { Users, User, UserPlus, FileText, Hash, CheckCircle, XCircle, ChevronUp, ChevronDown, Copy, AlertTriangle, Stethoscope } from "lucide-react";

export default function ReceptionPanel() {
    const [user, setUser] = useState<any>(null);
    const [assignedDoctors, setAssignedDoctors] = useState<any[]>([]);

    // The currently selected doctor context for the queue
    const [doctorId, setDoctorId] = useState<string | null>(null);

    const [patientName, setPatientName] = useState("");
    const [patientNumber, setPatientNumber] = useState("");
    const [description, setDescription] = useState("");
    const [queue, setQueue] = useState<any[]>([]);
    const [msg, setMsg] = useState("");
    const [queueLoading, setQueueLoading] = useState(true);

    useEffect(() => {
        const initializePanel = async () => {
            try {
                // 1. Fetch current logged-in user details to get their role and hospital context
                const userRes = await api.get("/auth/me").catch(() => null);

                // Fallback for legacy local storage if the new endpoint isn't ready
                let currentUser = userRes?.data;
                if (!currentUser) {
                    const legacyDocId = localStorage.getItem("doctorId");
                    const role = localStorage.getItem("role") || "DOCTOR";
                    if (legacyDocId) {
                        currentUser = { id: legacyDocId, role };
                    } else {
                        return; // Not logged in
                    }
                }

                setUser(currentUser);

                // 2. Setup Doctor Context
                if (currentUser.role === "RECEPTIONIST") {
                    // Fetch list of assigned doctors this receptionist can manage
                    // Requires a new endpoint, or we can use the existing /admin/staff if authorized, 
                    // but for now let's assume `currentUser.assignedDoctors` is populated or we fetch a specific route
                    const staffRes = await api.get("/reception/doctors").catch(() => ({ data: [] }));
                    setAssignedDoctors(staffRes.data || []);

                    // Auto-select first doctor if available
                    if (staffRes.data && staffRes.data.length > 0) {
                        setDoctorId(staffRes.data[0]._id);
                    }
                } else {
                    // User is a DOCTOR (or HOSPITAL_ADMIN falling back to legacy)
                    setDoctorId(currentUser.id);
                }
            } catch (err) {
                console.error("Failed to initialize reception panel", err);
            }
        };

        initializePanel();
    }, []);

    // Re-run the queue fetching whenever the selected doctor changes
    useEffect(() => {
        if (!doctorId) return;

        socket.connect();
        socket.emit("joinDoctorRoom", doctorId);

        const loadQueue = async () => {
            try {
                setQueueLoading(true);
                const res = await api.get(`/queue/${doctorId}`);
                setQueue(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setQueueLoading(false);
            }
        };

        loadQueue();

        const handleQueueUpdated = () => loadQueue();
        const handleDoctorAvailability = (status) => {
            if (status === "Not Available") {
                setMsg("⚠️ Doctor is currently Not Available. Queue Paused");
            } else {
                setMsg("✅ Doctor Available. Queue Resumed");
                loadQueue();
            }
            setTimeout(() => setMsg(""), 3000);
        };

        socket.on("queueUpdated", handleQueueUpdated);
        socket.on("doctorAvailabilityChanged", handleDoctorAvailability);

        return () => {
            socket.off("queueUpdated", handleQueueUpdated);
            socket.off("doctorAvailabilityChanged", handleDoctorAvailability);
        };
    }, []);

    async function addPatient(e: any) {
        e.preventDefault();
        try {
            await api.post("/queue/add", {
                name: patientName,
                description,
                number: patientNumber,
                doctorId: doctorId // Required for RECEPTIONIST role
            });
            setMsg("Patient Added Successfully 🎉");
            setPatientName("");
            setPatientNumber("");
            setDescription("");
            setTimeout(() => setMsg(""), 2000);
        } catch (err) {
            setMsg("❌ Failed to add patient");
            setTimeout(() => setMsg(""), 2000);
        }
    }

    async function completePatient(id) {
        await api.put(`/queue/complete/${id}`);
    }

    async function cancelPatient(id) {
        await api.put(`/queue/cancel/${id}`);
    }

    async function moveUp(index) {
        if (index === 0) return;
        const topThree = [...queue.slice(0, 3)];
        [topThree[index - 1], topThree[index]] = [topThree[index], topThree[index - 1]];
        await api.put(`/queue/reorder/${doctorId}`, { newOrder: topThree.map(p => p._id) });
    }

    async function moveDown(index) {
        if (index === 2) return;
        const topThree = [...queue.slice(0, 3)];
        [topThree[index + 1], topThree[index]] = [topThree[index], topThree[index + 1]];
        await api.put(`/queue/reorder/${doctorId}`, { newOrder: topThree.map(p => p._id) });
    }

    if (!doctorId) return <Loader />;

    return (
        <div className="w-full min-h-screen bg-[#060c21] text-white selection:bg-blue-500/30 relative overflow-x-hidden pt-10">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/10 blur-[150px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto px-6 pb-20 pt-10 relative z-10 animate-fade-up">

                <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                            <Users className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Reception Panel</h2>
                            <p className="text-gray-400 font-medium mt-1">Manage patients and queue order in real-time</p>
                        </div>
                    </div>

                    {/* Doctor Selector for Receptionists */}
                    {user?.role === "RECEPTIONIST" && (
                        <div className="flex items-center gap-3 bg-black/40 border border-white/10 p-2 pl-4 rounded-2xl backdrop-blur-md">
                            <Stethoscope className="w-5 h-5 text-gray-400" />
                            <select
                                value={doctorId || ""}
                                onChange={(e) => setDoctorId(e.target.value)}
                                className="bg-transparent text-white font-bold outline-none border-none pr-4 cursor-pointer appearance-none"
                            >
                                {assignedDoctors.length === 0 && <option value="" disabled>No Doctors Assigned</option>}
                                {assignedDoctors.map(doc => (
                                    <option key={doc._id} value={doc._id} className="bg-[#0f172a] text-white">
                                        {doc.name} - {doc.specialization}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-500 mr-2 pointer-events-none" />
                        </div>
                    )}
                </div>

                {msg && (
                    <div className={`mb-8 p-4 rounded-xl border font-semibold animate-fade-up flex items-center gap-3 backdrop-blur-md shadow-lg
                        ${msg.includes("⚠️") || msg.includes("❌")
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        }`}>
                        {msg}
                    </div>
                )}

                <div className="grid lg:grid-cols-4 gap-8">

                    {/* Add Patient Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] sticky top-28">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
                                <UserPlus className="w-5 h-5 text-cyan-400" /> New Patient
                            </h3>

                            <form onSubmit={addPatient} className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pl-1 block">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-500" />
                                        <input
                                            className="w-full pl-11 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-white placeholder-gray-500 shadow-inner transition-all"
                                            placeholder="John Doe"
                                            value={patientName}
                                            onChange={e => setPatientName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pl-1 block">Phone Number</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-500" />
                                        <input
                                            className="w-full pl-11 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-white placeholder-gray-500 shadow-inner transition-all"
                                            placeholder="+1 234 567 890"
                                            value={patientNumber}
                                            onChange={e => setPatientNumber(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pl-1 block">Description</label>
                                    <div className="relative">
                                        <FileText className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-500" />
                                        <input
                                            className="w-full pl-11 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none text-white placeholder-gray-500 shadow-inner transition-all"
                                            placeholder="Symptoms or reason"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button className="w-full py-4 mt-2 rounded-xl font-bold bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,0.4)] border border-blue-400/50 transition-transform active:scale-95 flex items-center justify-center gap-2">
                                    <UserPlus className="w-5 h-5" /> Add Patient
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Queue List */}
                    <div className="lg:col-span-3">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] min-h-[500px] flex flex-col">

                            <div className="flex justify-between items-center mb-6 px-2 border-b border-white/5 pb-4">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Users className="w-5 h-5 text-cyan-400" /> Live Queue
                                    <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-xs ml-2">
                                        {queue.length} Total
                                    </span>
                                </h3>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20 flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-white/5 border-b border-white/10">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Token</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Patient Details</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ETA</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tracking Link</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {queueLoading ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-24 text-center">
                                                    <div className="inline-flex flex-col items-center justify-center">
                                                        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
                                                        <span className="mt-4 text-gray-400 font-bold text-xs tracking-widest">SYNCING LIVE QUEUE...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : queue.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-24 text-center">
                                                    <div className="inline-flex flex-col items-center justify-center text-gray-500">
                                                        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/5 shadow-inner">
                                                            <Users className="w-8 h-8 opacity-50" />
                                                        </div>
                                                        <span className="font-semibold text-gray-400 text-sm">Queue is currently empty</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            queue.map((p, idx) => {
                                                const link = typeof window !== 'undefined' ? `${window.location.origin}/status/${p.uniqueLinkId}` : "";
                                                const isTopThree = idx < 3;
                                                return (
                                                    <tr key={p._id} className={`group transition-all hover:bg-white/5 ${isTopThree ? "bg-emerald-500/5 relative" : ""}`}>

                                                        {/* Token */}
                                                        <td className="px-6 py-4 align-middle relative">
                                                            {isTopThree && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
                                                            <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl font-black text-lg border ${isTopThree
                                                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                                                : "bg-white/5 text-gray-300 border-white/10 shadow-inner"
                                                                }`}>
                                                                {p.tokenNumber}
                                                            </span>
                                                        </td>

                                                        {/* Details */}
                                                        <td className="px-6 py-4 align-middle">
                                                            <p className="font-bold text-white text-base">{p.name}</p>
                                                            {p.description && <p className="text-sm text-gray-400 truncate max-w-[200px] mt-1">{p.description}</p>}
                                                        </td>

                                                        {/* Wait Time */}
                                                        <td className="px-6 py-4 align-middle">
                                                            <span className="inline-flex items-center font-bold text-gray-300 bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg shadow-inner text-sm">
                                                                {p.waitMinutes ?? "--"} m
                                                            </span>
                                                        </td>

                                                        {/* Link */}
                                                        <td className="px-6 py-4 align-middle">
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(link);
                                                                    setMsg(`Copied tracking link for ${p.name}`);
                                                                    setTimeout(() => setMsg(""), 2000);
                                                                }}
                                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                                                            >
                                                                <Copy className="w-4 h-4" /> Copy
                                                            </button>
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="px-6 py-4 align-middle text-right flex items-center justify-end gap-2">
                                                            {isTopThree && (
                                                                <div className="flex flex-col gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => moveUp(idx)} className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 transition-colors border border-transparent hover:border-white/10" title="Move Up"><ChevronUp className="w-4 h-4" /></button>
                                                                    <button onClick={() => moveDown(idx)} className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 transition-colors border border-transparent hover:border-white/10" title="Move Down"><ChevronDown className="w-4 h-4" /></button>
                                                                </div>
                                                            )}
                                                            <button
                                                                onClick={() => completePatient(p._id)}
                                                                className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 shadow-sm transition-transform active:scale-95" title="Mark Completed"
                                                            >
                                                                <CheckCircle className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => cancelPatient(p._id)}
                                                                className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 shadow-sm transition-transform active:scale-95" title="Cancel Patient"
                                                            >
                                                                <XCircle className="w-5 h-5" />
                                                            </button>
                                                        </td>

                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
