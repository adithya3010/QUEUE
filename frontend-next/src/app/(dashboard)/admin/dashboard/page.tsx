"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import { Users, UserPlus, FileText, CheckCircle, Stethoscope, Power, Activity } from "lucide-react";

export default function AdminDashboard() {
    const router = useRouter();
    const [admin, setAdmin] = useState<any>(null);
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    // Form states
    const [doctorForm, setDoctorForm] = useState({ name: "", email: "", specialization: "", password: "" });
    const [receptionistForm, setReceptionistForm] = useState({ name: "", email: "", password: "", assignedDoctors: [] });

    // Lists
    const [doctors, setDoctors] = useState<any[]>([]);

    useEffect(() => {
        loadAdminData();
    }, []);

    const loadAdminData = async () => {
        try {
            const meRes = await api.get("/auth/me");
            const userData = meRes.data;

            if (userData.role !== "HOSPITAL_ADMIN") {
                router.push("/login");
                return;
            }
            setAdmin(userData);

            // Fetch doctors managed by this admin
            const staffRes = await api.get("/reception/doctors").catch(() => null);
            // Reuse the route or fetch all doctors for hospital
            // We'll just fetch `/admin/doctors` (which doesn't exist yet, we'll use hospital routes)
            const docsRes = await api.get("/hospital/doctors").catch(() => ({ data: { data: [] } }));
            setDoctors(docsRes.data.data || []);

        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 401) router.push("/login");
        }
    }

    const handleAddDoctor = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/admin/staff/doctor", doctorForm);
            setMsg("Doctor Added Successfully 🎉");
            setDoctorForm({ name: "", email: "", specialization: "", password: "" });
            loadAdminData(); // Refresh list
        } catch (err: any) {
            setMsg(err.response?.data?.message || "Failed to add doctor");
        } finally {
            setLoading(false);
            setTimeout(() => setMsg(""), 3000);
        }
    };

    const handleAddReceptionist = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/admin/staff/receptionist", receptionistForm);
            setMsg("Receptionist Added Successfully 🎉");
            setReceptionistForm({ name: "", email: "", password: "", assignedDoctors: [] });
        } catch (err: any) {
            setMsg(err.response?.data?.message || "Failed to add receptionist");
        } finally {
            setLoading(false);
            setTimeout(() => setMsg(""), 3000);
        }
    };

    const handleDoctorSelection = (e: any) => {
        // Handle multi-select for assigned doctors
        const value = Array.from(e.target.selectedOptions, (option: any) => option.value);
        setReceptionistForm({ ...receptionistForm, assignedDoctors: value as any });
    };

    async function logout() {
        try {
            await api.post("/auth/logout");
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            localStorage.clear();
            router.push("/login");
        }
    }

    if (!admin) return <Loader />;

    return (
        <div className="w-full min-h-screen bg-[#060c21] text-white selection:bg-blue-500/30 relative overflow-x-hidden pt-10">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[150px] rounded-full pointer-events-none" />

            <div className="max-w-6xl mx-auto px-6 pb-20 relative z-10 animate-fade-up">

                <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                            Hospital Admin Portal
                        </h2>
                        <p className="text-gray-400 mt-2 font-medium">Manage {admin.name} staff and settings</p>
                    </div>

                    <button
                        onClick={logout}
                        className="px-6 py-3 rounded-xl font-bold bg-white/5 hover:bg-red-500/10 border border-white/10 text-gray-300 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Power className="w-5 h-5" /> Logout
                    </button>
                </div>

                {msg && (
                    <div className={`mb-6 p-4 rounded-xl border text-sm font-bold text-center backdrop-blur-sm shadow-inner transition-all ${msg.includes('Success') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                        {msg}
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-8">

                    {/* Add Doctor Form */}
                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl p-8">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
                            <Stethoscope className="w-6 h-6 text-blue-400" /> Provision Doctor
                        </h3>
                        <form onSubmit={handleAddDoctor} className="space-y-4">
                            <input
                                placeholder="Doctor Name"
                                value={doctorForm.name}
                                onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                                className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all shadow-inner"
                                required
                            />
                            <input
                                type="email"
                                placeholder="Doctor Email"
                                value={doctorForm.email}
                                onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                                className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all shadow-inner"
                                required
                            />
                            <input
                                placeholder="Specialization (e.g. Cardiology)"
                                value={doctorForm.specialization}
                                onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                                className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all shadow-inner"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Temporary Password"
                                value={doctorForm.password}
                                onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                                className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all shadow-inner"
                                required minLength={8}
                            />
                            <button
                                disabled={loading}
                                className="w-full py-4 mt-2 rounded-xl font-bold bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,0.4)] border border-blue-400/50 transition-transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <UserPlus className="w-5 h-5" /> Add Doctor
                            </button>
                        </form>
                    </div>

                    {/* Add Receptionist Form */}
                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl p-8">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3 border-b border-white/5 pb-4">
                            <Users className="w-6 h-6 text-emerald-400" /> Provision Receptionist
                        </h3>
                        <form onSubmit={handleAddReceptionist} className="space-y-4">
                            <input
                                placeholder="Receptionist Name"
                                value={receptionistForm.name}
                                onChange={(e) => setReceptionistForm({ ...receptionistForm, name: e.target.value })}
                                className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 outline-none transition-all shadow-inner"
                                required
                            />
                            <input
                                type="email"
                                placeholder="Receptionist Email"
                                value={receptionistForm.email}
                                onChange={(e) => setReceptionistForm({ ...receptionistForm, email: e.target.value })}
                                className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 outline-none transition-all shadow-inner"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Temporary Password"
                                value={receptionistForm.password}
                                onChange={(e) => setReceptionistForm({ ...receptionistForm, password: e.target.value })}
                                className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 outline-none transition-all shadow-inner"
                                required minLength={8}
                            />

                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pl-1 block">Assign Doctors (Hold Ctrl/Cmd to multi-select)</label>
                                <select
                                    multiple
                                    value={receptionistForm.assignedDoctors}
                                    onChange={handleDoctorSelection}
                                    className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none min-h-[100px]"
                                >
                                    {doctors.length === 0 && <option disabled>No doctors found...</option>}
                                    {doctors.map(d => (
                                        <option key={d._id} value={d._id}>{d.name} ({d.specialization})</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                disabled={loading}
                                className="w-full py-4 mt-2 rounded-xl font-bold bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white shadow-[0_10px_30px_rgba(16,185,129,0.4)] border border-emerald-400/50 transition-transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <UserPlus className="w-5 h-5" /> Add Receptionist
                            </button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}
