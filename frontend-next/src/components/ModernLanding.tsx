"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import anime from "animejs";
import { Activity, Shield, Lock, Smartphone, ChevronDown, CheckCircle2, ChevronRight, Wifi, Battery, MonitorSmartphone, Layers, MapPin, Search } from "lucide-react";

export default function ModernLanding() {
    useEffect(() => {
        const tl = anime.timeline({ easing: 'easeOutExpo' });

        tl.add({
            targets: '.animate-fade-up',
            translateY: [40, 0],
            opacity: [0, 1],
            delay: anime.stagger(100),
            duration: 1000,
        }).add({
            targets: '.animate-scale-in',
            scale: [0.9, 1],
            opacity: [0, 1],
            delay: anime.stagger(150),
            duration: 800,
        }, '-=600');
    }, []);

    return (
        <div className="min-h-screen bg-[#060c21] text-white font-sans overflow-hidden selection:bg-blue-500/30 relative">

            {/* Base Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute top-[40%] left-[30%] w-[30%] h-[20%] bg-cyan-400/10 blur-[150px] rounded-[100%] pointer-events-none" />

            {/* Navbar */}
            <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto animate-fade-up opacity-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <MonitorSmartphone className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white">SmartQueue</span>
                </div>

                <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-300">
                    <span className="hover:text-white cursor-pointer transition-colors flex items-center gap-1">Features <ChevronDown className="w-3 h-3" /></span>
                    <span className="hover:text-white cursor-pointer transition-colors flex items-center gap-1">How It Works <ChevronDown className="w-3 h-3" /></span>
                    <span className="hover:text-white cursor-pointer transition-colors flex items-center gap-1">Dashboard <ChevronDown className="w-3 h-3" /></span>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-sm font-bold bg-blue-600 bg-opacity-80 hover:bg-blue-500 text-white px-5 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/50">
                        Get Started
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 w-full pt-16 sm:pt-24 pb-20">

                {/* Hero Title */}
                <div className="max-w-4xl mx-auto text-center px-6 animate-fade-up opacity-0">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 text-white text-shadow-glow">
                        Revolutionizing Hospital Queues
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-300 font-medium mb-8">
                        Track your wait time in real-time. Seamless, smart, and stress-free.
                    </p>
                    <Link href="/signup" className="inline-block px-8 py-3 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 border border-blue-400/50 text-white font-bold text-lg shadow-[0_10px_30px_rgba(37,99,235,0.5)] transition-all hover:-translate-y-1">
                        Get Started
                    </Link>
                </div>

                {/* Hero Massive Visual Stage */}
                <div className="relative mt-24 mb-32 h-[500px] w-full max-w-7xl mx-auto overflow-visible px-4 animate-scale-in opacity-0">

                    {/* Glowing Horizon Line */}
                    <div className="absolute inset-0 flex items-center justify-center bottom-20">
                        <div className="w-[120%] h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
                        <div className="absolute w-[80%] h-[300px] bg-blue-500/10 blur-[100px] rounded-[100%] pointer-events-none" />
                    </div>

                    {/* Central Area: Add Patient & Trusted By */}
                    <div className="absolute left-[5%] top-[5%] md:left-[10%] md:top-[15%] w-[80%] md:w-[60%] h-[280px] bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-2xl flex md:flex-row flex-col gap-8 z-20">

                        {/* Add Patient Mockup */}
                        <div className="w-[240px] bg-white/10 border border-white/10 rounded-2xl p-4 shadow-inner">
                            <h3 className="font-bold text-sm mb-4 text-white">Get Started</h3>
                            <div className="space-y-3">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Add Patient</div>
                                <div className="w-full h-8 bg-black/30 rounded border border-white/10 px-3 flex items-center text-xs text-gray-400">Name</div>
                                <div className="w-full h-8 bg-black/30 rounded border border-white/10 px-3 flex items-center justify-between text-xs text-gray-400">
                                    Reason <ChevronDown className="w-3 h-3" />
                                </div>
                                <button className="w-2/3 py-2 bg-blue-500 hover:bg-blue-400 rounded-lg text-xs font-bold mt-2 shadow-[0_5px_15px_rgba(59,130,246,0.4)] transition-colors">
                                    Add to Queue
                                </button>
                            </div>
                        </div>

                        {/* Trusted By & Illustrations */}
                        <div className="flex-1 flex flex-col justify-end pb-4 hidden md:flex">
                            <div className="mb-auto">
                                <p className="text-xs font-bold text-gray-400 mb-3 ml-2">Trusted by Leading Hospitals</p>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded"><div className="w-4 h-4 bg-red-500 rounded-sm rotate-45" /><span className="text-[10px] font-bold text-blue-100">MediCare</span></div>
                                    <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded"><Activity className="w-4 h-4 text-cyan-400" /><span className="text-[10px] font-bold text-blue-100">Nexa Health</span></div>
                                    <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded"><Shield className="w-4 h-4 text-emerald-400" /><span className="text-[10px] font-bold text-blue-100">St.Anthony's</span></div>
                                </div>
                            </div>

                            {/* Abstract Illustration representation via CSS elements */}
                            <div className="flex items-end gap-3 opacity-60">
                                <div className="w-8 h-24 bg-gradient-to-t from-blue-500/20 to-transparent rounded-t-full relative">
                                    <div className="w-5 h-5 bg-blue-400 rounded-full absolute -top-5 left-1.5" />
                                </div>
                                <div className="w-32 h-1 bg-white/20 mb-2" />
                                <div className="w-12 h-16 bg-gradient-to-t from-purple-500/20 to-transparent rounded-t-full relative">
                                    <div className="w-5 h-5 bg-purple-400 rounded-full absolute -top-5 left-3.5" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Floating Phone Mockup */}
                    <div className="absolute z-30 right-[5%] md:right-[15%] -top-10 w-[260px] h-[520px] bg-[#11162d] border-[6px] border-gray-900 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(59,130,246,0.4)] flex flex-col py-6 px-4 hidden sm:flex hover:-translate-y-4 transition-transform duration-500">
                        {/* Dynamic Island / Notch */}
                        <div className="w-20 h-5 bg-gray-900 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-[10px]" />

                        {/* Status Bar */}
                        <div className="w-full flex justify-between text-[10px] text-gray-400 font-bold mb-6 px-2">
                            <span>9:41</span>
                            <div className="flex gap-1.5"><Wifi className="w-3 h-3" /><Battery className="w-3 h-3" /></div>
                        </div>

                        {/* Content */}
                        <h2 className="text-white text-center font-bold text-lg mb-6">Your Status</h2>
                        <div className="w-full bg-[#1e2442] rounded-2xl p-4 border border-white/5 text-center shadow-inner flex-1">
                            <p className="text-xs text-gray-400 mb-2">Dr. Smith's Clinic</p>
                            <div className="w-full h-[1px] bg-white/10 my-4" />
                            <p className="text-sm text-gray-300 mb-2">Current Position: <span className="text-white font-extrabold text-xl">#3</span></p>
                            <div className="w-full h-[1px] bg-white/10 my-4" />
                            <p className="text-sm text-gray-300 mb-2">Estimated Wait <span className="text-white font-extrabold text-xl">14 mins</span></p>
                            <div className="w-full h-[1px] bg-white/10 my-4" />
                            <p className="text-xs font-semibold text-gray-400 bg-black/20 py-2 rounded-lg">Please be ready.</p>
                        </div>

                        {/* Footer Indicator */}
                        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-400/10 py-1.5 rounded-full mx-8 border border-emerald-400/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Updated Just Now
                        </div>
                    </div>
                </div>

                {/* Triple Feature Cards */}
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-6 relative z-30 mb-20">

                    {/* Live Queue Updates */}
                    <div className="bg-[#121833]/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 overflow-hidden relative group hover:border-blue-500/40 transition-colors animate-fade-up opacity-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <h3 className="text-xl font-bold mb-1 text-white">Live Queue Updates</h3>
                        <p className="text-sm text-gray-400 mb-8">Real-time sync across all devices.</p>

                        {/* Minimalist Graphic */}
                        <div className="w-full h-32 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl border border-white/10 p-4 flex flex-col gap-3 relative shadow-inner">
                            <div className="w-full flex gap-3">
                                <div className="h-4 w-1/3 bg-blue-500/30 rounded-md border border-blue-400/20" />
                                <div className="h-4 w-1/4 bg-blue-400/20 rounded-md border border-white/5" />
                            </div>
                            <div className="w-full flex-1 flex gap-3">
                                <div className="w-1/3 bg-white/5 rounded-xl border border-white/5 relative overflow-hidden">
                                    <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-white/10" />
                                    <div className="absolute top-8 left-2 right-2 h-1 bg-white/10 rounded" />
                                </div>
                                <div className="w-2/3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-2 p-3">
                                    <div className="w-full h-3 bg-white/20 rounded-md" />
                                    <div className="w-4/5 h-3 bg-white/10 rounded-md" />
                                    <div className="w-full h-3 bg-white/10 rounded-md" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ETA Calculation */}
                    <div className="bg-[#121833]/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 overflow-hidden relative group hover:border-cyan-500/40 transition-colors animate-fade-up opacity-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <h3 className="text-xl font-bold mb-1 text-white">ETA Calculation</h3>
                        <p className="text-sm text-gray-400 mb-8">Accurate wait times using smart algorithms.</p>

                        <div className="w-full h-32 flex justify-between gap-4 mt-auto">
                            {/* Left Info Box */}
                            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                                <div className="w-full">
                                    <p className="text-[10px] text-emerald-400 font-bold tracking-wider mb-2 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Tracking Active
                                    </p>
                                    <p className="text-2xl font-black text-white">14 <span className="text-sm font-medium text-gray-400">mins</span></p>
                                    <div className="mt-3 w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                        <div className="w-[60%] h-full bg-emerald-400 rounded-full" />
                                    </div>
                                </div>
                            </div>
                            {/* Right Mini Phone */}
                            <div className="w-24 bg-[#11162d] border-2 border-gray-700 rounded-t-xl rounded-b-sm translate-y-4 shadow-xl flex flex-col items-center p-2 relative overflow-hidden">
                                <div className="w-full h-2 bg-white/10 mb-2 rounded-[2px]" />
                                <div className="w-full h-2 bg-white/10 mb-2 rounded-[2px]" />
                                <div className="w-full h-2 bg-emerald-400/20 mb-2 rounded-[2px] border border-emerald-400/30" />
                                <div className="w-full h-2 bg-white/10 mb-2 rounded-[2px]" />
                            </div>
                        </div>
                    </div>

                    {/* Patient Tracking */}
                    <div className="bg-[#1c183a]/60 backdrop-blur-md border border-purple-500/20 rounded-3xl p-6 overflow-hidden relative group hover:border-purple-500/50 transition-colors animate-fade-up opacity-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <h3 className="text-xl font-bold mb-1 text-white">Patient Tracking</h3>
                        <p className="text-sm text-purple-200/50 mb-0">Check your status from anywhere.</p>

                        {/* Angled Phone Graphic */}
                        <div className="absolute -bottom-8 -right-4 w-36 h-56 bg-[#0a0a14] rounded-[2rem] border-[4px] border-gray-800 shadow-2xl flex flex-col p-4 rotate-[-12deg] transition-transform group-hover:rotate-[-5deg]">
                            <div className="w-8 h-2 bg-gray-800 mx-auto rounded-b-md mb-4" />
                            <p className="text-4xl font-black text-center text-white mt-2">#3</p>
                            <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold mb-2">In Queue</p>
                            <p className="text-sm font-bold text-center text-white">14 mins</p>
                            <div className="mt-auto px-2 py-1.5 bg-blue-600 rounded-lg text-[10px] font-bold text-center border border-blue-400 shadow-[0_4px_10px_rgba(37,99,235,0.4)]">
                                Live Sync
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Previews Container */}
                <div className="max-w-6xl mx-auto px-6 mt-10 mb-24 animate-fade-up opacity-0 relative">

                    <h2 className="text-center font-bold text-lg text-white mb-6">Doctor & Reception Dashboards</h2>

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 sm:p-8 flex flex-col md:flex-row gap-6 lg:gap-8 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] relative overflow-hidden">

                        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-transparent pointer-events-none" />

                        {/* Doctor Dashboard */}
                        <div className="flex-1 bg-[#0b1021] rounded-2xl border border-white/10 p-5 shadow-inner relative z-10 transition-transform hover:-translate-y-1">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="font-bold text-sm text-white">Doctor Dashboard</h4>
                                <div className="flex gap-2">
                                    <span className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-white rounded text-[10px] font-bold shadow-sm cursor-pointer">Available</span>
                                    <span className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded text-[10px] font-bold cursor-pointer">Pause Queue</span>
                                </div>
                            </div>

                            <div className="mb-6 flex flex-col gap-1">
                                <div className="flex items-center justify-between bg-blue-900/20 p-3 rounded-lg border border-blue-500/20">
                                    <div className="flex items-center gap-2 text-sm text-blue-200">
                                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]" />
                                        Next Patient: <span className="font-bold text-white">David K.</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-400/10 px-2 py-1 rounded">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 12 mins
                                    </div>
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-500 font-bold mb-3 uppercase tracking-widest pl-1">In Queue ({'>'}2)</p>
                            <div className="space-y-2">
                                {["Sarah L.", "John M."].map((name, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-3 text-sm text-gray-300">
                                            <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-blue-400 text-[10px] font-bold border border-blue-500/30">
                                                #{i + 2}
                                            </div>
                                            {name}
                                        </div>
                                        <div className="flex gap-1 opacity-50"><span className="w-1.5 h-1.5 rounded-full bg-white" /><span className="w-1.5 h-1.5 rounded-full bg-white" /><span className="w-1.5 h-1.5 rounded-full bg-white" /></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Reception Panel */}
                        <div className="flex-1 bg-[#d6dfeb] text-gray-900 rounded-2xl border border-[#b2c2d4] p-5 shadow-inner relative z-10 transition-transform hover:-translate-y-1">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="font-bold text-sm">Reception Panel</h4>
                                <div className="w-20 h-2 bg-[#b2c2d4] rounded-full" />
                            </div>
                            <div className="space-y-3">
                                {[
                                    { name: "David K.", avatar: "bg-orange-200 text-orange-700" },
                                    { name: "Sarah L.", avatar: "bg-pink-200 text-pink-700" },
                                    { name: "John M.", avatar: "bg-blue-200 text-blue-700" }
                                ].map((patient, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white p-2.5 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-default">
                                        <div className="flex items-center gap-2.5 text-sm font-bold">
                                            <div className={`w-7 h-7 rounded-full ${patient.avatar} flex items-center justify-center text-[10px] font-black`}>
                                                {patient.name[0]}
                                            </div>
                                            {patient.name}
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded text-[10px] font-bold text-gray-600 transition-colors">Reorder</button>
                                            <button className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold shadow-sm shadow-emerald-500/30 transition-colors">Complete</button>
                                            <button className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-[10px] font-bold shadow-sm shadow-red-500/30 transition-colors">Cancel</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="relative z-20">
                    <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-xs sm:text-sm font-bold text-cyan-200/80 mb-12 animate-fade-up opacity-0">
                        <span className="flex items-center gap-2 bg-blue-900/30 px-3 py-1.5 rounded-full border border-blue-500/20"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Secure & Real-Time</span>
                        <span className="flex items-center gap-2 bg-blue-900/30 px-3 py-1.5 rounded-full border border-blue-500/20"><Lock className="w-4 h-4 text-blue-400" /> JWT Authentication</span>
                        <span className="flex items-center gap-2 bg-blue-900/30 px-3 py-1.5 rounded-full border border-blue-500/20"><Smartphone className="w-4 h-4 text-purple-400" /> Mobile Friendly</span>
                    </div>

                    <div className="text-center animate-fade-up opacity-0">
                        <h3 className="text-2xl sm:text-3xl font-extrabold mb-8 text-white tracking-tight">Efficient Queues. Happier Patients.</h3>
                        <Link href="/signup" className="inline-block px-10 py-4 rounded-full bg-gradient-to-b from-blue-500 to-blue-700 border border-blue-400 hover:from-blue-400 hover:to-blue-600 text-white font-bold text-lg shadow-[0_10px_30px_rgba(37,99,235,0.4)] transition-transform hover:-translate-y-1">
                            Get Started
                        </Link>
                    </div>
                </div>

            </main>
        </div>
    );
}
