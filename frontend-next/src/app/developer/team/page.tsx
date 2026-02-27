"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Users, Plus, Trash2, CheckCircle2, AlertCircle, Stethoscope } from "lucide-react";

export default function TeamManagement() {
    const [doctors, setDoctors] = useState([]);
    const [formData, setFormData] = useState({ name: "", email: "", specialization: "", password: "" });
    const [msg, setMsg] = useState({ text: "", type: "success" });
    const [loading, setLoading] = useState(false);

    const loadDoctors = async () => {
        try {
            const res = await api.get("/org/staff");
            const staff = Array.isArray(res.data) ? res.data : [];
            setDoctors(staff.filter((s: any) => s?.role === "AGENT"));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadDoctors();
    }, []);

    const showMsg = (text: string, type = "success") => {
        setMsg({ text, type });
        setTimeout(() => setMsg({ text: "", type: "success" }), 3000);
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const provisionDoctor = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/org/staff/agent", {
                name: formData.name,
                email: formData.email,
                serviceCategory: formData.specialization,
                password: formData.password,
            });
            showMsg("Agent provisioned successfully");
            setFormData({ name: "", email: "", specialization: "", password: "" });
            loadDoctors();
        } catch (err: any) {
            showMsg(err.response?.data?.message || "Failed to provision doctor", "error");
        } finally {
            setLoading(false);
        }
    };

    const removeDoctor = async (id: string) => {
        if (!window.confirm("Are you sure you want to remove this doctor? This cannot be undone.")) return;
        try {
            await api.delete(`/org/staff/${id}`);
            showMsg("Doctor removed successfully");
            loadDoctors();
        } catch (err) {
            showMsg("Failed to remove doctor", "error");
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto px-6 pb-20 pt-8 animate-fadeIn">

            <div className="mb-10">
                <h2 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-cyan-400 dark:to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
                    <Users className="w-8 h-8 text-cyan-500" /> Team Management
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Provision and manage clinical accounts for your hospital</p>
            </div>

            {msg.text && (
                <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 animate-fadeIn font-semibold ${msg.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-200 dark:border-emerald-900/30'}`}>
                    {msg.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />} {msg.text}
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">

                {/* Provision Form */}
                <div className="lg:col-span-1 border border-black/5 dark:border-white/10 bg-white/80 dark:bg-[#0b1021] backdrop-blur-xl rounded-3xl p-8 shadow-xl relative overflow-hidden h-fit">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 dark:bg-cyan-500/5 blur-[50px] rounded-full pointer-events-none" />

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                        <Plus className="w-6 h-6 text-cyan-500" /> Provision Doctor
                    </h3>

                    <form onSubmit={provisionDoctor} className="space-y-4 relative z-10">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Full Name</label>
                            <input required type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Dr. Sarah Connor" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-cyan-500 outline-none text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Email</label>
                            <input required type="email" name="email" value={formData.email} onChange={handleChange} placeholder="sarah@hospital.com" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-cyan-500 outline-none text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Specialization</label>
                            <input required type="text" name="specialization" value={formData.specialization} onChange={handleChange} placeholder="Pediatrics" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-cyan-500 outline-none text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Initial Password</label>
                            <input required type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" minLength={8} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-cyan-500 outline-none text-gray-900 dark:text-white" />
                        </div>
                        <button disabled={loading} type="submit" className="w-full py-3 mt-4 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50">
                            {loading ? "Provisioning..." : "Create Account"}
                        </button>
                    </form>
                </div>

                {/* Roster List */}
                <div className="lg:col-span-2 border border-black/5 dark:border-white/10 bg-white/80 dark:bg-[#110c21] backdrop-blur-xl rounded-3xl p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 dark:bg-purple-500/5 blur-[50px] rounded-full pointer-events-none" />

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                        <Stethoscope className="w-6 h-6 text-purple-500" /> Active Roster
                    </h3>

                    {doctors.length === 0 ? (
                        <div className="text-center py-10">
                            <Stethoscope className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">No doctors provisioned yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 relative z-10">
                            {doctors.map((doc: any) => (
                                <div key={doc._id} className="flex items-center justify-between p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-cyan-500/30 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold text-lg flex-shrink-0">
                                            {doc.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-lg">{doc.name}</h4>
                                            <p className="text-sm text-gray-500">{doc.email}</p>
                                            <div className="flex gap-2 mt-2">
                                                <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded-full font-semibold">{doc.specialization}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${doc.availability === 'Available' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                                                    {doc.availability || 'Unknown'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => removeDoctor(doc._id)} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors" title="Revoke Access">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
