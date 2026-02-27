"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { arriveForAppointment } from "@/lib/api";
import { CheckCircle, AlertCircle, CalendarClock, ArrowRight, Loader2, Play } from "lucide-react";
import Link from "next/link";

export default function AppointmentSuccess() {
    const params = useParams();
    const router = useRouter();
    const appointmentId = params.appointmentId as string;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [arrivedResult, setArrivedResult] = useState<any>(null);

    // In a real app, you might fetch the appointment details to show the summary here
    // For the demo, we are showing the "Arrived" flow which transitions the appointment into
    // the live Queue.

    const handleSelfCheckIn = async () => {
        setLoading(true);
        setError("");

        try {
            const res = await arriveForAppointment(appointmentId);
            setArrivedResult(res);
        } catch (err: any) {
            setError(err.message || "Could not complete check-in.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6 pb-32">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-50 to-white -z-10"></div>

            {arrivedResult ? (
                <div className="max-w-md w-full text-center slide-up-anim">
                    <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border-4 border-white">
                        <CheckCircle className="w-12 h-12" />
                    </div>

                    <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Check-in Complete!</h1>
                    <p className="text-gray-500 mb-8">
                        You have been added to the live queue.
                    </p>

                    <div className="bg-white border border-gray-100 shadow-xl shadow-blue-900/5 rounded-2xl p-8 mb-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>

                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Your Token Number</p>
                        <div className="text-7xl font-black text-gray-900 tracking-tighter mb-4">
                            {arrivedResult.tokenNumber}
                        </div>

                        <div className="bg-blue-50 text-blue-700 py-3 rounded-xl font-medium flex items-center justify-center">
                            <Clock className="w-5 h-5 mr-2 opacity-70" />
                            Est. Wait: {arrivedResult.estimatedWaitMins} mins
                        </div>
                    </div>

                    <Link
                        href={arrivedResult.statusLink} // Note: The Smart-Queue API returns a relative link. For B2B, the tracking page needs to hit /v2/queue/:uniqueLinkId
                        className="inline-flex w-full items-center justify-center py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors shadow-md group"
                        target="_blank"
                    >
                        View Live Queue Status
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <p className="text-xs text-gray-400 mt-4">
                        In a real B2B scenario, you can build a native white-labeled tracking page using <code className="bg-gray-100 text-gray-600 px-1 rounded">/v2/queue/xyz</code>.
                    </p>
                </div>
            ) : (
                <div className="max-w-md w-full bg-white border border-gray-100 shadow-xl shadow-black/5 rounded-2xl p-8 slide-up-anim relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>

                    <div className="flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-6 ring-8 ring-blue-50">
                        <CalendarClock className="w-8 h-8" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Confirmed!</h1>
                    <p className="text-gray-600 mb-8">
                        Your appointment has been successfully booked. You will receive a WhatsApp confirmation shortly.
                    </p>

                    <div className="bg-amber-50 border border-amber-100 p-5 rounded-xl mb-8">
                        <h3 className="font-bold text-amber-900 mb-2 text-sm flex items-center">
                            <Play className="w-4 h-4 mr-2" />
                            Demo Action: Kiosk Self Check-in
                        </h3>
                        <p className="text-amber-700 text-sm opacity-90 leading-relaxed mb-4">
                            When you arrive at the clinic, you can scan a QR code to check in, which moves you from the "Appointments" list into the live "Queue".
                        </p>

                        {error && (
                            <p className="text-red-500 text-sm font-medium mb-3 bg-red-50 p-2 rounded">{error}</p>
                        )}

                        <button
                            onClick={handleSelfCheckIn}
                            disabled={loading}
                            className={`w-full py-3 rounded-lg font-bold shadow-sm transition-all focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 flex items-center justify-center
                          ${loading ? "bg-amber-200 text-amber-700 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-600 text-white"}`}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                            {loading ? "Checking In..." : "Simulate Arrival / Check-in"}
                        </button>
                    </div>

                    <div className="text-center">
                        <Link href="/" className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">
                            Book Another Appointment
                        </Link>
                    </div>
                </div>
            )}

        </main>
    );
}

// Just a quick icon definition needed since I used Clock but didn't import it in the file head
function Clock(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}
