"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { Key, Plus, Trash2, Copy, CheckCircle2, RefreshCw, ShieldCheck, Terminal, AlertCircle, Activity } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function DeveloperPortal() {
    const [keys, setKeys] = useState([]);
    const [webhooks, setWebhooks] = useState([]);
    const [newKey, setNewKey] = useState("");
    const [keyName, setKeyName] = useState("");
    const [webhookUrl, setWebhookUrl] = useState("");
    const [msg, setMsg] = useState({ text: "", type: "success" });
    const [copied, setCopied] = useState(false);
    const [usage, setUsage] = useState({ used: 0, limit: 1000, plan: "Basic" });

    const loadData = async () => {
        try {
            const [keysRes, hooksRes, usageRes] = await Promise.all([
                api.get("/hospitals/keys"),
                api.get("/hospitals/webhooks"),
                api.get("/hospitals/usage")
            ]);
            setKeys(keysRes.data.data);
            setWebhooks(hooksRes.data.data);
            if (usageRes.data.success) {
                setUsage(usageRes.data.data);
            }
        } catch (err) {
            console.error("Failed to load developer data", err);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const showMsg = (text: string, type = "success") => {
        setMsg({ text, type });
        setTimeout(() => setMsg({ text: "", type: "success" }), 3000);
    };

    const generateKey = async () => {
        if (!keyName) return showMsg("Please enter a key name", "error");
        try {
            const res = await api.post("/hospitals/keys", { name: keyName, isLive: true });
            setNewKey(res.data.key);
            setKeyName("");
            loadData();
            showMsg("API Key generated successfully");
        } catch (err) {
            showMsg("Failed to generate key", "error");
        }
    };

    const revokeKey = async (id: string) => {
        try {
            await api.delete(`/hospitals/keys/${id}`);
            loadData();
            showMsg("API Key revoked", "success");
        } catch (err) {
            showMsg("Failed to revoke key", "error");
        }
    };

    const addWebhook = async () => {
        if (!webhookUrl) return showMsg("Please enter a webhook URL", "error");
        try {
            await api.post("/hospitals/webhooks", {
                url: webhookUrl,
                events: ["queue.created", "queue.updated", "queue.completed", "doctor.status_changed"]
            });
            setWebhookUrl("");
            loadData();
            showMsg("Webhook endpoint added successfully");
        } catch (err) {
            showMsg("Failed to add webhook", "error");
        }
    };

    const deleteWebhook = async (id: string) => {
        try {
            await api.delete(`/hospitals/webhooks/${id}`);
            loadData();
            showMsg("Webhook endpoint removed");
        } catch (err) {
            showMsg("Failed to remove webhook", "error");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="w-full max-w-6xl mx-auto px-6 pb-20 pt-8 animate-fadeIn">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-cyan-400 dark:to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Terminal className="w-8 h-8 text-cyan-500" /> Developer Portal
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Manage your B2B API Keys and Webhook subscriptions</p>
                </div>
                <div className="flex gap-4 items-center">
                    <a href="/docs" target="_blank" className="text-sm font-bold text-blue-600 dark:text-cyan-400 hover:underline">View API Docs ↗</a>
                    <ThemeToggle />
                </div>
            </div>

            {msg.text && (
                <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 animate-fadeIn font-semibold ${msg.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-200 dark:border-emerald-900/30'}`}>
                    {msg.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />} {msg.text}
                </div>
            )}

            {/* Usage Section */}
            <div className="mb-8 border border-black/5 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/5 blur-[50px] rounded-full pointer-events-none" />
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Activity className="w-6 h-6 text-emerald-500" /> API Usage
                        <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full font-mono uppercase tracking-widest">{usage.plan} Plan</span>
                    </h3>
                </div>

                <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between text-sm">
                        <div className="font-semibold text-gray-700 dark:text-gray-300">
                            {usage.used.toLocaleString()} Requests Used
                        </div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            {usage.limit === null ? "Unlimited" : `${usage.limit.toLocaleString()} Quota`}
                        </div>
                    </div>
                    {usage.limit !== null && (
                        <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                            <div style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${usage.used >= usage.limit ? 'bg-red-500' : 'bg-emerald-500'} transition-all duration-1000`}></div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">

                {/* API Keys Section */}
                <div className="space-y-6">
                    <div className="border border-black/5 dark:border-white/10 bg-white/80 dark:bg-[#0b1021] backdrop-blur-xl rounded-3xl p-8 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 dark:bg-cyan-500/5 blur-[50px] rounded-full pointer-events-none" />

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                            <Key className="w-6 h-6 text-cyan-500" /> API Keys
                        </h3>

                        {newKey && (
                            <div className="mb-8 p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-500/30 rounded-2xl animate-fadeIn">
                                <h4 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2 mb-2"><ShieldCheck className="w-5 h-5" /> Save this key now!</h4>
                                <p className="text-sm text-red-600 dark:text-red-300 mb-4">This key will only be displayed once. If you lose it, you will need to generate a new one.</p>
                                <div className="flex items-center gap-2 bg-white dark:bg-black/50 p-3 rounded-lg border border-red-200 dark:border-red-500/20">
                                    <code className="flex-1 font-mono text-sm text-gray-900 dark:text-gray-200 break-all">{newKey}</code>
                                    <button onClick={() => copyToClipboard(newKey)} className="p-2 text-gray-500 hover:text-cyan-500 transition-colors">
                                        {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 mb-8">
                            <input
                                value={keyName}
                                onChange={(e) => setKeyName(e.target.value)}
                                placeholder="e.g. Production Key"
                                className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-cyan-500 outline-none text-gray-900 dark:text-white"
                            />
                            <button
                                onClick={generateKey}
                                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-cyan-500/20"
                            >
                                <Plus className="w-5 h-5" /> Create
                            </button>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Active Keys</h4>
                            {keys.length === 0 ? (
                                <p className="text-sm text-gray-400">No active API keys found.</p>
                            ) : (
                                keys.map((k: any) => (
                                    <div key={k._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">{k.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs px-2 py-0.5 bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 rounded-full font-mono">{k.prefix}</span>
                                                <span className="text-xs text-gray-500">Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        {k.status === 'Active' ? (
                                            <button onClick={() => revokeKey(k._id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="Revoke Key">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        ) : (
                                            <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">Revoked</span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Webhooks Section */}
                <div className="space-y-6">
                    <div className="border border-black/5 dark:border-white/10 bg-white/80 dark:bg-[#110c21] backdrop-blur-xl rounded-3xl p-8 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 dark:bg-purple-500/5 blur-[50px] rounded-full pointer-events-none" />

                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                            <RefreshCw className="w-6 h-6 text-purple-500" /> Webhooks
                        </h3>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Register an endpoint URL to receive real-time POST requests when queue events happen.
                        </p>

                        <div className="flex gap-3 mb-8">
                            <input
                                value={webhookUrl}
                                onChange={(e) => setWebhookUrl(e.target.value)}
                                placeholder="https://yourdomain.com/webhook"
                                className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-purple-500 outline-none text-gray-900 dark:text-white"
                            />
                            <button
                                onClick={addWebhook}
                                className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-purple-500/20"
                            >
                                <Plus className="w-5 h-5" /> Add
                            </button>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Active Endpoints</h4>
                            {webhooks.length === 0 ? (
                                <p className="text-sm text-gray-400">No webhooks registered.</p>
                            ) : (
                                webhooks.map((w: any) => (
                                    <div key={w._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                        <div className="overflow-hidden w-[80%]">
                                            <p className="font-mono text-sm text-gray-900 dark:text-white truncate" title={w.url}>{w.url}</p>
                                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-semibold truncate"><span className="text-gray-500 font-normal">Secret: </span>{w.secret}</p>
                                        </div>
                                        <button onClick={() => deleteWebhook(w._id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0" title="Remove Webhook">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
