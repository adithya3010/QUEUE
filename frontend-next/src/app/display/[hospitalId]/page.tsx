"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/services/api";
import { MonitorPlay, Stethoscope, ArrowRight } from "lucide-react";
import io from 'socket.io-client';

export default function DisplayBoard() {
    const params = useParams();
    const hospitalId = params.hospitalId;
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadDisplayData = async () => {
        try {
            const res = await api.get(`/kiosk/${hospitalId}/display`);
            if (res.data.success) {
                setDoctors(res.data.data);
            }
        } catch (err) {
            console.error("Failed to load display data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!hospitalId) return;

        loadDisplayData();

        // WebSocket Integration for real-time TV re-rendering
        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            console.log("Connected to display socket");
            socket.emit('joinHospitalPublicRoom', hospitalId);
        });

        socket.on('queueUpdated', () => {
            console.log("Queue Update Received via Socket, Reloading Display Data...");
            loadDisplayData();
        });

        socket.on('doctorAvailabilityChanged', () => {
            console.log("Doctor Availability Changed via Socket, Reloading Display Data...");
            loadDisplayData();
        });

        // Polling fallback (typical for digital signage to ensure it never gets stuck)
        const interval = setInterval(() => {
            loadDisplayData();
        }, 10000);

        return () => {
            socket.off('queueUpdated');
            socket.off('doctorAvailabilityChanged');
            socket.disconnect();
            clearInterval(interval);
        };
    }, [hospitalId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0c0516] flex items-center justify-center">
                <div className="w-24 h-24 border-8 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0c0516] p-8 text-white font-sans overflow-hidden flex flex-col relative">
            {/* Ambient TV Glow Background */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-fuchsia-600/10 blur-[150px] rounded-full pointer-events-none" />

            {/* Header */}
            <header className="flex items-center justify-between mb-12 relative z-10 border-b border-white/10 pb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <MonitorPlay className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight">Clinic Wait Status</h1>
                        <p className="text-xl text-gray-400 font-medium">Please watch the screen for your number</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-5xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </header>

            {/* Main Grid */}
            <main className="flex-1 relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 content-start">

                {doctors.length === 0 ? (
                    <div className="col-span-full text-center py-32">
                        <p className="text-4xl text-gray-500 font-medium">No active clinics at the moment.</p>
                    </div>
                ) : (
                    doctors.map((doc: any, index: number) => (
                        <div
                            key={doc.doctorId}
                            className="bg-[#110c21]/80 backdrop-blur-3xl border border-white/10 rounded-[30px] p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            {/* Card Glow */}
                            <div className={`absolute -top-20 -right-20 w-48 h-48 blur-[60px] rounded-full pointer-events-none bg-blue-500/20`} />

                            <div className="mb-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <Stethoscope className="w-6 h-6 text-blue-400" />
                                    <h2 className="text-3xl font-bold truncate pr-4">{doc.doctorName}</h2>
                                </div>
                                <p className="text-xl text-gray-400 font-medium">{doc.specialization}</p>
                            </div>

                            <div className={`rounded-2xl p-6 border ${doc.servingToken !== '---' ? 'bg-gradient-to-br from-blue-900/40 to-fuchsia-900/40 border-blue-500/30' : 'bg-white/5 border-white/5'}`}>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Currently Serving</p>
                                <div className="flex items-baseline gap-4">
                                    <span className={`text-7xl font-black tracking-tighter drop-shadow-lg ${doc.servingToken !== '---' ? 'text-white' : 'text-gray-600'}`}>
                                        {doc.servingToken}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>

            {/* Footer Ticker */}
            <footer className="mt-12 py-4 border-t border-white/10 relative z-10 overflow-hidden shrink-0">
                <div className="whitespace-nowrap flex items-center gap-8 animate-[scrolling_30s_linear_infinite]">
                    <span className="text-gray-400 text-xl font-medium tracking-wide flex items-center gap-2"><ArrowRight className="w-5 h-5 text-blue-500" /> Please have your ID ready when your number is called.</span>
                    <span className="text-gray-400 text-xl font-medium tracking-wide flex items-center gap-2"><ArrowRight className="w-5 h-5 text-blue-500" /> For self check-in, please use the Kiosks at the entrance.</span>
                    <span className="text-gray-400 text-xl font-medium tracking-wide flex items-center gap-2"><ArrowRight className="w-5 h-5 text-blue-500" /> Wait times are approximate and may change based on emergencies.</span>
                    <span className="text-gray-400 text-xl font-medium tracking-wide flex items-center gap-2"><ArrowRight className="w-5 h-5 text-blue-500" /> Please have your ID ready when your number is called.</span>
                </div>
            </footer>
        </div>
    );
}

// Add scrolling animation to globals.css or tailwind config in a real app.
// For now, we'll just let tailwind use standard classes.
