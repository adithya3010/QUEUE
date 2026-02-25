"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/services/api";
import { socket } from "@/services/socket";
import Loader from "@/components/Loader";
import { CheckCircle, XCircle, Clock, AlertTriangle, Activity } from "lucide-react";

export default function PatientStatusView() {
    const { uniqueLinkId } = useParams();

    const [data, setData] = useState(null);
    const [completed, setCompleted] = useState(false);
    const [cancelled, setCancelled] = useState(false);
    const [remainingMinutes, setRemainingMinutes] = useState(null);
    const [doctorStatus, setDoctorStatus] = useState("Available");
    const [loading, setLoading] = useState(true);

    function formatTime(mins) {
        if (mins == null) return "--";
        if (mins >= 60) {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
        }
        return `${mins} min`;
    }

    const loadStatus = async () => {
        try {
            const res = await api.get(`/queue/status/${uniqueLinkId}`);

            if (res.data.status === "completed") {
                setCompleted(true);
                return;
            }
            if (res.data.status === "cancelled") {
                setCancelled(true);
                return;
            }

            setData(res.data);

            const me = res.data?.queue?.find(p => p.isMe);

            if (me?.waitMinutes != null) {
                setRemainingMinutes(me.waitMinutes);
            } else if (res.data?.myPosition != null) {
                const peopleBefore = res.data.myPosition - 1;
                const avg = res.data.avgTime || 5;
                setRemainingMinutes(peopleBefore * avg);
            }

            socket.connect();
            socket.emit("joinDoctorRoom", res.data.doctorId);
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!uniqueLinkId) return;
        loadStatus();

        socket.connect();
        socket.emit("joinPatientRoom", uniqueLinkId);

        socket.on("visitCompleted", () => setCompleted(true));
        socket.on("visitCancelled", () => setCancelled(true));
        socket.on("queueUpdated", loadStatus);

        socket.on("doctorAvailabilityChanged", status => {
            setDoctorStatus(status);
            if (status === "Available") loadStatus();
        });

        return () => {
            socket.off("visitCompleted");
            socket.off("visitCancelled");
            socket.off("queueUpdated");
            socket.off("doctorAvailabilityChanged");
        };
    }, [uniqueLinkId]);

    useEffect(() => {
        if (remainingMinutes == null) return;
        if (doctorStatus !== "Available") return;

        const interval = setInterval(() => {
            setRemainingMinutes(prev => (prev > 0 ? prev - 1 : 0));
        }, 60000);

        return () => clearInterval(interval);
    }, [remainingMinutes, doctorStatus]);

    if (loading) return <Loader />;

    if (cancelled)
        return (
            <div className="min-h-screen flex justify-center items-center bg-[#060c21] px-6 relative overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/10 blur-[150px] rounded-full pointer-events-none" />
                <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-3xl border border-red-500/20 shadow-[0_0_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] text-center max-w-md w-full animate-fade-up z-10">
                    <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                    <h2 className="text-3xl font-extrabold text-white">Visit Cancelled</h2>
                    <p className="mt-4 text-gray-400 font-medium">Your appointment has been cancelled. Please contact the reception desk if this is a mistake.</p>
                </div>
            </div>
        );

    if (completed)
        return (
            <div className="min-h-screen flex justify-center items-center bg-[#060c21] px-6 relative overflow-hidden">
                <div className="absolute w-[50%] h-[50%] bg-success-600/10 blur-[150px] rounded-full pointer-events-none" />
                <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-3xl border border-success-500/20 shadow-[0_0_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] text-center max-w-md w-full animate-fade-up z-10">
                    <CheckCircle className="w-20 h-20 text-success-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                    <h2 className="text-3xl font-extrabold text-white">Visit Completed</h2>
                    <p className="mt-4 text-gray-400 font-medium">Thank you for visiting! Have a wonderful day and speedy recovery.</p>
                </div>
            </div>
        );

    if (!data) return <Loader />;

    return (
        <div className="min-h-screen flex justify-center items-center bg-[#060c21] text-white p-6 relative overflow-hidden selection:bg-primary-500/30 py-12">

            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-600/20 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-light-blue-600/20 blur-[150px] rounded-full pointer-events-none" />

            <div className="relative w-full max-w-[420px] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-[2.5rem] p-8 sm:p-10 animate-fade-up">

                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-light-blue-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30 mb-4">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 text-center">
                        Live Status
                    </h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/30 border border-white/10 rounded-2xl p-5 shadow-inner flex flex-col items-center justify-center text-center">
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Your Token</p>
                        <p className="text-3xl font-black text-white mt-2">#{data.myTokenNumber}</p>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-2xl p-5 shadow-inner flex flex-col items-center justify-center text-center">
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Queue Position</p>
                        <p className="text-3xl font-black text-light-blue-400 mt-2">{data.myPosition}</p>
                    </div>
                </div>

                {doctorStatus !== "Available" && (
                    <div className="mt-6 bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl flex items-center gap-3 shadow-inner">
                        <AlertTriangle className="w-6 h-6 shrink-0" />
                        <p className="font-semibold text-sm">Doctor is {doctorStatus}. Queue is currently paused.</p>
                    </div>
                )}

                <div className="mt-6 bg-gradient-to-br from-primary-500/10 to-light-blue-500/10 border border-primary-500/20 text-primary-300 p-5 rounded-2xl flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 opacity-80" />
                        <span className="font-bold tracking-wide text-sm text-primary-100">Est. Wait Time</span>
                    </div>
                    <span className="text-xl font-black bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 shadow-inner text-white">
                        {formatTime(remainingMinutes)}
                    </span>
                </div>

                {data.myPosition <= 3 && doctorStatus === "Available" && (
                    <div className="mt-6 bg-success-500/10 border border-success-500/20 p-4 rounded-2xl animate-pulse shadow-inner">
                        <p className="text-success-400 text-sm font-bold text-center flex items-center justify-center gap-2">
                            <AlertTriangle className="w-5 h-5 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]" /> Be Ready — You are up next!
                        </p>
                    </div>
                )}

                <div className="mt-10">
                    <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-light-blue-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" /> Live Queue Overview
                    </h3>
                    <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/20 shadow-inner">
                        {data.queue.map(p => (
                            <div
                                key={p.id}
                                className={`px-4 py-3.5 flex justify-between items-center transition-colors
                                    ${p.isMe
                                        ? "bg-primary-500/20 border-l-4 border-primary-400 font-bold"
                                        : "border-b border-white/5 last:border-0 hover:bg-white/5"}`}>
                                <span className={`font-semibold ${p.isMe ? "text-white" : "text-gray-300"}`}>
                                    #{p.tokenNumber} <span className="text-gray-600 mx-2 font-normal text-sm">|</span> <span className="text-sm">{p.isMe ? "You" : "Patient"}</span>
                                </span>
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold shadow-inner ${p.isMe ? "bg-primary-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-black/40 border border-white/5 text-gray-400"}`}>
                                    Pos: {p.position}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
