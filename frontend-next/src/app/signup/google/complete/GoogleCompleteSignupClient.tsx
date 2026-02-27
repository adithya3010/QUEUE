"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/services/api";
import { MonitorSmartphone, Building2, ArrowLeft } from "lucide-react";

function decodeJwtPayload(token: string) {
    try {
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
}

export default function GoogleCompleteSignupClient() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token") || "";

    const [orgName, setOrgName] = useState("");
    const [industry, setIndustry] = useState("healthcare");
    const [prefill, setPrefill] = useState<{ name: string; email: string } | null>(null);
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const [tokenError, setTokenError] = useState(false);

    useEffect(() => {
        if (!token) {
            setTokenError(true);
            return;
        }
        const payload = decodeJwtPayload(token);
        if (!payload) {
            setTokenError(true);
            return;
        }
        if (payload.exp && Date.now() / 1000 > payload.exp) {
            setTokenError(true);
            return;
        }
        setPrefill({ name: payload.name || "", email: payload.email || "" });
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgName.trim()) return;
        setLoading(true);
        setMsg("");
        try {
            const res = await api.post("/auth/google/complete", {
                token,
                orgName: orgName.trim(),
                industry,
            });
            setMsg("Account created! Redirecting to dashboard...");
            setTimeout(() => {
                window.location.href = res.data.redirectTo || "/admin/dashboard";
            }, 600);
        } catch (err: any) {
            setMsg(err.response?.data?.message || "Something went wrong. Please try again.");
            setLoading(false);
        }
    };

    if (tokenError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-6">
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-8 max-w-md w-full text-center shadow-sm">
                    <div className="w-14 h-14 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Session Expired</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">Your Google sign-up session has expired or is invalid. Please start the sign-up process again.</p>
                    <Link href="/signup" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Sign Up
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row bg-neutral-50 dark:bg-neutral-900 overflow-hidden font-sans">
            <div className="w-full md:w-1/2 min-h-screen flex flex-col justify-center px-6 sm:px-12 lg:px-24 xl:px-32 relative z-10 pt-16 md:pt-0">
                <div className="w-full max-w-[420px] mx-auto animate-fade-up">
                    <div className="mb-10 text-center md:text-left">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg mb-6 mx-auto md:mx-0">
                            <MonitorSmartphone className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-2">One last step</h2>
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium">
                            You're signing up as <strong className="text-neutral-700 dark:text-neutral-200">{prefill?.name || "a new admin"}</strong> ({prefill?.email}). Enter your organization name to finish.
                        </p>
                    </div>

                    {msg && (
                        <div className={`mb-6 p-4 rounded-xl border text-sm font-bold text-center ${msg.includes("created") ? "bg-success-50 dark:bg-success-900/20 border-success-200 text-success-600" : "bg-danger-50 dark:bg-danger-900/20 border-danger-200 text-danger-600"}`}>
                            {msg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1 text-left">
                            <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 ml-1">Organization Name</label>
                            <div className="relative">
                                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
                                <input
                                    type="text"
                                    placeholder="e.g. City General Hospital"
                                    value={orgName}
                                    onChange={e => setOrgName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all shadow-sm"
                                    required
                                    minLength={2}
                                    maxLength={100}
                                />
                            </div>
                        </div>

                        <div className="space-y-1 text-left">
                            <label className="text-xs font-bold text-neutral-600 dark:text-neutral-400 ml-1">Industry</label>
                            <select
                                value={industry}
                                onChange={e => setIndustry(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all shadow-sm"
                                required
                            >
                                <option value="healthcare">Healthcare</option>
                                <option value="salon">Salon / Spa</option>
                                <option value="banking">Banking</option>
                                <option value="government">Govt / Public Services</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !orgName.trim()}
                            className="w-full py-4 rounded-xl font-bold text-base bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white shadow-lg transition-transform active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
                        >
                            {loading ? "Creating Account..." : "Complete Sign Up →"}
                        </button>
                    </form>

                    <div className="mt-6 text-center md:text-left">
                        <Link href="/login" className="text-sm font-semibold text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                            ← Go back to login
                        </Link>
                    </div>
                </div>
            </div>

            <div className="hidden md:flex w-1/2 bg-gradient-to-br from-brand-600 to-brand-800 dark:from-neutral-800 dark:to-neutral-950 text-white flex-col justify-center items-center p-12 relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-brand-500/20 blur-[120px] rounded-full pointer-events-none" />
                <div className="relative z-10 text-center max-w-sm">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                        <svg className="w-10 h-10" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-extrabold mb-4">Almost there!</h1>
                    <p className="text-blue-100 dark:text-neutral-400 text-base leading-relaxed">
                        Your Google account is verified. Just name your organization and SmartQueue will set up your admin dashboard instantly.
                    </p>
                </div>
            </div>
        </div>
    );
}
