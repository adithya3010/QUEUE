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
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 transition-colors duration-300 font-sans overflow-hidden relative">

            {/* Base Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-600/10 dark:bg-brand-400/20 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-info-500/10 dark:bg-info-400/20 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute top-[40%] left-[30%] w-[30%] h-[20%] bg-brand-300/10 dark:bg-brand-300/10 blur-[150px] rounded-[100%] pointer-events-none" />

            {/* Navbar */}
            <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto animate-fade-up opacity-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-brand-500 to-brand-700 dark:from-brand-400 dark:to-brand-600 flex items-center justify-center shadow-lg">
                        <MonitorSmartphone className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-neutral-900 dark:text-white">SmartQueue</span>
                </div>

                <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    <span className="hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer transition-colors flex items-center gap-1">Features <ChevronDown className="w-3 h-3" /></span>
                    <span className="hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer transition-colors flex items-center gap-1">How It Works <ChevronDown className="w-3 h-3" /></span>
                    <span className="hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer transition-colors flex items-center gap-1">Dashboard <ChevronDown className="w-3 h-3" /></span>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-sm font-bold bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white px-5 py-2 shadow-[0_4px_14px_rgba(0,0,0,0.35),0_10px_30px_rgba(37,99,235,0.4)] rounded-xl transition-all border border-brand-500 shadow-md">
                        Get Started
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 w-full pt-16 sm:pt-24 pb-20">

                {/* Hero Title */}
                <div className="max-w-5xl mx-auto text-center px-6 animate-fade-up opacity-0">

                    {/* Top Badge */}
                    <div className="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 rounded-full px-4 py-1.5 mb-7">
                        <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
                        <span className="text-xs font-bold tracking-wide text-brand-700 dark:text-brand-300 uppercase">Trusted by 50+ Hospitals</span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-neutral-900 dark:text-white leading-[1.08]">
                        No More Waiting{" "}
                        <span className="relative inline-block">
                            <span className="bg-gradient-to-r from-brand-500 via-brand-600 to-info-500 bg-clip-text text-transparent">In The Dark</span>
                            <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-gradient-to-r from-brand-500 to-info-500 rounded-full opacity-60" />
                        </span>
                    </h1>

                    <p className="text-lg sm:text-xl text-neutral-500 dark:text-neutral-300 font-medium mb-4 max-w-2xl mx-auto leading-relaxed">
                        SmartQueue turns your hospital waiting room into a frictionless, real-time experience. Patients track their place live. Doctors stay in flow. Receptionists stay in control.
                    </p>

                    <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-10">
                        Zero app download required &mdash; patients track via any browser link.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                        <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white font-bold text-base shadow-[0_4px_14px_rgba(0,0,0,0.25),0_10px_30px_rgba(37,99,235,0.35)] transition-all hover:-translate-y-1 active:scale-95">
                            Start Free &rarr;
                        </Link>
                        <Link href="/login" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold text-base border border-neutral-200 dark:border-neutral-700 shadow-sm transition-all hover:-translate-y-0.5">
                            Sign In
                        </Link>
                    </div>

                    {/* Social Proof & Stats Row */}
                    <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm">
                        <div className="flex flex-col items-center">
                            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">50+</span>
                            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">Hospitals Onboarded</span>
                        </div>
                        <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700 hidden sm:block" />
                        <div className="flex flex-col items-center">
                            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">3 min</span>
                            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">Avg. Setup Time</span>
                        </div>
                        <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700 hidden sm:block" />
                        <div className="flex flex-col items-center">
                            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">40%</span>
                            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">Fewer No-Shows</span>
                        </div>
                        <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700 hidden sm:block" />
                        <div className="flex flex-col items-center">
                            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white">Live</span>
                            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">Real-Time Queue Sync</span>
                        </div>
                    </div>
                </div>


                {/* Hero Massive Visual Stage */}
                <div className="relative mt-24 mb-32 h-[500px] w-full max-w-7xl mx-auto overflow-visible px-4 animate-scale-in opacity-0">

                    {/* Glowing Horizon Line */}
                    <div className="absolute inset-0 flex items-center justify-center bottom-20">
                        <div className="w-[120%] h-[1px] bg-gradient-to-r from-transparent via-brand-500/30 dark:via-brand-400/50 to-transparent" />
                        <div className="absolute w-[80%] h-[300px] bg-brand-500/5 dark:bg-brand-500/10 blur-[100px] rounded-[100%] pointer-events-none" />
                    </div>

                    {/* Central Area: Add Patient & Trusted By */}
                    <div className="absolute left-[5%] top-[5%] md:left-[10%] md:top-[15%] w-[80%] md:w-[60%] h-[280px] bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-700 rounded-3xl p-6 shadow-xl flex md:flex-row flex-col gap-8 z-20">

                        {/* Add Patient Mockup */}
                        <div className="w-[240px] bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 shadow-sm">
                            <h3 className="font-bold text-sm mb-4 text-neutral-900 dark:text-white">Get Started</h3>
                            <div className="space-y-3">
                                <div className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest pl-1">Add Patient</div>
                                <div className="w-full h-8 bg-white dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 px-3 flex items-center text-xs text-neutral-400 dark:text-neutral-500">Name</div>
                                <div className="w-full h-8 bg-white dark:bg-neutral-800 rounded border border-neutral-200 dark:border-neutral-700 px-3 flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500">
                                    Reason <ChevronDown className="w-3 h-3 text-neutral-400" />
                                </div>
                                <button className="w-2/3 py-2 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 rounded-lg text-white text-xs font-bold mt-2 shadow-[0_5px_15px_rgba(59,130,246,0.4)] transition-colors">
                                    Add to Queue
                                </button>
                            </div>
                        </div>

                        {/* Trusted By & Illustrations */}
                        <div className="flex-1 flex flex-col justify-end pb-4 hidden md:flex">
                            <div className="mb-auto">
                                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-3 ml-2">Trusted by Leading Hospitals</p>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700"><div className="w-4 h-4 bg-danger-500 rounded-sm rotate-45" /><span className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300">MediCare</span></div>
                                    <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700"><Activity className="w-4 h-4 text-info-500 dark:text-info-400" /><span className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300">Nexa Health</span></div>
                                    <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700"><Shield className="w-4 h-4 text-success-500 dark:text-success-400" /><span className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300">St.Anthony's</span></div>
                                </div>
                            </div>

                            {/* Abstract Illustration representation */}
                            <div className="flex items-end gap-3 opacity-60">
                                <div className="w-8 h-24 bg-gradient-to-t from-brand-500/20 to-transparent rounded-t-full relative">
                                    <div className="w-5 h-5 bg-brand-500 dark:bg-brand-400 rounded-full absolute -top-5 left-1.5" />
                                </div>
                                <div className="w-32 h-1 bg-neutral-300 dark:bg-neutral-600 mb-2" />
                                <div className="w-12 h-16 bg-gradient-to-t from-info-500/20 to-transparent rounded-t-full relative">
                                    <div className="w-5 h-5 bg-info-500 dark:bg-info-400 rounded-full absolute -top-5 left-3.5" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Floating Phone Mockup */}
                    <div className="absolute z-30 right-[5%] md:right-[15%] -top-10 w-[260px] h-[520px] bg-white dark:bg-[#11162d] border-[6px] border-neutral-800 dark:border-neutral-900 rounded-[2.5rem] shadow-xl flex flex-col py-6 px-4 hidden sm:flex hover:-translate-y-4 transition-transform duration-500">
                        {/* Dynamic Island / Notch */}
                        <div className="w-20 h-5 bg-neutral-800 dark:bg-neutral-900 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-[10px]" />

                        {/* Status Bar */}
                        <div className="w-full flex justify-between text-[10px] text-neutral-600 dark:text-neutral-400 font-bold mb-6 px-2">
                            <span>9:41</span>
                            <div className="flex gap-1.5"><Wifi className="w-3 h-3" /><Battery className="w-3 h-3" /></div>
                        </div>

                        {/* Content */}
                        <h2 className="text-neutral-900 dark:text-white text-center font-bold text-lg mb-6">Your Status</h2>
                        <div className="w-full bg-neutral-50 dark:bg-[#1e2442] rounded-2xl p-4 border border-neutral-200 dark:border-neutral-700 text-center shadow-inner flex-1">
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">Dr. Smith's Clinic</p>
                            <div className="w-full h-[1px] bg-neutral-200 dark:bg-neutral-700/50 my-4" />
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">Current Position: <span className="text-neutral-900 dark:text-white font-extrabold text-xl">#3</span></p>
                            <div className="w-full h-[1px] bg-neutral-200 dark:bg-neutral-700/50 my-4" />
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">Estimated Wait <span className="text-neutral-900 dark:text-white font-extrabold text-xl">14 mins</span></p>
                            <div className="w-full h-[1px] bg-neutral-200 dark:bg-neutral-700/50 my-4" />
                            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-200/50 dark:bg-black/20 py-2 rounded-lg">Please be ready.</p>
                        </div>

                        {/* Footer Indicator */}
                        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/20 py-1.5 rounded-full mx-8 border border-success-200 dark:border-success-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-success-500 dark:bg-success-400 animate-pulse" /> Updated Just Now
                        </div>
                    </div>
                </div>

                {/* Triple Feature Cards */}
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-6 relative z-30 mb-20">

                    {/* Live Queue Updates */}
                    <div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-700 rounded-3xl p-6 overflow-hidden relative group transition-colors animate-fade-up opacity-0 shadow-lg">
                        <div className="absolute inset-0 bg-brand-50/50 dark:bg-brand-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <h3 className="text-xl font-bold mb-1 text-neutral-900 dark:text-white relative z-10">Live Queue Updates</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8 relative z-10">Real-time sync across all devices.</p>

                        <div className="w-full h-32 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 flex flex-col gap-3 relative shadow-inner">
                            <div className="w-full flex gap-3">
                                <div className="h-4 w-1/3 bg-brand-200 dark:bg-brand-900/50 rounded-md border border-brand-300 dark:border-brand-800" />
                                <div className="h-4 w-1/4 bg-neutral-200 dark:bg-neutral-800 rounded-md" />
                            </div>
                            <div className="w-full flex-1 flex gap-3">
                                <div className="w-1/3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 relative overflow-hidden hidden sm:block">
                                    <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                                    <div className="absolute top-8 left-2 right-2 h-1 bg-neutral-200 dark:bg-neutral-700 rounded" />
                                </div>
                                <div className="w-full sm:w-2/3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 flex flex-col gap-2 p-3">
                                    <div className="w-full h-3 bg-neutral-200 dark:bg-neutral-700 rounded-md" />
                                    <div className="w-4/5 h-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-md" />
                                    <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-md" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ETA Calculation */}
                    <div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-700 rounded-3xl p-6 overflow-hidden relative group transition-colors animate-fade-up opacity-0 shadow-lg">
                        <div className="absolute inset-0 bg-info-50/50 dark:bg-info-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <h3 className="text-xl font-bold mb-1 text-neutral-900 dark:text-white relative z-10">ETA Calculation</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8 relative z-10">Accurate wait times using smart algorithms.</p>

                        <div className="w-full h-32 flex justify-between gap-4 mt-auto">
                            <div className="flex-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 flex items-center justify-between">
                                <div className="w-full">
                                    <p className="text-[10px] text-success-600 dark:text-success-400 font-bold tracking-wider mb-2 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-success-500 dark:bg-success-400 animate-pulse" /> Tracking Active
                                    </p>
                                    <p className="text-2xl font-black text-neutral-900 dark:text-white">14 <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">mins</span></p>
                                    <div className="mt-3 w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                                        <div className="w-[60%] h-full bg-success-500 dark:bg-success-400 rounded-full" />
                                    </div>
                                </div>
                            </div>
                            <div className="w-24 bg-white dark:bg-[#11162d] border-[3px] border-neutral-300 dark:border-gray-700 rounded-t-xl rounded-b-sm translate-y-4 shadow-xl flex flex-col items-center p-2 relative overflow-hidden">
                                <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 mb-2 rounded-[2px]" />
                                <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 mb-2 rounded-[2px]" />
                                <div className="w-full h-2 bg-success-100 dark:bg-success-900/30 mb-2 rounded-[2px] border border-success-300 dark:border-success-500/30" />
                            </div>
                        </div>
                    </div>

                    {/* Patient Tracking */}
                    <div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-700 rounded-3xl p-6 overflow-hidden relative group transition-colors animate-fade-up opacity-0 shadow-lg">
                        <div className="absolute inset-0 bg-brand-50/50 dark:bg-brand-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <h3 className="text-xl font-bold mb-1 text-neutral-900 dark:text-white relative z-10">Patient Tracking</h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-0 relative z-10">Check your status from anywhere.</p>

                        <div className="absolute -bottom-8 -right-4 w-36 h-56 bg-white dark:bg-[#0a0a14] rounded-[2rem] border-[4px] border-neutral-200 dark:border-gray-800 shadow-xl flex flex-col p-4 rotate-[-12deg] transition-transform group-hover:rotate-[-5deg]">
                            <div className="w-8 h-2 bg-neutral-200 dark:bg-gray-800 mx-auto rounded-b-md mb-4" />
                            <p className="text-4xl font-black text-center text-neutral-900 dark:text-white mt-2">#3</p>
                            <p className="text-[10px] text-neutral-500 dark:text-gray-400 text-center uppercase tracking-widest font-bold mb-2">In Queue</p>
                            <p className="text-sm font-bold text-center text-neutral-900 dark:text-white">14 mins</p>
                            <div className="mt-auto px-2 py-1.5 bg-brand-600 dark:bg-brand-500 rounded-lg text-white text-[10px] font-bold text-center shadow-md">
                                Live Sync
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Previews Container */}
                <div className="max-w-6xl mx-auto px-6 mt-10 mb-24 animate-fade-up opacity-0 relative">

                    <h2 className="text-center font-bold text-lg text-neutral-900 dark:text-white mb-6">Doctor & Reception Dashboards</h2>

                    <div className="bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-neutral-200 dark:border-neutral-700 rounded-[2rem] p-6 sm:p-8 flex flex-col md:flex-row gap-6 lg:gap-8 shadow-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-100/50 dark:from-brand-900/10 to-transparent pointer-events-none" />

                        {/* Doctor Dashboard */}
                        <div className="flex-1 bg-white dark:bg-[#0b1021] rounded-2xl border border-neutral-200 dark:border-white/10 p-5 shadow-sm relative z-10 transition-transform hover:-translate-y-1">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="font-bold text-sm text-neutral-900 dark:text-white">Doctor Dashboard</h4>
                                <div className="flex gap-2">
                                    <span className="px-2 py-1 bg-success-500 hover:bg-success-600 text-white rounded text-[10px] font-bold cursor-pointer">Available</span>
                                    <span className="px-2 py-1 bg-danger-50 dark:bg-danger-900/20 hover:bg-danger-100 dark:hover:bg-danger-900/30 text-danger-600 dark:text-danger-400 border border-danger-200 dark:border-danger-500/30 rounded text-[10px] font-bold cursor-pointer">Pause Queue</span>
                                </div>
                            </div>

                            <div className="mb-6 flex flex-col gap-1">
                                <div className="flex items-center justify-between bg-brand-50 dark:bg-brand-900/20 p-3 rounded-lg border border-brand-200 dark:border-brand-500/20">
                                    <div className="flex items-center gap-2 text-sm text-brand-700 dark:text-brand-200">
                                        <span className="w-2 h-2 rounded-full bg-brand-600 dark:bg-brand-500" />
                                        Next Patient: <span className="font-bold text-neutral-900 dark:text-white">David K.</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-success-600 dark:text-success-400 font-bold bg-success-100 dark:bg-success-400/10 px-2 py-1 rounded">
                                        <span className="w-1.5 h-1.5 rounded-full bg-success-500 dark:bg-success-400 animate-pulse" /> 12 mins
                                    </div>
                                </div>
                            </div>

                            <p className="text-[10px] text-neutral-500 dark:text-gray-500 font-bold mb-3 uppercase tracking-widest pl-1">In Queue ({'>'}2)</p>
                            <div className="space-y-2">
                                {["Sarah L.", "John M."].map((name, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-gray-300">
                                            <div className="w-6 h-6 rounded bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-700 dark:text-brand-400 text-[10px] font-bold border border-brand-200 dark:border-brand-500/30">
                                                #{i + 2}
                                            </div>
                                            {name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Reception Panel */}
                        <div className="flex-1 bg-neutral-100 dark:bg-[#d6dfeb] text-neutral-900 rounded-2xl border border-neutral-200 dark:border-[#b2c2d4] p-5 shadow-sm relative z-10 transition-transform hover:-translate-y-1">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="font-bold text-sm">Reception Panel</h4>
                                <div className="w-20 h-2 bg-neutral-300 dark:bg-[#b2c2d4] rounded-full" />
                            </div>
                            <div className="space-y-3">
                                {[
                                    { name: "David K.", avatar: "bg-orange-200 text-orange-700" },
                                    { name: "Sarah L.", avatar: "bg-pink-200 text-pink-700" },
                                    { name: "John M.", avatar: "bg-blue-200 text-blue-700" }
                                ].map((patient, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white p-2.5 rounded-lg shadow-sm border border-neutral-200 dark:border-gray-100 hover:shadow-md transition-shadow cursor-default">
                                        <div className="flex items-center gap-2.5 text-sm font-bold">
                                            <div className={`w-7 h-7 rounded-full ${patient.avatar} flex items-center justify-center text-[10px] font-black`}>
                                                {patient.name[0]}
                                            </div>
                                            {patient.name}
                                        </div>
                                        <div className="flex gap-1.5 hidden lg:flex">
                                            <button className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded text-[10px] font-bold text-neutral-600 transition-colors">Reorder</button>
                                            <button className="px-2.5 py-1 bg-success-500 hover:bg-success-600 text-white rounded text-[10px] font-bold shadow-sm transition-colors">Complete</button>
                                            <button className="px-2.5 py-1 bg-danger-500 hover:bg-danger-600 text-white rounded text-[10px] font-bold shadow-sm transition-colors">Cancel</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="relative z-20">
                    <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-xs sm:text-sm font-bold text-neutral-600 dark:text-info-200/80 mb-12 animate-fade-up opacity-0">
                        <span className="flex items-center gap-2 bg-white dark:bg-brand-900/30 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-brand-500/20"><CheckCircle2 className="w-4 h-4 text-success-500 dark:text-success-400" /> Secure & Real-Time</span>
                        <span className="flex items-center gap-2 bg-white dark:bg-brand-900/30 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-brand-500/20"><Lock className="w-4 h-4 text-brand-600 dark:text-brand-400" /> JWT Authentication</span>
                        <span className="flex items-center gap-2 bg-white dark:bg-brand-900/30 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-brand-500/20"><Smartphone className="w-4 h-4 text-brand-500 dark:text-brand-400" /> Mobile Friendly</span>
                    </div>

                    <div className="text-center animate-fade-up opacity-0">
                        <h3 className="text-2xl sm:text-3xl font-extrabold mb-8 text-neutral-900 dark:text-white tracking-tight">Efficient Queues. Happier Patients.</h3>
                        <Link href="/signup" className="inline-block px-10 py-4 rounded-full bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white font-bold text-lg shadow-[0_4px_14px_rgba(0,0,0,0.35),0_10px_30px_rgba(37,99,235,0.4)] border border-brand-500 transition-transform hover:-translate-y-1">
                            Get Started
                        </Link>
                    </div>
                </div>

            </main>
        </div>
    );
}
