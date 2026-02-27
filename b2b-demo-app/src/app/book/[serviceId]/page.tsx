"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getServiceSlots, bookAppointment, getServices } from "@/lib/api";
import { format, addDays } from "date-fns";
import { ArrowLeft, Calendar as CalendarIcon, Clock, User, Phone, CheckCircle2, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function BookAppointment() {
    const params = useParams();
    const router = useRouter();
    const serviceId = params.serviceId as string;

    const [serviceName, setServiceName] = useState("Loading Service...");
    const [dates, setDates] = useState<Date[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [slots, setSlots] = useState<any[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({ name: "", phone: "", notes: "" });
    const [loading, setLoading] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [error, setError] = useState("");

    // Step state: 1: Date/Time, 2: Details
    const [step, setStep] = useState(1);

    useEffect(() => {
        // Generate next 7 days
        const next7Days = Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i));
        setDates(next7Days);
        setSelectedDate(next7Days[0]);

        // Fetch service info
        getServices().then(res => {
            const svc = res.data.find((s: any) => s.id === serviceId);
            if (svc) setServiceName(svc.name);
        }).catch(console.error);

    }, [serviceId]);

    useEffect(() => {
        if (!selectedDate) return;

        setLoading(true);
        setSlots([]);
        setError("");

        const dateStr = format(selectedDate, "yyyy-MM-dd");

        getServiceSlots(serviceId, dateStr)
            .then((res) => setSlots(res.slots || []))
            .catch((err) => setError(err.message || "Failed to load slots"))
            .finally(() => setLoading(false));
    }, [selectedDate, serviceId]);

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSlot || !selectedDate) return;

        setBookingLoading(true);
        setError("");

        try {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const scheduledAt = `${dateStr}T${selectedSlot}:00Z`; // Format strictly according to your timezone needs. Simplified here.

            const res = await bookAppointment({
                serviceId,
                clientName: formData.name,
                clientPhone: formData.phone,
                scheduledAt,
                notes: formData.notes
            });

            // Redirect to success/tracking page using the Appointment ID
            router.push(`/status/${res.appointmentId}`);

        } catch (err: any) {
            setError(err.message || "Failed to book appointment. Slot may be taken.");
            setBookingLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 flex flex-col items-center pb-20">

            {/* Header */}
            <div className="w-full bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-6 py-6 font-semibold flex items-center justify-between">
                    <Link href="/" className="text-gray-500 hover:text-blue-600 flex items-center group transition-colors">
                        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back
                    </Link>
                    <h1 className="text-xl text-gray-900 tracking-tight ml-4">{serviceName}</h1>
                </div>
            </div>

            <div className="max-w-2xl w-full px-6 py-8">

                {/* Progress Bar */}
                <div className="flex items-center justify-between mb-8 relative">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -z-10 -translate-y-1/2 rounded-full"></div>
                    <div
                        className="absolute top-1/2 left-0 h-1 bg-blue-600 -z-10 -translate-y-1/2 rounded-full transition-all duration-500"
                        style={{ width: step === 1 ? '50%' : '100%' }}
                    ></div>

                    <div className={`flex flex-col items-center ${step >= 1 ? 'text-blue-700' : 'text-gray-400'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 shadow-sm transition-colors ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>1</div>
                        <span className="text-sm font-medium">Select Time</span>
                    </div>

                    <div className={`flex flex-col items-center ${step >= 2 ? 'text-blue-700' : 'text-gray-400'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 shadow-sm transition-colors ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>2</div>
                        <span className="text-sm font-medium">Your Details</span>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-start border border-red-100">
                        <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                {/* STEP 1: Date & Time Selection */}
                {step === 1 && (
                    <div className="glass-panel bg-white p-6 md:p-8 rounded-2xl shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                            <CalendarIcon className="w-5 h-5 mr-2 text-blue-500" /> Date
                        </h2>

                        <div className="flex overflow-x-auto pb-4 gap-3 snap-x scrollbar-hide mb-8">
                            {dates.map((date, i) => {
                                const isSelected = selectedDate?.toDateString() === date.toDateString();
                                const isToday = i === 0;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => { setSelectedDate(date); setSelectedSlot(null); }}
                                        className={`snap-start flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-xl border-2 transition-all duration-200 ${isSelected
                                                ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                                                : "border-gray-100 bg-white text-gray-600 hover:border-blue-300 hover:bg-gray-50"
                                            }`}
                                    >
                                        <span className="text-xs font-semibold uppercase mb-1 opacity-80">{format(date, "EEE")}</span>
                                        <span className="text-2xl font-bold">{format(date, "d")}</span>
                                        {isToday && <span className="text-[10px] font-bold mt-1 text-green-600">TODAY</span>}
                                    </button>
                                );
                            })}
                        </div>

                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                            <Clock className="w-5 h-5 mr-2 text-purple-500" /> Available Time
                        </h2>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
                                <p>Finding available slots...</p>
                            </div>
                        ) : slots.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                {slots.map((slot) => {
                                    const isAvailable = slot.status === "available";
                                    return (
                                        <button
                                            key={slot.time}
                                            disabled={!isAvailable}
                                            onClick={() => setSelectedSlot(slot.time)}
                                            className={`py-3 rounded-lg text-sm font-semibold border transition-all ${!isAvailable
                                                    ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                                                    : selectedSlot === slot.time
                                                        ? "bg-blue-600 border-blue-600 text-white shadow-md transform scale-105"
                                                        : "bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50"
                                                }`}
                                        >
                                            {slot.time}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-gray-500 font-medium">No available slots on this date.</p>
                                <p className="text-sm text-gray-400 mt-1">Please select another date above.</p>
                            </div>
                        )}

                        <div className="mt-10 pt-6 border-t flex justify-end">
                            <button
                                onClick={() => setStep(2)}
                                disabled={!selectedSlot}
                                className={`flex items-center px-8 py-3 rounded-xl font-bold transition-all shadow-sm ${selectedSlot
                                        ? "bg-gray-900 text-white hover:bg-black hover:shadow-md transform hover:-translate-y-0.5"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                Continue <ChevronRight className="ml-2 w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: User Details */}
                {step === 2 && (
                    <div className="glass-panel bg-white p-6 md:p-8 rounded-2xl shadow-sm">

                        {/* Summary Card */}
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-8 flex justify-between items-center text-blue-900">
                            <div>
                                <p className="text-sm font-medium text-blue-700 mb-1">Appointment Time</p>
                                <p className="font-bold text-lg">
                                    {selectedDate ? format(selectedDate, "EEEE, MMMM d") : ""} at {selectedSlot}
                                </p>
                            </div>
                            <button onClick={() => setStep(1)} className="text-sm font-bold text-blue-600 bg-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                                Change
                            </button>
                        </div>

                        <form onSubmit={handleBook} className="space-y-5">

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                                    <User className="w-4 h-4 mr-2" /> Full Name
                                </label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all placeholder-gray-400 bg-gray-50 focus:bg-white"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                                    <Phone className="w-4 h-4 mr-2" /> Phone Number
                                </label>
                                <input
                                    required
                                    type="tel"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all placeholder-gray-400 bg-gray-50 focus:bg-white"
                                    placeholder="WhatsApp Number (e.g. +91...)"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-2 flex items-center">
                                    <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                                    We'll send your confirmation via WhatsApp.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Notes for the provider (Optional)
                                </label>
                                <textarea
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none placeholder-gray-400 bg-gray-50 focus:bg-white"
                                    rows={3}
                                    placeholder="Please describe the reason for your visit..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="pt-6 mt-6 border-t flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-gray-500 font-bold hover:text-gray-900 transition-colors"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={bookingLoading}
                                    className={`flex items-center px-8 py-3 rounded-xl font-bold text-white transition-all shadow-md
                                ${bookingLoading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5"}`
                                    }
                                >
                                    {bookingLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin relative top-[0.5px]" />
                                            Booking...
                                        </>
                                    ) : "Confirm Booking"}
                                </button>
                            </div>

                        </form>
                    </div>
                )}

            </div>
        </main>
    );
}
