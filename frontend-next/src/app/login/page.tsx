"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/services/api";
import { MonitorSmartphone, ArrowLeft } from "lucide-react";

export default function StaffLogin() {
    const router = useRouter();
    const [form, setForm] = useState({ email: "", password: "" });
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg("");
        try {
            const res = await api.post("/auth/login", form);
            const { id, role } = res.data.user;
            localStorage.setItem("doctorId", id);
            localStorage.setItem("role", role);

            setMsg("Login Successful 🎉 Redirecting...");
            setTimeout(() => {
                if (role === "DOCTOR") {
                    router.push("/doctor");
                } else if (role === "RECEPTIONIST") {
                    router.push("/reception");
                } else if (role === "HOSPITAL_ADMIN") {
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
        <div className="min-h-screen flex justify-center items-center p-6 relative bg-[#060c21] text-white overflow-hidden selection:bg-blue-500/30">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/20 blur-[150px] rounded-full pointer-events-none" />

            {/* Back to Home */}
            <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors opacity-80 hover:opacity-100 z-50">
                <ArrowLeft className="w-5 h-5" />
                <span className="font-semibold text-sm">Back to Home</span>
            </Link>

            <div className="relative w-full max-w-[420px] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl p-8 sm:p-10 animate-fade-up">

                {/* Logo & Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
                    </div>
                    <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        Staff Login
                    </h2>
                    <p className="text-sm font-medium text-gray-400 mt-2 text-center">
                        Access your clinical dashboard.
                    </p>
                </div>

                {msg && (
                    <div className={`mb-6 p-4 rounded-xl border text-sm font-bold text-center backdrop-blur-sm shadow-inner transition-all ${msg.includes('Successful') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                        {msg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <input
                            name="email"
                            type="email"
                            placeholder="Email Address"
                            value={form.email}
                            onChange={handleChange}
                            className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all shadow-inner"
                            required
                            pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
                            title="Enter a valid email"
                        />
                    </div>

                    <div>
                        <input
                            name="password"
                            type="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 outline-none transition-all shadow-inner"
                            required
                        />
                    </div>

                    <button
                        disabled={loading}
                        className="w-full py-4 mt-2 rounded-xl font-bold text-lg bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 border border-blue-400/50 text-white shadow-[0_10px_30px_rgba(37,99,235,0.4)] transition-transform active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                    >
                        {loading ? "Authenticating..." : "Sign In"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link
                        href="/forgot-password"
                        className="text-sm font-semibold text-gray-400 hover:text-cyan-400 transition-colors"
                    >
                        Forgot Password?
                    </Link>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <p className="text-sm font-medium text-gray-400">
                        Don’t have a clinical account?{" "}
                        <Link className="text-blue-400 hover:text-white font-bold transition-colors" href="/signup">
                            Sign up here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
