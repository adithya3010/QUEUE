"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/services/api";
import { Terminal, Shield, ArrowRight, Activity, Code, Server } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function AdminLogin() {
    const router = useRouter();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await api.post("/admin/auth/login", formData);
            localStorage.setItem("adminId", res.data.admin.id);
            localStorage.setItem("adminName", res.data.admin.name);
            localStorage.setItem("hospitalId", res.data.admin.hospitalId);
            router.push("/developer");
        } catch (err: any) {
            setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0c0516] via-[#1a0b2e] to-[#0c0516] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20"></div>

            <div className="absolute top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-5xl flex gap-12 items-center relative z-10">

                {/* Left Side - Value Prop */}
                <div className="hidden lg:flex flex-col flex-1 pl-8">
                    <div className="inline-flex items-center space-x-2 bg-fuchsia-500/10 rounded-full px-4 py-1.5 mb-8 w-max border border-fuchsia-500/20">
                        <Terminal className="w-4 h-4 text-fuchsia-400" />
                        <span className="text-sm font-semibold text-fuchsia-300">Smart Queue QaaS Platform</span>
                    </div>

                    <h1 className="text-5xl font-black text-white mb-6 leading-tight">
                        Power Your Clinic's <br />
                        <span className="bg-gradient-to-r from-fuchsia-400 to-pink-500 bg-clip-text text-transparent">Digital Infrastructure</span>
                    </h1>

                    <p className="text-xl text-gray-400 mb-10 leading-relaxed font-light">
                        Welcome back to the Admin workspace. Manage your B2B API access, Webhooks, and hospital endpoints.
                    </p>

                    <div className="space-y-6">
                        <Feature icon={<Shield />} title="Secure API Gateway" desc="Generate and revoke keys instantly with SHA-256 hashing." />
                        <Feature icon={<Activity />} title="Real-time Webhooks" desc="Listen to queue and doctor state changes securely." />
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="w-full max-w-md flex-shrink-0 animate-fadeInUp">
                    <div className="bg-[#110c21]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">

                        {/* Glowing orb behind form */}
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-fuchsia-500/20 blur-[80px] rounded-full pointer-events-none" />

                        <div className="text-center mb-8 relative z-10">
                            <h2 className="text-2xl font-bold text-white mb-2">Admin Login</h2>
                            <p className="text-sm text-gray-400 font-medium">Access your Hospital Admin environment</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-400 text-sm font-bold text-center animate-shake">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Work Email</label>
                                <input required type="email" name="email" value={formData.email} onChange={handleChange}
                                    className="w-full px-4 py-3.5 rounded-xl bg-black/30 border border-white/10 focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500 outline-none text-white transition-all font-medium"
                                    placeholder="admin@stjude.com" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                                <input required type="password" name="password" value={formData.password} onChange={handleChange}
                                    className="w-full px-4 py-3.5 rounded-xl bg-black/30 border border-white/10 focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500 outline-none text-white transition-all font-medium"
                                    placeholder="••••••••" />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 mt-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 text-white font-bold text-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(217,70,239,0.3)] disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {loading ? "Authenticating..." : "Access Workspace"} <ArrowRight className="w-5 h-5" />
                            </button>
                        </form>

                        <div className="mt-8 text-center relative z-10">
                            <p className="text-gray-400 text-sm">
                                Don't have a workspace?{" "}
                                <Link href="/developer/signup" className="text-fuchsia-400 font-bold hover:text-fuchsia-300">
                                    Create one
                                </Link>
                            </p>
                            <p className="text-gray-500 text-xs mt-4">
                                Looking to manage patients?{" "}
                                <Link href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                                    Doctor Login
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function Feature({ icon, title, desc }) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors group">
            <div className="p-3 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 group-hover:bg-fuchsia-500/20 group-hover:scale-110 transition-all">
                {icon}
            </div>
            <div>
                <h3 className="text-white font-bold mb-1">{title}</h3>
                <p className="text-gray-400 text-sm">{desc}</p>
            </div>
        </div>
    );
}
