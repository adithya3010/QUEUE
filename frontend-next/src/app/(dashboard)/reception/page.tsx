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
                    const staffRes = await api.get("/admin/reception/doctors").catch(() => ({ data: [] }));
                    const doctors = staffRes.data || [];
                    setAssignedDoctors(doctors);

                    // Auto-select first doctor if available
                    if (doctors.length > 0) {
                        setDoctorId(doctors[0]._id);
                    } else {
                        // No doctors assigned - set a flag to show a message
                        setQueueLoading(false);
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
    }, [doctorId]);

    async function addPatient(e: any) {
        e.preventDefault();
        try {
            await api.post("/queue/add", {
                name: patientName,
                description: description || "",
                number: patientNumber,
                doctorId: doctorId // Required for RECEPTIONIST role
            });
            setMsg("Patient Added Successfully 🎉");
            setPatientName("");
            setPatientNumber("");
            setDescription("");
            setTimeout(() => setMsg(""), 2000);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || "Failed to add patient";
            const errorDetails = err.response?.data?.details;
            const fullMsg = errorDetails ? `${errorMsg}: ${errorDetails}` : errorMsg;
            setMsg(`❌ ${fullMsg}`);
            console.error("Add patient error:", err.response?.data || err);
            setTimeout(() => setMsg(""), 5000);
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

    // Show loader only if user hasn't been loaded yet
    if (!user) return <Loader />;

    // Show message if receptionist has no doctors assigned
    if (user.role === "RECEPTIONIST" && assignedDoctors.length === 0) {
        return (
            <div className="w-full min-h-screen bg-[#060c21] text-white flex items-center justify-center">
                <div className="text-center p-8 bg-white/5 rounded-3xl border border-white/10 max-w-md">
                    <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">No Doctors Assigned</h2>
                    <p className="text-gray-400">Please contact your administrator to assign doctors to your account.</p>
                </div>
            </div>
        );
    }

    // Show loader if doctor selection is still in progress
    if (!doctorId) return <Loader />;

    return (
        <div className="w-full min-h-screen text-white selection:bg-primary-500/30 relative overflow-x-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

                {/* Header with Stats */}
                <div className="mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary-500/20 to-light-blue-500/20 border border-primary-500/30 rounded-xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-primary-400" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold text-white">Reception Desk</h1>
                                <p className="text-gray-400 text-sm font-medium mt-0.5">Manage patient queue in real-time</p>
                            </div>
                        </div>

                        {/* Doctor Selector for Receptionists */}
                        {user?.role === "RECEPTIONIST" && (
                            <div className="flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-2 rounded-xl backdrop-blur-md">
                                <Stethoscope className="w-4 h-4 text-gray-400" />
                                <select
                                    value={doctorId || ""}
                                    onChange={(e) => setDoctorId(e.target.value)}
                                    className="bg-transparent text-white font-semibold outline-none border-none cursor-pointer appearance-none pr-8 text-sm"
                                >
                                    {assignedDoctors.length === 0 && <option value="" disabled>No Doctors</option>}
                                    {assignedDoctors.map(doc => (
                                        <option key={doc._id} value={doc._id} className="bg-[#0f172a] text-white">
                                            {doc.name} - {doc.specialization}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-gray-500 pointer-events-none" />
                            </div>
                        )}
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4">
                            <div className="text-2xl font-black text-blue-400">{queue.length}</div>
                            <div className="text-xs text-gray-400 font-semibold mt-1">Total Queue</div>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl p-4">
                            <div className="text-2xl font-black text-emerald-400">{queue.filter((_, i) => i < 3).length}</div>
                            <div className="text-xs text-gray-400 font-semibold mt-1">Priority</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
                            <div className="text-2xl font-black text-purple-400">{queue[0]?.waitMinutes || 0}m</div>
                            <div className="text-xs text-gray-400 font-semibold mt-1">Avg Wait</div>
                        </div>
                        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4">
                            <div className="text-2xl font-black text-cyan-400">{queue.length > 0 ? '\u2713' : '\u2717'}</div>
                            <div className="text-xs text-gray-400 font-semibold mt-1">Queue Active</div>
                        </div>
                    </div>
                </div>

                {msg && (
                    <div className={`mb-6 p-4 rounded-xl border font-semibold animate-fade-up flex items-center justify-center gap-2 text-sm
                        ${msg.includes("⚠️") || msg.includes("❌")
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-success-500/10 border-success-500/30 text-success-400"
                        }`}>
                        {msg.includes("✅") || msg.includes("🎉") ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        {msg}
                    </div>
                )}

                <div className="grid lg:grid-cols-4 gap-6">

                    {/* Add Patient Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sticky top-24">
                            <div className="flex items-center gap-2 mb-5">
                                <UserPlus className="w-5 h-5 text-light-blue-400" />
                                <h3 className="text-lg font-bold text-white">Add Patient</h3>
                            </div>

                            <form onSubmit={addPatient} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-400 mb-1.5 pl-1 block">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                        <input
                                            className="w-full pl-10 pr-3 py-2.5 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none text-white placeholder-gray-500 transition-all text-sm"
                                            placeholder="John Doe"
                                            value={patientName}
                                            onChange={e => setPatientName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-400 mb-1.5 pl-1 block">Phone Number</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                        <input
                                            className="w-full pl-10 pr-3 py-2.5 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none text-white placeholder-gray-500 transition-all text-sm"
                                            placeholder="+1 234 567 890"
                                            value={patientNumber}
                                            onChange={e => setPatientNumber(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-gray-400 mb-1.5 pl-1 block">Description (Optional)</label>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                                        <input
                                            className="w-full pl-10 pr-3 py-2.5 bg-black/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/50 outline-none text-white placeholder-gray-500 transition-all text-sm"
                                            placeholder="Symptoms or reason"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button className="w-full py-3 mt-2 rounded-xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white shadow-lg shadow-primary-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm">
                                    <UserPlus className="w-4 h-4" /> Add to Queue
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Queue List */}
                    <div className="lg:col-span-3">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 min-h-[500px] flex flex-col">

                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-light-blue-400" />
                                    <h3 className="text-lg font-bold text-white">Live Queue</h3>
                                </div>
                                <span className="bg-primary-500/10 text-primary-400 border border-primary-500/30 px-3 py-1 rounded-lg text-xs font-bold">
                                    {queue.length} Patients
                                </span>
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
                                                        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-light-blue-400 rounded-full animate-spin"></div>
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
                                                    <tr key={p._id} className={`group transition-all hover:bg-white/5 ${isTopThree ? "bg-success-500/5 relative" : ""}`}>

                                                        {/* Token */}
                                                        <td className="px-6 py-4 align-middle relative">
                                                            {isTopThree && <div className="absolute left-0 top-0 bottom-0 w-1 bg-success-500/50 shadow-[0_0_10px_rgba(18,152,32,0.5)]" />}
                                                            <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl font-black text-lg border ${isTopThree
                                                                ? "bg-success-500/20 text-success-400 border-success-500/30 shadow-[0_0_15px_rgba(18,152,32,0.2)]"
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
                                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 border border-primary-500/20 transition-colors"
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
                                                                className="p-2.5 rounded-xl bg-success-500/10 text-success-400 hover:bg-success-500/20 border border-success-500/20 shadow-sm transition-transform active:scale-95" title="Mark Completed"
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
