"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/services/api";
import { MonitorSmartphone, ArrowLeft } from "lucide-react";

export default function Signup() {
    const router = useRouter();
    const [form, setForm] = useState({
        name: "",
        hospitalName: "",
        email: "",
        password: ""
    });

    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) =>
        setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg("");
        try {
            await api.post("/auth/signup", form);
            setMsg("Signup Successful 🎉 Redirecting...");
            setTimeout(() => router.push("/login"), 1000);
        } catch (err) {
            setMsg(err.response?.data?.message || "Signup failed");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex justify-center items-center p-6 relative bg-[#060c21] text-white overflow-hidden selection:bg-primary-500/30">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-600/20 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/20 blur-[150px] rounded-full pointer-events-none" />

            {/* Back to Home */}
            <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors opacity-80 hover:opacity-100 z-50">
                <ArrowLeft className="w-5 h-5" />
                <span className="font-semibold text-sm">Back to Home</span>
            </Link>

            <div className="relative w-full max-w-[420px] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] rounded-3xl p-8 sm:p-10 animate-fade-up my-8">

                {/* Logo & Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-light-blue-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30 mb-4">
                        <MonitorSmartphone className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        Clinic Registration
                    </h2>
                    <p className="text-sm font-medium text-gray-400 mt-2 text-center">
                        Create your hospital admin account.
                    </p>
                </div>

                {msg && (
                    <div className={`mb-6 p-4 rounded-xl border text-sm font-bold text-center backdrop-blur-sm shadow-inner transition-all ${msg.includes('Successful') ? 'bg-success-500/10 border-success-500/30 text-success-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                        {msg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        name="name"
                        placeholder="Full Name"
                        value={form.name}
                        onChange={handleChange}
                        className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all shadow-inner"
                        required
                    />

                    <input
                        name="hospitalName"
                        placeholder="Clinic / Hospital Name"
                        value={form.hospitalName}
                        onChange={handleChange}
                        className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all shadow-inner"
                        required
                    />

                    <input
                        name="email"
                        type="email"
                        placeholder="Email Address"
                        value={form.email}
                        onChange={handleChange}
                        className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all shadow-inner"
                        required
                    />

                    <input
                        name="password"
                        type="password"
                        placeholder="Password"
                        value={form.password}
                        onChange={handleChange}
                        className="w-full p-4 rounded-xl bg-black/30 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 outline-none transition-all shadow-inner"
                        required
                        minLength={8}
                    />

                    <button
                        disabled={loading}
                        className="w-full py-4 mt-2 rounded-xl font-bold text-lg bg-gradient-to-b from-primary-500 to-primary-700 hover:from-primary-400 hover:to-primary-600 border border-primary-400/50 text-white shadow-[0_10px_30px_rgba(37,99,235,0.4)] transition-transform active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                    >
                        {loading ? "Creating Account..." : "Create Account"}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <p className="text-sm font-medium text-gray-400">
                        Already have an account?{" "}
                        <Link className="text-primary-400 hover:text-white font-bold transition-colors" href="/login">
                            Log in here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
