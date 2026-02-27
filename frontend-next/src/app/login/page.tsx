"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/services/api";
import { ArrowLeft, MonitorSmartphone, Activity, Shield, Users } from "lucide-react";

export default function StaffLogin() {
    const router = useRouter();
    const [form, setForm] = useState({ email: "", password: "" });
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    // Show error from Google OAuth redirect
    React.useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const error = params.get("error");
            if (error === "not_registered") setMsg("Your Google account is not registered. Agents and Operators must use their admin-registered email.");
            if (error === "oauth_error") setMsg("Google sign-in failed. Please try again.");
        }
    }, []);

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg("");
        try {
            const res = await api.post("/auth/login", form);
            const { id, role } = res.data.user;
            localStorage.setItem("userId", id);
            localStorage.setItem("role", role);

            setMsg("Login Successful 🎉 Redirecting...");
            setTimeout(() => {
                if (role === "AGENT" || role === "DOCTOR") {
                    router.push("/agent");
                } else if (role === "OPERATOR" || role === "RECEPTIONIST") {
                    router.push("/operator");
                } else if (role === "ORG_ADMIN" || role === "HOSPITAL_ADMIN") {
                    router.push("/admin/dashboard");
                } else {
                    router.push("/");
                }
            }, 800);
        } catch (err: any) {
            setMsg(err.response?.data?.message || "Login failed");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row bg-neutral-50 dark:bg-neutral-900 overflow-hidden font-sans transition-colors duration-300">
            {/* Back to Home - Mobile Only */}
            <Link href="/" className="md:hidden absolute top-6 flex items-center gap-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors z-50 left-6 text-sm font-semibold">
                <ArrowLeft className="w-4 h-4" /> Home
            </Link>

            {/* LEFT SIDE: AUTH FORM */}
            <div className="w-full md:w-1/2 min-h-screen flex flex-col justify-center px-6 sm:px-12 lg:px-24 xl:px-32 relative z-10 pt-16 md:pt-0">
                <div className="w-full max-w-[420px] mx-auto animate-fade-up">

                    {/* Logo & Header */}
                    <div className="mb-10 text-center md:text-left">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 dark:from-brand-400 dark:to-brand-600 flex items-center justify-center shadow-lg mb-6 mx-auto md:mx-0">
                            <MonitorSmartphone className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-2">
                            Welcome Back
                        </h2>
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium">
                            Log in to your work dashboard.
                        </p>
                    </div>

                    {msg && (
                        <div className={`mb-6 p-4 rounded-xl border text-sm font-bold text-center transition-all ${msg.includes('Successful') ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-500/30 text-success-600 dark:text-success-400' : 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-500/30 text-danger-600 dark:text-danger-400'}`}>
                            {msg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1 text-left">
                            <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 ml-1">Email Address</label>
                            <input
                                name="email"
                                type="email"
                                placeholder="you@organization.com"
                                value={form.email}
                                onChange={handleChange}
                                className="w-full p-3.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all shadow-sm"
                                required
                                pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
                                title="Enter a valid email"
                            />
                        </div>

                        <div className="space-y-1 text-left">
                            <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 ml-1">Password</label>
                            <input
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handleChange}
                                className="w-full p-3.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all shadow-sm"
                                required
                            />
                        </div>

                        <button
                            disabled={loading}
                            className="w-full py-4 mt-4 rounded-xl font-bold text-base bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white shadow-lg transition-transform active:scale-95 disabled:opacity-70 disabled:pointer-events-none border border-brand-500/50"
                        >
                            {loading ? "Authenticating..." : "Sign In"}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                        <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500">OR</span>
                        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                    </div>

                    {/* Google Sign In */}
                    <a
                        href={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000'}/api/auth/google`}
                        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-200 font-semibold text-sm transition-all shadow-sm active:scale-95"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </a>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center mt-2">Agents &amp; Operators can sign in with their registered Google email</p>

                    <div className="mt-6 text-center md:text-left">
                        <Link
                            href="/forgot-password"
                            className="text-sm font-semibold text-neutral-500 hover:text-brand-600 dark:text-neutral-400 dark:hover:text-brand-400 transition-colors"
                        >
                            Forgot Password?
                        </Link>
                    </div>

                    <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 text-center md:text-left">
                        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                            Don't have an account?{" "}
                            <Link className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-bold transition-colors" href="/signup">
                                Sign up here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: PRODUCT SHOWCASE */}
            <div className="hidden md:flex w-1/2 bg-gradient-to-br from-brand-600 to-brand-800 dark:from-neutral-800 dark:to-neutral-950 text-white flex-col justify-between p-12 lg:p-20 relative overflow-hidden border-l border-neutral-200 dark:border-neutral-800">

                {/* Abstract Background Elements */}
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-brand-500/20 dark:bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none" />

                {/* Back Link */}
                <div className="relative z-10">
                    <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-semibold bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                        <ArrowLeft className="w-4 h-4" /> Back to SmartQueue
                    </Link>
                </div>

                {/* Large Marketing Copy */}
                <div className="relative z-10 max-w-lg mt-auto mb-auto">
                    <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight mb-6">
                        Streamline your organization's queue flow.
                    </h1>
                    <p className="text-blue-100 dark:text-neutral-300 text-lg mb-10 leading-relaxed font-medium">
                        SmartQueue provides a unified dashboard for agents, operators, and admins to manage wait times, track client statuses, and improve overall service efficiency.
                    </p>

                    {/* Feature list */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-4 bg-black/10 dark:bg-black/20 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-info-300">
                                <Activity strokeWidth={2.5} className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">Real-time Sync</h4>
                                <p className="text-xs text-brand-100/70 dark:text-neutral-400 font-medium">Instant updates across all reception desks</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-black/10 dark:bg-black/20 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-success-300">
                                <Users strokeWidth={2.5} className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">Queue Predictions</h4>
                                <p className="text-xs text-brand-100/70 dark:text-neutral-400 font-medium">Smart AI algorithms calculate precise ETA</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-black/10 dark:bg-black/20 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-warning-300">
                                <Shield strokeWidth={2.5} className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-sm">Role-Based Access</h4>
                                <p className="text-xs text-brand-100/70 dark:text-neutral-400 font-medium">Secure dashboards for Agents &amp; Admins</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Copyright */}
                <div className="relative z-10 text-xs text-white/50 font-medium mt-12 pb-4">
                    © 2026 SmartQueue Platform. All rights reserved.
                </div>
            </div>
        </div>
    );
}
