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
    const [receptionists, setReceptionists] = useState<any[]>([]);

    useEffect(() => {
        loadAdminData();
    }, []);

    const loadAdminData = async () => {
        try {
            const meRes = await api.get("/admin/info");
            const userData = meRes.data;

            if (userData.role !== "HOSPITAL_ADMIN") {
                router.push("/login");
                return;
            }
            setAdmin(userData);

            // Fetch all staff (doctors and receptionists) for this admin's hospital
            const staffRes = await api.get("/admin/staff");
            const allStaff = staffRes.data || [];
            // Filter doctors and receptionists
            const doctorsList = allStaff.filter((s: any) => s.role === "DOCTOR");
            const receptionistsList = allStaff.filter((s: any) => s.role === "RECEPTIONIST");
            setDoctors(doctorsList);
            setReceptionists(receptionistsList);

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
            loadAdminData(); // Refresh list
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
            // Try both logout endpoints to clear all cookies
            await api.post("/admin/logout").catch(() => {});
            await api.post("/auth/logout").catch(() => {});
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            localStorage.clear();
            router.push("/login");
        }
    }

    if (!admin) return <Loader />;

    return (
        <div className="w-full min-h-screen text-white selection:bg-primary-500/30 relative overflow-x-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-secondary-500/20 to-primary-500/20 border border-secondary-500/30 rounded-xl flex items-center justify-center">
                            <Activity className="w-6 h-6 text-secondary-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                                Admin Dashboard
                            </h1>
                            <p className="text-gray-400 text-sm font-medium mt-0.5">{admin.name} - Hospital Management</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-primary-500/10 to-light-blue-500/10 border border-primary-500/20 rounded-2xl p-5 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-2">
                            <Stethoscope className="w-8 h-8 text-primary-400" />
                            <span className="text-3xl font-black text-primary-400">{doctors.length}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-300">Active Doctors</p>
                    </div>
                    <div className="bg-gradient-to-br from-success-500/10 to-success-600/10 border border-success-500/20 rounded-2xl p-5 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-2">
                            <Users className="w-8 h-8 text-success-400" />
                            <span className="text-3xl font-black text-success-400">{receptionists.length}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-300">Receptionists</p>
                    </div>
                    <div className="bg-gradient-to-br from-secondary-500/10 to-light-500/10 border border-secondary-500/20 rounded-2xl p-5 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-2">
                            <Activity className="w-8 h-8 text-secondary-400" />
                            <span className="text-3xl font-black text-secondary-400">{doctors.length + receptionists.length}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-300">Total Staff</p>
                    </div>
                    <div className="bg-gradient-to-br from-light-blue-500/10 to-primary-500/10 border border-light-blue-500/20 rounded-2xl p-5 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-2">
                            <CheckCircle className="w-8 h-8 text-light-blue-400" />
                            <span className="text-3xl font-black text-light-blue-400">{admin.hospitalId ? '✓' : '✗'}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-300">System Status</p>
                    </div>
                </div>

                {msg && (
                    <div className={`mb-6 p-4 rounded-xl border text-sm font-bold backdrop-blur-sm animate-fade-up flex items-center justify-center gap-2 ${msg.includes('Success') ? 'bg-success-500/10 border-success-500/30 text-success-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                        {msg.includes('Success') ? <CheckCircle className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                        {msg}
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-6 mb-8">

                    {/* Add Doctor Form */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-primary-500/30 transition-all">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500/20 to-light-blue-500/20 border border-primary-500/30 rounded-xl flex items-center justify-center">
                                <Stethoscope className="w-5 h-5 text-primary-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Add Doctor</h3>
                        </div>
                        <form onSubmit={handleAddDoctor} className="space-y-3">
                            <input
                                placeholder="Doctor Name"
                                value={doctorForm.name}
                                onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all text-sm"
                                required
                            />
                            <input
                                type="email"
                                placeholder="Doctor Email"
                                value={doctorForm.email}
                                onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all text-sm"
                                required
                            />
                            <input
                                placeholder="Specialization (e.g. Cardiology)"
                                value={doctorForm.specialization}
                                onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all text-sm"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Temporary Password (min 8 chars)"
                                value={doctorForm.password}
                                onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all text-sm"
                                required minLength={8}
                            />
                            <button
                                disabled={loading}
                                className="w-full py-3 mt-2 rounded-xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white shadow-lg shadow-primary-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                            >
                                <UserPlus className="w-4 h-4" /> Add Doctor
                            </button>
                        </form>
                    </div>

                    {/* Add Receptionist Form */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-success-500/30 transition-all">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-br from-success-500/20 to-success-600/20 border border-success-500/30 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-success-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Add Receptionist</h3>
                        </div>
                        <form onSubmit={handleAddReceptionist} className="space-y-3">
                            <input
                                placeholder="Receptionist Name"
                                value={receptionistForm.name}
                                onChange={(e) => setReceptionistForm({ ...receptionistForm, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-success-500/50 focus:border-success-400 outline-none transition-all text-sm"
                                required
                            />
                            <input
                                type="email"
                                placeholder="Receptionist Email"
                                value={receptionistForm.email}
                                onChange={(e) => setReceptionistForm({ ...receptionistForm, email: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-success-500/50 focus:border-success-400 outline-none transition-all text-sm"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Temporary Password (min 8 chars)"
                                value={receptionistForm.password}
                                onChange={(e) => setReceptionistForm({ ...receptionistForm, password: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-success-500/50 focus:border-success-400 outline-none transition-all text-sm"
                                required minLength={8}
                            />

                            <div>
                                <label className="text-xs font-bold text-gray-400 mb-1.5 pl-1 block">Assign Doctors (multi-select)</label>
                                <select
                                    multiple
                                    value={receptionistForm.assignedDoctors}
                                    onChange={handleDoctorSelection}
                                    className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white focus:ring-2 focus:ring-success-500/50 outline-none min-h-[90px] text-sm"
                                >
                                    {doctors.length === 0 && <option disabled>No doctors available</option>}
                                    {doctors.map(d => (
                                        <option key={d._id} value={d._id} className="py-1">{d.name} - {d.specialization}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                disabled={loading}
                                className="w-full py-3 mt-2 rounded-xl font-bold bg-gradient-to-r from-success-500 to-success-600 hover:from-success-400 hover:to-success-500 text-white shadow-lg shadow-success-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                            >
                                <UserPlus className="w-4 h-4" /> Add Receptionist
                            </button>
                        </form>
                    </div>

                </div>

                {/* Staff Lists */}
                <div className="grid md:grid-cols-2 gap-6">
                    
                    {/* Doctors List */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Stethoscope className="w-5 h-5 text-primary-400" />
                                <h3 className="text-lg font-bold text-white">Doctors</h3>
                            </div>
                            <span className="px-3 py-1 bg-primary-500/10 border border-primary-500/30 rounded-lg text-primary-400 text-xs font-bold">{doctors.length}</span>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {doctors.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <Stethoscope className="w-8 h-8 text-gray-600" />
                                    </div>
                                    <p className="text-gray-500 text-sm">No doctors yet</p>
                                </div>
                            ) : (
                                doctors.map((doc) => (
                                    <div key={doc._id} className="p-4 rounded-xl bg-gradient-to-br from-black/30 to-black/20 border border-white/10 hover:border-primary-500/30 hover:from-primary-500/5 hover:to-primary-500/10 transition-all group">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500/20 to-light-blue-500/20 border border-primary-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Stethoscope className="w-5 h-5 text-primary-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-white text-sm truncate">{doc.name}</p>
                                                <p className="text-xs text-primary-400 mt-0.5">{doc.specialization}</p>
                                                <p className="text-xs text-gray-500 mt-1 truncate">{doc.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Receptionists List */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-success-400" />
                                <h3 className="text-lg font-bold text-white">Receptionists</h3>
                            </div>
                            <span className="px-3 py-1 bg-success-500/10 border border-success-500/30 rounded-lg text-success-400 text-xs font-bold">{receptionists.length}</span>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {receptionists.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <Users className="w-8 h-8 text-gray-600" />
                                    </div>
                                    <p className="text-gray-500 text-sm">No receptionists yet</p>
                                </div>
                            ) : (
                                receptionists.map((rec) => (
                                    <div key={rec._id} className="p-4 rounded-xl bg-gradient-to-br from-black/30 to-black/20 border border-white/10 hover:border-success-500/30 hover:from-success-500/5 hover:to-success-500/10 transition-all group">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-success-500/20 to-success-600/20 border border-success-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Users className="w-5 h-5 text-success-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-white text-sm truncate">{rec.name}</p>
                                                <p className="text-xs text-gray-500 mt-0.5 truncate">{rec.email}</p>
                                                {rec.assignedDoctors && rec.assignedDoctors.length > 0 && (
                                                    <div className="flex items-center gap-1 mt-2">
                                                        <CheckCircle className="w-3 h-3 text-success-400" />
                                                        <span className="text-xs text-success-400 font-medium">
                                                            {rec.assignedDoctors.length} doctor(s)
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
