"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import ThemeToggle from "@/components/ThemeToggle";
import { History, Search, Filter, Calendar, CheckCircle, XCircle, Stethoscope, ChevronDown } from "lucide-react";

export default function HistoryDashboard() {
    const [history, setHistory] = useState([]);
    const [date, setDate] = useState("");
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [user, setUser] = useState<any>(null);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");

    useEffect(() => {
        const initializeHistory = async () => {
            try {
                setLoading(true);
                // Get current user
                const userRes = await api.get("/auth/me");
                const userData = userRes.data;
                setUser(userData);

                // Fetch doctors based on role
                if (userData.role === "RECEPTIONIST") {
                    const docsRes = await api.get("/admin/reception/doctors");
                    setDoctors(docsRes.data || []);
                    if (docsRes.data && docsRes.data.length > 0) {
                        // Set empty string to show all by default, or first doctor
                        setSelectedDoctorId("");
                    }
                } else if (userData.role === "HOSPITAL_ADMIN") {
                    const staffRes = await api.get("/admin/staff");
                    const allStaff = staffRes.data || [];
                    const doctorsList = allStaff.filter((s: any) => s.role === "DOCTOR");
                    setDoctors(doctorsList);
                    if (doctorsList.length > 0) {
                        // Set empty string to show all by default
                        setSelectedDoctorId("");
                    }
                }
            } catch (err: any) {
                const errorMsg = err.response?.data?.message || "Failed to initialize. Please login again.";
                setError(errorMsg);
                console.error("Failed to initialize history", err);
                setLoading(false);
            }
        };

        initializeHistory();
    }, []);

    const loadHistory = async () => {
        if (!user) {
            console.log("User not loaded yet, skipping history load");
            return;
        }
        
        try {
            setLoading(true);
            setError("");
            const params: any = { date, status, search };
            
            // Add doctorId for RECEPTIONIST and HOSPITAL_ADMIN roles
            if (user.role === "RECEPTIONIST" || user.role === "HOSPITAL_ADMIN") {
                // Only add doctorId if a specific doctor is selected (not empty string for "All Doctors")
                if (selectedDoctorId && selectedDoctorId !== "") {
                    params.doctorId = selectedDoctorId;
                }
            }
            
            console.log("Loading history with params:", params, "User role:", user.role);
            const res = await api.get(`/queue/history/`, { params });
            setHistory(res.data);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.message || "Failed to load history";
            setError(errorMsg);
            console.error("History load error:", {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                fullError: err
            });
            setHistory([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadHistory();
        }
    }, [user, selectedDoctorId]);

    return (
        <div className="w-full mx-auto px-6 pb-20 pt-8 animate-fadeIn max-w-7xl">

            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <History className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Patient History Logs</h2>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Review completed and cancelled visits</p>
                    </div>
                </div>
                <ThemeToggle />
            </div>

            {error && (
                <div className="mb-8 p-4 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 backdrop-blur-md shadow-lg flex items-center gap-3">
                    <XCircle className="w-5 h-5" />
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            <div className="bg-white/80 dark:bg-black/20 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-3xl p-6 shadow-xl mb-8 flex flex-wrap gap-4 items-end">

                {/* Doctor Selector for Non-Doctor Roles */}
                {(user?.role === "RECEPTIONIST" || user?.role === "HOSPITAL_ADMIN") && doctors.length > 0 && (
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 pl-1 block">Select Doctor</label>
                        <div className="relative">
                            <Stethoscope className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                            <select
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none appearance-none"
                                value={selectedDoctorId}
                                onChange={e => setSelectedDoctorId(e.target.value)}
                            >
                                <option className="text-black" value="">All Doctors</option>
                                {doctors.map(doc => (
                                    <option key={doc._id} value={doc._id} className="text-black">
                                        {doc.name} - {doc.specialization}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 pl-1 block">Filter by Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                            type="date"
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 pl-1 block">Status</label>
                    <div className="relative">
                        <Filter className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <select
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none appearance-none"
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                        >
                            <option className="text-black" value="">All</option>
                            <option className="text-black" value="completed">Completed</option>
                            <option className="text-black" value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                <div className="flex-1 md:col-span-2 min-w-[280px]">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5 pl-1 block">Search Name</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                            placeholder="Enter patient name..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="w-full lg:w-auto">
                    <button
                        onClick={loadHistory}
                        className="w-full lg:w-auto px-8 py-3.5 rounded-xl font-bold
            bg-gray-900 text-white hover:bg-gray-800
            dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200
            shadow-xl transition-transform active:scale-95"
                    >
                        Apply Filters
                    </button>
                </div>

            </div>

            <div className="bg-white/80 dark:bg-black/20 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-3xl p-6 shadow-xl">
                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/30">
                    <table className="w-full text-left inline-table min-w-[800px]">
                        <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest rounded-tl-2xl">Token Number</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Patient Name</th>
                                {(user?.role === "RECEPTIONIST" || user?.role === "HOSPITAL_ADMIN") && (
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Doctor</th>
                                )}
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Description</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest rounded-tr-2xl text-right">Resolved Time</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={(user?.role === "RECEPTIONIST" || user?.role === "HOSPITAL_ADMIN") ? 6 : 5} className="px-6 py-20 text-center">
                                        <div className="inline-flex flex-col items-center justify-center">
                                            <div className="w-10 h-10 border-4 border-purple-500 dark:border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="mt-3 text-gray-500 dark:text-gray-400 font-medium tracking-widest text-sm">LOADING RECORDS</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan={(user?.role === "RECEPTIONIST" || user?.role === "HOSPITAL_ADMIN") ? 6 : 5} className="text-center py-20">
                                        <div className="inline-flex flex-col items-center text-gray-400 dark:text-gray-500">
                                            <History className="w-12 h-12 mb-3 opacity-20" />
                                            <span className="font-medium text-lg">No records found matching filters</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                history.map((p: any) => (
                                    <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 font-black text-gray-400 dark:text-gray-500 text-lg group-hover:text-primary-500 dark:group-hover:text-cyan-400 transition-colors">
                                            #{p.tokenNumber}
                                        </td>

                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                            {p.name}
                                        </td>

                                        {(user?.role === "RECEPTIONIST" || user?.role === "HOSPITAL_ADMIN") && (
                                            <td className="px-6 py-4 text-sm">
                                                <div className="font-semibold text-gray-900 dark:text-white">{p.doctorId?.name || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{p.doctorId?.specialization || ''}</div>
                                            </td>
                                        )}

                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm max-w-[200px] truncate">
                                            {p.description || "--"}
                                        </td>

                                        <td className="px-6 py-4">
                                            {p.status === "completed" ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-sm font-bold border border-green-200 dark:border-green-800/30 shadow-sm">
                                                    <CheckCircle className="w-4 h-4" /> Completed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-sm font-bold border border-red-200 dark:border-red-800/30 shadow-sm">
                                                    <XCircle className="w-4 h-4" /> Cancelled
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm font-medium text-right bg-gray-50/50 dark:bg-black/10">
                                            {p.completedAt ? new Date(p.completedAt).toLocaleString(undefined, {
                                                month: 'short', day: 'numeric', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            }) : "--"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
