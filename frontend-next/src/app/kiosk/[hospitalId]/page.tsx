"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import api from "@/services/api";
import {
    AlertCircle, CheckCircle2, User, Phone, FileText, ArrowRight, UserPlus,
    Clock, Stethoscope, CalendarCheck, ChevronLeft, ChevronRight, X, Calendar
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace("/api", "") || "http://localhost:5000";

function getNext7Days() {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        days.push({
            dateStr: `${year}-${month}-${day}`,
            label: i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
            short: i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" }),
            dayNum: d.getDate(),
        });
    }
    return days;
}

// ─── Walk-In View ─────────────────────────────────────────────────────────────

function WalkIn({ hospitalId }: { hospitalId: string }) {
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [loadingServices, setLoadingServices] = useState(true);
    const [formData, setFormData] = useState({ name: "", phone: "", description: "" });
    const [submitLoading, setSubmitLoading] = useState(false);
    const [tokenResult, setTokenResult] = useState<any>(null);
    const [error, setError] = useState("");

    const loadServices = useCallback(async () => {
        try {
            setLoadingServices(true);
            // Try new /services endpoint first; fall back to /doctors for compat
            const res = await api.get(`/kiosk/${hospitalId}/services`).catch(() =>
                api.get(`/kiosk/${hospitalId}/doctors`)
            );
            if (res.data.success) setServices(res.data.data);
        } catch { } finally { setLoadingServices(false); }
    }, [hospitalId]);

    useEffect(() => {
        loadServices();
        const interval = setInterval(loadServices, 30000);
        return () => clearInterval(interval);
    }, [loadServices]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitLoading(true);
        setError("");
        try {
            const res = await api.post(`/kiosk/${hospitalId}/enqueue`, {
                ...formData,
                serviceId: selectedService._id,  // new field
                agentId: selectedService._id,     // compat alias
                doctorId: selectedService._id,    // legacy compat
            });
            if (res.data.success) {
                setTokenResult(res.data.tokenNumber);
                loadServices();
                setTimeout(() => { setTokenResult(null); setSelectedService(null); }, 10000);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to check in. Please see the counter.");
        } finally { setSubmitLoading(false); }
    };

    if (loadingServices && services.length === 0)
        return <div className="flex items-center justify-center h-64"><div className="w-14 h-14 border-4 border-light-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

    if (tokenResult) {
        return (
            <div className="max-w-xl w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[40px] p-12 text-center animate-zoomIn shadow-2xl">
                <CheckCircle2 className="w-24 h-24 text-success-400 mx-auto mb-6 animate-pulse" />
                <h2 className="text-4xl font-bold text-white mb-4">You're Checked In!</h2>
                <p className="text-xl text-success-200 mb-8 font-medium">Please proceed to the waiting area.</p>
                <div className="bg-black/40 rounded-3xl p-8 mb-8 border border-white/10">
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm mb-2">Your Token Number</p>
                    <p className="text-7xl font-black text-white tracking-widest">{tokenResult}</p>
                </div>
                <p className="text-gray-400 flex items-center justify-center gap-2">
                    <Stethoscope className="w-5 h-5" /> Service: <strong>{selectedService?.name}</strong>
                </p>
                <p className="text-sm text-gray-500 animate-pulse mt-8">Screen will reset automatically...</p>
            </div>
        );
    }

    if (selectedService) {
        return (
            <div className="max-w-2xl w-full bg-[#1e293b]/90 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-2xl animate-slideUp">
                <button onClick={() => setSelectedService(null)} className="mb-8 text-light-blue-400 hover:text-light-blue-300 font-bold flex items-center gap-2 transition-colors">
                    <ChevronLeft className="w-5 h-5" /> Back to Services
                </button>
                <div className="flex items-center gap-6 p-6 bg-black/30 rounded-3xl mb-10 border border-white/5">
                    <div className="w-20 h-20 bg-light-blue-500/20 rounded-full flex items-center justify-center border border-light-blue-500/30 flex-shrink-0">
                        <Stethoscope className="w-10 h-10 text-light-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">{selectedService.name}</h2>
                        <p className="text-gray-400 font-medium text-lg">{selectedService.category || selectedService.specialization}</p>
                        <p className="text-success-400 font-bold mt-2 flex items-center gap-2"><Clock className="w-5 h-5" />{selectedService.estimatedWaitMins} min estimated wait</p>
                    </div>
                </div>
                {error && <div className="mb-8 p-5 bg-red-500/20 border border-red-500/40 rounded-2xl flex items-center gap-4"><AlertCircle className="w-7 h-7 text-red-400 flex-shrink-0" /><p className="text-red-200 font-medium">{error}</p></div>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {[
                        { label: "Full Name", name: "name", type: "text", icon: <User className="w-6 h-6" />, required: true, placeholder: "Tap to enter name..." },
                        { label: "Phone Number (Optional)", name: "phone", type: "tel", icon: <Phone className="w-6 h-6" />, required: false, placeholder: "Tap to enter phone..." },
                    ].map(f => (
                        <div key={f.name}>
                            <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">{f.label}</label>
                            <div className="relative">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500">{f.icon}</div>
                                <input required={f.required} type={f.type} name={f.name} value={(formData as any)[f.name]}
                                    onChange={e => setFormData({ ...formData, [e.target.name]: e.target.value })}
                                    className="w-full pl-16 pr-6 py-5 rounded-2xl bg-white/5 border border-white/10 text-xl text-white outline-none focus:border-light-blue-500 focus:ring-2 focus:ring-light-blue-500/30 transition-all placeholder:text-gray-600"
                                    placeholder={f.placeholder} />
                            </div>
                        </div>
                    ))}
                    <div>
                        <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 ml-2">Reason for Visit (Optional)</label>
                        <div className="relative">
                            <div className="absolute left-6 top-6 text-gray-500"><FileText className="w-6 h-6" /></div>
                            <textarea name="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3}
                                className="w-full pl-16 pr-6 py-5 rounded-2xl bg-white/5 border border-white/10 text-xl text-white outline-none focus:border-light-blue-500 focus:ring-2 focus:ring-light-blue-500/30 transition-all placeholder:text-gray-600 resize-none"
                                placeholder="Brief description of your request..." />
                        </div>
                    </div>
                    <button disabled={submitLoading} type="submit"
                        className="w-full py-6 mt-4 rounded-2xl bg-gradient-to-r from-light-blue-500 to-primary-600 hover:from-light-blue-400 hover:to-primary-500 shadow-[0_0_40px_rgba(6,182,212,0.4)] text-white font-black text-2xl tracking-wide flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50">
                        {submitLoading ? "Checking In..." : "Complete Check-In"}<ArrowRight className="w-8 h-8" />
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl animate-slideUp">
            <h2 className="text-2xl font-bold text-gray-300 mb-8 text-center flex items-center justify-center gap-3">
                <UserPlus className="w-8 h-8 text-light-blue-500" /> Choose a service to join the queue
            </h2>
            {services.length === 0 ? (
                <div className="text-center p-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[40px]">
                    <p className="text-2xl text-gray-400">No services are currently available. Please see the counter.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((svc: any) => (
                        <button key={svc._id} onClick={() => { setSelectedService(svc); setError(""); setFormData({ name: "", phone: "", description: "" }); }}
                            className="block w-full text-left bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-light-blue-500/50 rounded-[32px] p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(6,182,212,0.15)] group">
                            <div className="w-20 h-20 bg-gradient-to-br from-light-blue-500 to-primary-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-light-blue-500/20 group-hover:scale-110 transition-transform">
                                <span className="text-3xl font-black text-white">{svc.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">{svc.name}</h3>
                            <p className="text-light-blue-400 font-medium text-lg mb-6">{svc.category || svc.specialization || svc.description}</p>
                            <div className="flex items-center justify-between border-t border-white/10 pt-6">
                                <div><p className="text-sm text-gray-400 mb-1">In Queue</p><p className="font-bold text-white text-xl">{svc.currentQueueLength} clients</p></div>
                                <div className="text-right"><p className="text-sm text-gray-400 mb-1">Est. Wait</p><p className="font-bold text-success-400 text-xl">{svc.estimatedWaitMins} min</p></div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Appointment Booking (4-step) ─────────────────────────────────────────────

function AppointmentBooking({ hospitalId }: { hospitalId: string }) {
    const [step, setStep] = useState(1);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [selectedDoc, setSelectedDoc] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [slots, setSlots] = useState<{ time: string; label: string }[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ time: string; label: string } | null>(null);
    const [form, setForm] = useState({ name: "", phone: "", notes: "" });
    const [submitting, setSubmitting] = useState(false);
    const [confirmed, setConfirmed] = useState<any>(null);
    const [error, setError] = useState("");

    const days = getNext7Days();

    // Load services for appointment booking (using compat /doctors endpoint for slot availability)
    useEffect(() => {
        api.get(`/kiosk/${hospitalId}/services`).catch(() =>
            api.get(`/kiosk/${hospitalId}/doctors`)
        ).then(res => {
            if (res.data.success) setDoctors(res.data.data);
        }).catch(() => { });
    }, [hospitalId]);

    // Load slots when doctor + date are selected
    useEffect(() => {
        if (!selectedDoc || !selectedDate) return;
        setLoadingSlots(true);
        setSlots([]);
        setSelectedSlot(null);
        fetch(`${API_BASE}/api/appointments/public/${hospitalId}/slots/${selectedDoc._id}?date=${selectedDate}`)
            .then(r => r.json())
            .then(data => { if (data.success) setSlots(data.slots || []); })
            .catch(() => setSlots([]))
            .finally(() => setLoadingSlots(false));
    }, [selectedDoc, selectedDate, hospitalId]);

    const handleBook = async () => {
        if (!selectedDoc || !selectedDate || !selectedSlot || !form.name.trim()) return;
        setSubmitting(true);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/api/appointments/public/${hospitalId}/book`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    doctorId: selectedDoc._id,
                    patientName: form.name.trim(),
                    phone: form.phone.trim(),
                    notes: form.notes.trim(),
                    date: selectedDate,
                    time: selectedSlot.time,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setConfirmed(data.appointment);
                setTimeout(() => {
                    setConfirmed(null); setStep(1); setSelectedDoc(null); setSelectedDate(""); setSelectedSlot(null); setForm({ name: "", phone: "", notes: "" });
                }, 14000);
            } else {
                setError(data.message || "Booking failed. Please try again.");
            }
        } catch { setError("Booking failed. Please try again."); }
        finally { setSubmitting(false); }
    };

    // ── Confirmation screen ──────────────────────────────────────────────────
    if (confirmed) {
        return (
            <div className="max-w-xl w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[40px] p-12 text-center shadow-2xl">
                <CalendarCheck className="w-24 h-24 text-success-400 mx-auto mb-6 animate-pulse" />
                <h2 className="text-4xl font-bold text-white mb-4">Appointment Booked!</h2>
                <p className="text-success-200 text-xl mb-8">Your appointment has been confirmed.</p>
                <div className="bg-black/40 rounded-3xl p-8 mb-6 border border-white/10 space-y-3 text-left">
                    <div className="flex justify-between"><span className="text-gray-400">Service</span><span className="text-white font-bold">{confirmed.doctorName || confirmed.serviceName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Date</span><span className="text-white font-bold">{new Date(confirmed.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Time</span><span className="text-white font-bold">{selectedSlot?.label}</span></div>
                </div>
                {form.phone && <p className="text-gray-400 text-sm mb-4">📱 A WhatsApp confirmation will be sent to {form.phone}</p>}
                <p className="text-sm text-gray-500 animate-pulse mt-6">Screen resets in a moment...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl animate-slideUp">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-10">
                {["Service", "Date", "Slot", "Confirm"].map((s, i) => (
                    <React.Fragment key={s}>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${step === i + 1 ? "bg-light-blue-500 text-white shadow-lg shadow-light-blue-500/40" : step > i + 1 ? "bg-success-500/20 text-success-400 border border-success-500/40" : "bg-white/5 text-gray-500 border border-white/10"}`}>
                            <span>{step > i + 1 ? "✓" : i + 1}</span> {s}
                        </div>
                        {i < 3 && <ChevronRight className="w-4 h-4 text-gray-600" />}
                    </React.Fragment>
                ))}
            </div>

            <div className="bg-[#1e293b]/90 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-2xl">

                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/40 rounded-2xl flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                        <p className="text-red-200 font-medium">{error}</p>
                        <button onClick={() => setError("")} className="ml-auto"><X className="w-4 h-4 text-red-400" /></button>
                    </div>
                )}

                {/* STEP 1: Select Service */}
                {step === 1 && (
                    <div>
                        <h3 className="text-2xl font-bold text-white mb-6">Select a Service</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                            {doctors.map((doc: any) => (
                                <button key={doc._id} onClick={() => { setSelectedDoc(doc); setStep(2); setSelectedDate(""); setSlots([]); setSelectedSlot(null); }}
                                    className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-light-blue-500/50 transition-all text-left group">
                                    <div className="w-14 h-14 bg-gradient-to-br from-light-blue-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <span className="text-xl font-black text-white">{doc.name.charAt(0)}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-white truncate">{doc.name}</p>
                                        <p className="text-light-blue-400 text-sm">{doc.category || doc.serviceCategory || doc.specialization}</p>
                                        <p className="text-gray-500 text-xs mt-1">{doc.avgSessionDuration || doc.avgConsultationTime || 10} min per slot</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-600 ml-auto flex-shrink-0" />
                                </button>
                            ))}
                            {doctors.length === 0 && <p className="text-gray-400 col-span-2 text-center py-8">No services available for appointment booking.</p>}
                        </div>
                    </div>
                )}

                {/* STEP 2: Select Date */}
                {step === 2 && (
                    <div>
                        <button onClick={() => setStep(1)} className="mb-6 text-light-blue-400 hover:text-light-blue-300 font-bold flex items-center gap-2 transition-colors">
                            <ChevronLeft className="w-5 h-5" /> Back
                        </button>
                        <h3 className="text-2xl font-bold text-white mb-2">Select a Date</h3>
                        <p className="text-gray-400 text-sm mb-6">Service: <span className="text-light-blue-400 font-semibold">{selectedDoc?.name}</span> · {selectedDoc?.avgSessionDuration || selectedDoc?.avgConsultationTime || 10} min slots</p>
                        <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                            {days.map(d => (
                                <button key={d.dateStr} onClick={() => { setSelectedDate(d.dateStr); setStep(3); }}
                                    className={`flex flex-col items-center py-4 px-2 rounded-2xl border font-bold transition-all ${selectedDate === d.dateStr ? "bg-light-blue-500 border-light-blue-400 text-white shadow-lg shadow-light-blue-500/30" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-light-blue-500/40"}`}>
                                    <span className="text-xs uppercase tracking-wider mb-1 opacity-70">{d.short}</span>
                                    <span className="text-2xl font-black">{d.dayNum}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 3: Select Time Slot */}
                {step === 3 && (
                    <div>
                        <button onClick={() => setStep(2)} className="mb-6 text-light-blue-400 hover:text-light-blue-300 font-bold flex items-center gap-2 transition-colors">
                            <ChevronLeft className="w-5 h-5" /> Back
                        </button>
                        <h3 className="text-2xl font-bold text-white mb-1">Choose a Time Slot</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            {selectedDoc?.name} · {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </p>
                        {loadingSlots ? (
                            <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-light-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                        ) : slots.length === 0 ? (
                            <div className="text-center py-12">
                                <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400 text-lg font-semibold">No slots available</p>
                                <p className="text-gray-500 text-sm mt-2">The doctor may not be scheduled on this day, or all slots are booked.</p>
                                <button onClick={() => setStep(2)} className="mt-6 text-light-blue-400 font-bold hover:text-light-blue-300">Pick another date</button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                                    {slots.map(slot => (
                                        <button key={slot.time} onClick={() => setSelectedSlot(slot)}
                                            className={`py-3 px-2 rounded-xl border text-sm font-bold transition-all ${selectedSlot?.time === slot.time ? "bg-light-blue-500 border-light-blue-400 text-white shadow-md shadow-light-blue-500/30" : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-light-blue-500/40"}`}>
                                            {slot.label}
                                        </button>
                                    ))}
                                </div>
                                <button disabled={!selectedSlot} onClick={() => setStep(4)}
                                    className="w-full mt-6 py-4 rounded-2xl bg-gradient-to-r from-light-blue-500 to-primary-600 text-white font-black text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100">
                                    Continue with {selectedSlot?.label || "a slot"} <ArrowRight className="w-6 h-6" />
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* STEP 4: Details + Confirm */}
                {step === 4 && (
                    <div>
                        <button onClick={() => setStep(3)} className="mb-6 text-light-blue-400 hover:text-light-blue-300 font-bold flex items-center gap-2 transition-colors">
                            <ChevronLeft className="w-5 h-5" /> Back
                        </button>
                        <h3 className="text-2xl font-bold text-white mb-6">Your Details</h3>

                        {/* Booking summary */}
                        <div className="bg-black/30 rounded-2xl p-5 mb-6 border border-white/10 space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-gray-400">Service</span><span className="text-white font-semibold">{selectedDoc?.name}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-400">Date</span><span className="text-white font-semibold">{new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-400">Time</span><span className="text-light-blue-400 font-bold">{selectedSlot?.label}</span></div>
                        </div>

                        <div className="space-y-5">
                            {[
                                { label: "Full Name *", key: "name", type: "text", icon: <User className="w-6 h-6" />, placeholder: "Enter your name", required: true },
                                { label: "Phone (for WhatsApp confirmation)", key: "phone", type: "tel", icon: <Phone className="w-6 h-6" />, placeholder: "Enter phone number", required: false },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 ml-2">{f.label}</label>
                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500">{f.icon}</div>
                                        <input type={f.type} required={f.required} value={(form as any)[f.key]}
                                            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                                            placeholder={f.placeholder}
                                            className="w-full pl-14 pr-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-lg outline-none focus:border-light-blue-500 focus:ring-2 focus:ring-light-blue-500/30 transition-all placeholder:text-gray-600" />
                                    </div>
                                </div>
                            ))}
                            <div>
                                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 ml-2">Reason for Visit (Optional)</label>
                                <div className="relative">
                                    <div className="absolute left-5 top-5 text-gray-500"><FileText className="w-6 h-6" /></div>
                                    <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Brief description..."
                                        className="w-full pl-14 pr-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white text-lg outline-none focus:border-light-blue-500 focus:ring-2 focus:ring-light-blue-500/30 transition-all placeholder:text-gray-600 resize-none" />
                                </div>
                            </div>

                            <button disabled={submitting || !form.name.trim()} onClick={handleBook}
                                className="w-full py-5 rounded-2xl bg-gradient-to-r from-light-blue-500 to-primary-600 hover:from-light-blue-400 hover:to-primary-500 shadow-[0_0_40px_rgba(6,182,212,0.4)] text-white font-black text-xl flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100">
                                {submitting ? "Booking..." : "Confirm Appointment"} <CalendarCheck className="w-7 h-7" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KioskPage() {
    const params = useParams();
    const hospitalId = params.hospitalId as string;
    const [mode, setMode] = useState<"walkin" | "appointment">("walkin");

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0c0516] via-[#0f172a] to-[#0c0516] p-8 relative overflow-hidden flex flex-col items-center">
            {/* Background */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-light-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <div className="text-center mb-8 relative z-10">
                <h1 className="text-5xl font-black text-white mb-3 tracking-tight drop-shadow-lg">Welcome</h1>
                <p className="text-xl text-light-blue-200 font-medium">Self-Service Kiosk</p>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-3 mb-10 relative z-10 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl">
                <button onClick={() => setMode("walkin")}
                    className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-base transition-all ${mode === "walkin" ? "bg-light-blue-500 text-white shadow-lg shadow-light-blue-500/30" : "text-gray-400 hover:text-gray-200"}`}>
                    <UserPlus className="w-5 h-5" /> Walk-In Check-In
                </button>
                <button onClick={() => setMode("appointment")}
                    className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-base transition-all ${mode === "appointment" ? "bg-light-blue-500 text-white shadow-lg shadow-light-blue-500/30" : "text-gray-400 hover:text-gray-200"}`}>
                    <CalendarCheck className="w-5 h-5" /> Book Appointment
                </button>
            </div>

            {/* Content */}
            <div className="relative z-10 w-full flex justify-center">
                {mode === "walkin" ? <WalkIn hospitalId={hospitalId} /> : <AppointmentBooking hospitalId={hospitalId} />}
            </div>
        </div>
    );
}
