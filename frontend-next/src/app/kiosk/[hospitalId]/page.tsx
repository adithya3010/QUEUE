"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/services/api";
import { AlertCircle, CheckCircle2, User, Phone, FileText, ArrowRight, UserPlus, Clock, Stethoscope } from "lucide-react";
import io from 'socket.io-client';

export default function KioskPage() {
    const params = useParams();
    const hospitalId = params.hospitalId;

    const [doctors, setDoctors] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [loadingDocs, setLoadingDocs] = useState(true);

    // Form state
    const [formData, setFormData] = useState({ name: "", phone: "", description: "" });
    const [submitLoading, setSubmitLoading] = useState(false);

    // Result state
    const [tokenResult, setTokenResult] = useState(null);
    const [error, setError] = useState("");

    const loadDoctors = async () => {
        try {
            setLoadingDocs(true);
            const res = await api.get(`/kiosk/${hospitalId}/doctors`);
            if (res.data.success) {
                setDoctors(res.data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDocs(false);
        }
    };

    useEffect(() => {
        if (!hospitalId) return;
        loadDoctors();

        // WebSocket setup for real-time Kiosk updates (Wait times updating dynamically)
        const token = localStorage.getItem("token") || ""; // We don't have a token, but let's try opening a generic socket if public, or just poll.
        // For security, true Kiosks would have a Kiosk-specific token. 
        // For now, we will just poll every 30 seconds since the Kiosk is public-facing.
        const interval = setInterval(() => {
            loadDoctors();
        }, 30000);

        return () => clearInterval(interval);
    }, [hospitalId]);

    const handleSelectDoctor = (doc) => {
        setSelectedDoc(doc);
        setTokenResult(null);
        setError("");
        setFormData({ name: "", phone: "", description: "" });
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        setError("");
        try {
            const res = await api.post(`/kiosk/${hospitalId}/enqueue`, {
                ...formData,
                doctorId: selectedDoc._id
            });

            if (res.data.success) {
                setTokenResult(res.data.tokenNumber);
                loadDoctors(); // Refresh queues
                // Auto-reset after 10 seconds for the next patient
                setTimeout(() => {
                    setTokenResult(null);
                    setSelectedDoc(null);
                }, 10000);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to check in. Please see reception.");
        } finally {
            setSubmitLoading(false);
        }
    };

    if (loadingDocs && doctors.length === 0) {
        return (
            <div className="min-h-screen bg-[#0c0516] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-light-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0c0516] via-[#0f172a] to-[#0c0516] p-8 relative overflow-hidden flex flex-col items-center">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"></div>

            {/* Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-light-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="text-center mb-12 relative z-10 animate-fadeInDown">
                <h1 className="text-5xl font-black text-white mb-4 tracking-tight drop-shadow-lg">
                    Welcome to the Clinic
                </h1>
                <p className="text-xl text-light-blue-200 font-medium">Self-Service Check-In Kiosk</p>
            </div>

            {tokenResult ? (
                // SUCCESS SCREEN
                <div className="max-w-xl w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[40px] p-12 text-center animate-zoomIn relative z-10 shadow-2xl">
                    <CheckCircle2 className="w-24 h-24 text-success-400 mx-auto mb-6 animate-pulse" />
                    <h2 className="text-4xl font-bold text-white mb-4">You're Checked In!</h2>
                    <p className="text-xl text-success-200 mb-8 font-medium">Please proceed to the waiting area.</p>

                    <div className="bg-black/40 rounded-3xl p-8 mb-8 border border-white/10 shadow-inner">
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-2">Your Token Number</p>
                        <p className="text-7xl font-black text-white tracking-widest drop-shadow-md">{tokenResult}</p>
                    </div>

                    <p className="text-gray-400 flex items-center justify-center gap-2">
                        <Stethoscope className="w-5 h-5" /> Seeing <strong>{selectedDoc?.name}</strong>
                    </p>

                    <div className="mt-10">
                        <p className="text-sm text-gray-500 animate-pulse">Screen will reset automatically...</p>
                    </div>
                </div>
            ) : selectedDoc ? (
                // FORM SCREEN
                <div className="max-w-2xl w-full bg-[#1e293b]/90 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 relative z-10 shadow-2xl animate-slideUp">
                    <button
                        onClick={() => setSelectedDoc(null)}
                        className="mb-8 text-light-blue-400 hover:text-light-blue-300 font-bold flex items-center gap-2 transition-colors"
                    >
                        ← Back to Doctors
                    </button>

                    <div className="flex items-center gap-6 p-6 bg-black/30 rounded-3xl mb-10 border border-white/5">
                        <div className="w-20 h-20 bg-light-blue-500/20 rounded-full flex items-center justify-center border border-light-blue-500/30 flex-shrink-0">
                            <Stethoscope className="w-10 h-10 text-light-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-1">{selectedDoc.name}</h2>
                            <p className="text-gray-400 font-medium text-lg">{selectedDoc.specialization}</p>
                            <p className="text-success-400 font-bold mt-2 flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                {selectedDoc.estimatedWaitMins} min estimated wait
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-8 p-6 bg-red-500/20 border border-red-500/40 rounded-2xl flex items-center gap-4 animate-shake">
                            <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
                            <p className="text-red-200 font-medium text-lg">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Full Name</label>
                            <div className="relative">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500"><User className="w-6 h-6" /></div>
                                <input required type="text" name="name" value={formData.name} onChange={handleChange}
                                    className="w-full pl-16 pr-6 py-5 rounded-2xl bg-white/5 border border-white/10 text-xl text-white outline-none focus:border-light-blue-500 focus:ring-2 focus:ring-light-blue-500/30 transition-all placeholder:text-gray-600"
                                    placeholder="Tap to enter name..." />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Phone Number <span className="text-gray-600 font-normal lowercase">(Optional)</span></label>
                            <div className="relative">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500"><Phone className="w-6 h-6" /></div>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                                    className="w-full pl-16 pr-6 py-5 rounded-2xl bg-white/5 border border-white/10 text-xl text-white outline-none focus:border-light-blue-500 focus:ring-2 focus:ring-light-blue-500/30 transition-all placeholder:text-gray-600"
                                    placeholder="Tap to enter phone..." />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Reason for Visit <span className="text-gray-600 font-normal lowercase">(Optional)</span></label>
                            <div className="relative">
                                <div className="absolute left-6 top-6 text-gray-500"><FileText className="w-6 h-6" /></div>
                                <textarea name="description" value={formData.description} onChange={handleChange} rows={3}
                                    className="w-full pl-16 pr-6 py-5 rounded-2xl bg-white/5 border border-white/10 text-xl text-white outline-none focus:border-light-blue-500 focus:ring-2 focus:ring-light-blue-500/30 transition-all placeholder:text-gray-600 resize-none"
                                    placeholder="Brief symptom description..."></textarea>
                            </div>
                        </div>

                        <button
                            disabled={submitLoading}
                            type="submit"
                            className="w-full py-6 mt-6 rounded-2xl bg-gradient-to-r from-light-blue-500 to-primary-600 hover:from-light-blue-400 hover:to-primary-500 shadow-[0_0_40px_rgba(6,182,212,0.4)] text-white font-black text-2xl tracking-wide flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {submitLoading ? "Checking In..." : "Complete Check-In"}
                            <ArrowRight className="w-8 h-8" />
                        </button>
                    </form>
                </div>
            ) : (
                // DOCTOR SELECTION SCREEN
                <div className="w-full max-w-6xl relative z-10 animate-slideUp">
                    <h2 className="text-2xl font-bold text-gray-300 mb-8 text-center flex items-center justify-center gap-3">
                        <UserPlus className="w-8 h-8 text-light-blue-500" /> Who would you like to see today?
                    </h2>

                    {doctors.length === 0 ? (
                        <div className="text-center p-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px]">
                            <p className="text-2xl text-gray-400">No doctors are currently available. Please see reception.</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {doctors.map((doc: any) => (
                                <button
                                    key={doc._id}
                                    onClick={() => handleSelectDoctor(doc)}
                                    className="block w-full text-left bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-light-blue-500/50 rounded-[32px] p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(6,182,212,0.15)] group"
                                >
                                    <div className="w-20 h-20 bg-gradient-to-br from-light-blue-500 to-primary-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-light-blue-500/20 group-hover:scale-110 transition-transform">
                                        <span className="text-3xl font-black text-white">{doc.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{doc.name}</h3>
                                    <p className="text-light-blue-400 font-medium text-lg mb-6">{doc.specialization}</p>

                                    <div className="flex items-center justify-between border-t border-white/10 pt-6">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">In Queue</p>
                                            <p className="font-bold text-white text-xl">{doc.currentQueueLength} patients</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400 mb-1">Est. Wait</p>
                                            <p className="font-bold text-success-400 text-xl">{doc.estimatedWaitMins} min</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
