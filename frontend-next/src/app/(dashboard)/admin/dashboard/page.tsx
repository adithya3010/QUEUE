"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import { Users, UserPlus, FileText, CheckCircle, Stethoscope, Power, Activity, QrCode, Clock, X, Monitor, Calendar, Smartphone, RefreshCw } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

export default function AdminDashboard() {
    const router = useRouter();
    const [admin, setAdmin] = useState<any>(null);
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    // Form states
    const [doctorForm, setDoctorForm] = useState({ name: "", email: "", specialization: "", password: "" });
    const [receptionistForm, setReceptionistForm] = useState({ name: "", email: "", password: "", assignedDoctors: [] });

    // Lists
    const [doctors, setDoctors] = useState<any[]>([]);
    const [receptionists, setReceptionists] = useState<any[]>([]);

    // Scheduling State
    const [editingScheduleDoc, setEditingScheduleDoc] = useState<any>(null);
    const [scheduleForm, setScheduleForm] = useState<any[]>([]);

    // Appointments Overview State
    const [adminSelectedDoctorId, setAdminSelectedDoctorId] = useState("");
    const [adminAppointments, setAdminAppointments] = useState<any[]>([]);
    const [appointmentsLoading, setAppointmentsLoading] = useState(false);

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    useEffect(() => {
        loadAdminData();
    }, []);

    const loadAdminData = async () => {
        try {
            const meRes = await api.get("/admin/info");
            const userData = meRes.data;

            if (userData.role !== "HOSPITAL_ADMIN") {
                router.push("/login");
                return;
            }
            setAdmin(userData);

            // Fetch all staff (doctors and receptionists) for this admin's hospital
            const staffRes = await api.get("/admin/staff");
            const allStaff = staffRes.data || [];
            // Filter doctors and receptionists
            const doctorsList = allStaff.filter((s: any) => s.role === "DOCTOR");
            const receptionistsList = allStaff.filter((s: any) => s.role === "RECEPTIONIST");
            setDoctors(doctorsList);
            setReceptionists(receptionistsList);

        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 401) router.push("/login");
        }
    }

    const handleAddDoctor = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/admin/staff/doctor", doctorForm);
            setMsg("Doctor Added Successfully 🎉");
            setDoctorForm({ name: "", email: "", specialization: "", password: "" });
            loadAdminData(); // Refresh list
        } catch (err: any) {
            setMsg(err.response?.data?.message || "Failed to add doctor");
        } finally {
            setLoading(false);
            setTimeout(() => setMsg(""), 3000);
        }
    };

    const handleAddReceptionist = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/admin/staff/receptionist", receptionistForm);
            setMsg("Receptionist Added Successfully 🎉");
            setReceptionistForm({ name: "", email: "", password: "", assignedDoctors: [] });
            loadAdminData(); // Refresh list
        } catch (err: any) {
            setMsg(err.response?.data?.message || "Failed to add receptionist");
        } finally {
            setLoading(false);
            setTimeout(() => setMsg(""), 3000);
        }
    };

    const handleDoctorSelection = (e: any) => {
        // Handle multi-select for assigned doctors
        const value = Array.from(e.target.selectedOptions, (option: any) => option.value);
        setReceptionistForm({ ...receptionistForm, assignedDoctors: value as any });
    };

    async function logout() {
        try {
            // Try both logout endpoints to clear all cookies
            await api.post("/admin/logout").catch(() => { });
            await api.post("/auth/logout").catch(() => { });
        } catch (err) {
            console.error("Logout error:", err);
        } finally {
            localStorage.clear();
            router.push("/login");
        }
    }

    const handleDownloadQRCode = () => {
        const canvas = document.getElementById("kiosk-qr-code") as HTMLCanvasElement;
        if (!canvas) return;
        const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = "clinic-kiosk-qr.png";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    const handleOpenSchedule = (doc: any) => {
        setEditingScheduleDoc(doc);
        if (doc.schedule && doc.schedule.length > 0) {
            setScheduleForm(doc.schedule);
        } else {
            setScheduleForm(daysOfWeek.map(day => ({ day, startTime: "", endTime: "" })));
        }
    };

    const handleScheduleChange = (index: number, field: string, value: string) => {
        const newSched = [...scheduleForm];
        newSched[index] = { ...newSched[index], [field]: value };
        setScheduleForm(newSched);
    };

    const handleSaveSchedule = async () => {
        setLoading(true);
        try {
            await api.put(`/admin/staff/${editingScheduleDoc._id}/schedule`, { schedule: scheduleForm });
            setMsg("Schedule Updated Successfully 🎉");
            setEditingScheduleDoc(null);
            loadAdminData();
        } catch (err: any) {
            setMsg(err.response?.data?.message || "Failed to update schedule");
        } finally {
            setLoading(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
            setTimeout(() => setMsg(""), 3000);
        }
    };

    const loadAdminAppointments = async (doctorId: string) => {
        if (!doctorId) return;
        setAppointmentsLoading(true);
        try {
            const res = await api.get(`/appointments/doctor/${doctorId}/upcoming`);
            setAdminAppointments(res.data);
        } catch (err) {
            console.error("Admin appointments load error", err);
        } finally {
            setAppointmentsLoading(false);
        }
    };

    if (!admin) return <Loader />;

    return (
        <div className="w-full min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white transition-colors duration-300 relative overflow-x-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-info-500/20 to-brand-500/20 border border-info-500/30 rounded-xl flex items-center justify-center">
                            <Activity className="w-6 h-6 text-brand-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-white">
                                Admin Dashboard
                            </h1>
                            <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium mt-0.5">{admin.name} - Hospital Management</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white dark:bg-neutral-800 border border-brand-200 dark:border-brand-500/20 rounded-2xl p-5 shadow-sm text-center md:text-left transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <Stethoscope className="w-8 h-8 text-brand-600 dark:text-brand-400 mx-auto md:mx-0" />
                            <span className="text-3xl font-black text-brand-600 dark:text-brand-400">{doctors.length}</span>
                        </div>
                        <p className="text-sm font-bold text-neutral-600 dark:text-neutral-300">Active Doctors</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-success-200 dark:border-success-500/20 rounded-2xl p-5 shadow-sm text-center md:text-left transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <Users className="w-8 h-8 text-success-600 dark:text-success-400 mx-auto md:mx-0" />
                            <span className="text-3xl font-black text-success-600 dark:text-success-400">{receptionists.length}</span>
                        </div>
                        <p className="text-sm font-bold text-neutral-600 dark:text-neutral-300">Receptionists</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-info-200 dark:border-info-500/20 rounded-2xl p-5 shadow-sm text-center md:text-left transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <Activity className="w-8 h-8 text-info-600 dark:text-info-400 mx-auto md:mx-0" />
                            <span className="text-3xl font-black text-info-600 dark:text-info-400">{doctors.length + receptionists.length}</span>
                        </div>
                        <p className="text-sm font-bold text-neutral-600 dark:text-neutral-300">Total Staff</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-brand-200 dark:border-brand-400/20 rounded-2xl p-5 shadow-sm text-center md:text-left transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <CheckCircle className="w-8 h-8 text-brand-500 mx-auto md:mx-0" />
                            <span className="text-3xl font-black text-brand-500">{admin.hospitalId ? '✓' : '✗'}</span>
                        </div>
                        <p className="text-sm font-bold text-neutral-600 dark:text-neutral-300">System Status</p>
                    </div>
                </div>

                {msg && (
                    <div className={`mb-6 p-4 rounded-xl border text-sm font-bold animate-fade-up flex items-center justify-center gap-2 ${msg.includes('Success') ? 'bg-success-50 dark:bg-success-500/10 border-success-200 dark:border-success-500/30 text-success-600 dark:text-success-400' : 'bg-danger-50 dark:bg-danger-500/10 border-danger-200 dark:border-danger-500/30 text-danger-600 dark:text-danger-400'}`}>
                        {msg.includes('Success') ? <CheckCircle className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                        {msg}
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-6 mb-8">

                    {/* QR Code Card */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                        <div className="flex items-center gap-2 mb-6">
                            <QrCode className="w-6 h-6 text-brand-500" />
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Kiosk QR Code</h3>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 mb-4 inline-block">
                            <QRCodeCanvas
                                id="kiosk-qr-code"
                                value={typeof window !== "undefined" ? `${window.location.origin}/kiosk/${admin.hospitalId}` : ""}
                                size={180}
                                level={"H"}
                                fgColor={"#0f172a"}
                            />
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 max-w-[200px]">
                            Patients can scan this to self-register and check their live queue status.
                        </p>
                        <button
                            onClick={handleDownloadQRCode}
                            className="w-full py-2.5 rounded-xl font-bold bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 transition-colors flex items-center justify-center gap-2 text-sm border border-brand-200 dark:border-brand-500/30"
                        >
                            Download QR Code
                        </button>
                        <button
                            onClick={() => window.open(`/kiosk/${admin.hospitalId}/display`, '_blank')}
                            className="w-full mt-3 py-2.5 rounded-xl font-bold bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-colors flex items-center justify-center gap-2 text-sm border border-indigo-200 dark:border-indigo-500/30"
                        >
                            <Monitor className="w-4 h-4" /> Open TV Display
                        </button>
                    </div>

                    <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
                        {/* Add Doctor Form */}
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm hover:border-brand-300 dark:hover:border-brand-500/30 transition-all">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-brand-50 dark:bg-brand-500/20 border border-brand-200 dark:border-brand-500/30 rounded-xl flex items-center justify-center">
                                    <Stethoscope className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                </div>
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Add Doctor</h3>
                            </div>
                            <form onSubmit={handleAddDoctor} className="space-y-3">
                                <input
                                    placeholder="Doctor Name"
                                    value={doctorForm.name}
                                    onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all text-sm"
                                    required
                                />
                                <input
                                    type="email"
                                    placeholder="Doctor Email"
                                    value={doctorForm.email}
                                    onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all text-sm"
                                    required
                                />
                                <input
                                    placeholder="Specialization (e.g. Cardiology)"
                                    value={doctorForm.specialization}
                                    onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all text-sm"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Temporary Password (min 8 chars)"
                                    value={doctorForm.password}
                                    onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 outline-none transition-all text-sm"
                                    required minLength={8}
                                />
                                <button
                                    disabled={loading}
                                    className="w-full py-3 mt-2 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                                >
                                    <UserPlus className="w-4 h-4" /> Add Doctor
                                </button>
                            </form>
                        </div>

                        {/* Add Receptionist Form */}
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm hover:border-success-300 dark:hover:border-success-500/30 transition-all">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-success-50 dark:bg-success-500/20 border border-success-200 dark:border-success-500/30 rounded-xl flex items-center justify-center">
                                    <Users className="w-5 h-5 text-success-600 dark:text-success-400" />
                                </div>
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Add Receptionist</h3>
                            </div>
                            <form onSubmit={handleAddReceptionist} className="space-y-3">
                                <input
                                    placeholder="Receptionist Name"
                                    value={receptionistForm.name}
                                    onChange={(e) => setReceptionistForm({ ...receptionistForm, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-success-500/50 focus:border-success-500 outline-none transition-all text-sm"
                                    required
                                />
                                <input
                                    type="email"
                                    placeholder="Receptionist Email"
                                    value={receptionistForm.email}
                                    onChange={(e) => setReceptionistForm({ ...receptionistForm, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-success-500/50 focus:border-success-500 outline-none transition-all text-sm"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Temporary Password (min 8 chars)"
                                    value={receptionistForm.password}
                                    onChange={(e) => setReceptionistForm({ ...receptionistForm, password: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-success-500/50 focus:border-success-500 outline-none transition-all text-sm"
                                    required minLength={8}
                                />

                                <div>
                                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 pl-1 block">Assign Doctors (multi-select)</label>
                                    <select
                                        multiple
                                        value={receptionistForm.assignedDoctors}
                                        onChange={handleDoctorSelection}
                                        className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-success-500/50 outline-none min-h-[90px] text-sm custom-scrollbar"
                                    >
                                        {doctors.length === 0 && <option disabled>No doctors available</option>}
                                        {doctors.map(d => (
                                            <option key={d._id} value={d._id} className="py-1">{d.name} - {d.specialization}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    disabled={loading}
                                    className="w-full py-3 mt-2 rounded-xl font-bold bg-success-600 hover:bg-success-700 dark:bg-success-500 dark:hover:bg-success-600 text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                                >
                                    <UserPlus className="w-4 h-4" /> Add Receptionist
                                </button>
                            </form>
                        </div>

                    </div>
                </div>

                {/* Staff Lists */}
                <div className="grid md:grid-cols-2 gap-6">

                    {/* Doctors List */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Stethoscope className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Doctors</h3>
                            </div>
                            <span className="px-3 py-1 bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/30 rounded-lg text-brand-600 dark:text-brand-400 text-xs font-bold">{doctors.length}</span>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {doctors.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-neutral-200 dark:border-neutral-800">
                                        <Stethoscope className="w-8 h-8 text-neutral-400 dark:text-neutral-600" />
                                    </div>
                                    <p className="text-neutral-500 dark:text-neutral-500 text-sm font-medium">No doctors yet</p>
                                </div>
                            ) : (
                                doctors.map((doc) => (
                                    <div key={doc._id} className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-brand-300 dark:hover:border-brand-500/30 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-all group bg-white dark:bg-neutral-800">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-brand-50 dark:bg-brand-500/20 border border-brand-100 dark:border-brand-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Stethoscope className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-neutral-900 dark:text-white text-sm truncate">{doc.name}</p>
                                                <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-0.5">{doc.specialization}</p>
                                                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1 truncate">{doc.email}</p>
                                            </div>
                                            <button
                                                onClick={() => handleOpenSchedule(doc)}
                                                className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-700/50 hover:bg-brand-50 dark:hover:bg-brand-500/20 text-neutral-500 hover:text-brand-600 dark:text-neutral-400 dark:hover:text-brand-400 transition-colors"
                                                title="Edit Working Hours"
                                            >
                                                <Clock className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Receptionists List */}
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-success-600 dark:text-success-400" />
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Receptionists</h3>
                            </div>
                            <span className="px-3 py-1 bg-success-50 dark:bg-success-500/10 border border-success-200 dark:border-success-500/30 rounded-lg text-success-600 dark:text-success-400 text-xs font-bold">{receptionists.length}</span>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {receptionists.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-neutral-200 dark:border-neutral-800">
                                        <Users className="w-8 h-8 text-neutral-400 dark:text-neutral-600" />
                                    </div>
                                    <p className="text-neutral-500 text-sm font-medium">No receptionists yet</p>
                                </div>
                            ) : (
                                receptionists.map((rec) => (
                                    <div key={rec._id} className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-success-300 dark:hover:border-success-500/30 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-all group bg-white dark:bg-neutral-800">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-success-50 dark:bg-success-500/20 border border-success-100 dark:border-success-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Users className="w-5 h-5 text-success-600 dark:text-success-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-neutral-900 dark:text-white text-sm truncate">{rec.name}</p>
                                                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{rec.email}</p>
                                                {rec.assignedDoctors && rec.assignedDoctors.length > 0 && (
                                                    <div className="flex items-center gap-1 mt-2">
                                                        <CheckCircle className="w-3 h-3 text-success-600 dark:text-success-400" />
                                                        <span className="text-xs text-success-600 dark:text-success-400 font-bold">
                                                            {rec.assignedDoctors.length} doctor(s)
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>

                {/* Appointments Overview */}
                <div className="mt-6 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-neutral-200 dark:border-neutral-700">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Appointments Overview</h3>
                            <span className="px-2.5 py-0.5 text-xs font-black bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-full">Next 7 Days</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={adminSelectedDoctorId}
                                onChange={(e) => {
                                    setAdminSelectedDoctorId(e.target.value);
                                    loadAdminAppointments(e.target.value);
                                }}
                                className="px-4 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm appearance-none"
                            >
                                <option value="">Select a doctor…</option>
                                {doctors.map((doc: any) => (
                                    <option key={doc._id} value={doc._id}>Dr. {doc.name} — {doc.specialization}</option>
                                ))}
                            </select>
                            {adminSelectedDoctorId && (
                                <button
                                    onClick={() => loadAdminAppointments(adminSelectedDoctorId)}
                                    className="p-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400 group"
                                >
                                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                                </button>
                            )}
                        </div>
                    </div>

                    {!adminSelectedDoctorId ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-900 rounded-2xl flex items-center justify-center mb-3 border border-neutral-200 dark:border-neutral-800">
                                <Calendar className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                            </div>
                            <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">Select a doctor above to see their upcoming appointments</p>
                        </div>
                    ) : appointmentsLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                        </div>
                    ) : adminAppointments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-900 rounded-2xl flex items-center justify-center mb-3 border border-neutral-200 dark:border-neutral-800">
                                <CheckCircle className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                            </div>
                            <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">No upcoming appointments in the next 7 days for this doctor</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-neutral-100 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 text-xs uppercase tracking-wider">
                                        <th className="p-3 font-bold rounded-tl-xl">Date</th>
                                        <th className="p-3 font-bold text-center">Time</th>
                                        <th className="p-3 font-bold">Patient</th>
                                        <th className="p-3 font-bold hidden sm:table-cell">Phone</th>
                                        <th className="p-3 font-bold hidden md:table-cell">Notes</th>
                                        <th className="p-3 font-bold rounded-tr-xl">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700/50">
                                    {adminAppointments.map((appt: any) => {
                                        const dt = new Date(appt.scheduledAt);
                                        return (
                                            <tr key={appt._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                                <td className="p-3">
                                                    <span className="font-bold text-neutral-700 dark:text-neutral-300 text-xs">
                                                        {dt.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="font-bold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs">
                                                        {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <p className="font-bold text-neutral-900 dark:text-white">{appt.patientName}</p>
                                                </td>
                                                <td className="p-3 hidden sm:table-cell">
                                                    <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 text-xs font-medium">
                                                        <Smartphone className="w-3 h-3" />
                                                        {appt.phone || '—'}
                                                    </div>
                                                </td>
                                                <td className="p-3 hidden md:table-cell">
                                                    {appt.notes ? (
                                                        <span className="px-2 py-0.5 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-500/30 text-info-700 dark:text-info-400 rounded text-[10px] font-semibold">
                                                            {appt.notes}
                                                        </span>
                                                    ) : (
                                                        <span className="text-neutral-400 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-black rounded-md border ${appt.status === 'arrived'
                                                            ? 'bg-success-50 border-success-200 text-success-700 dark:bg-success-500/20 dark:border-success-500/30 dark:text-success-400'
                                                            : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-400'
                                                        }`}>
                                                        {appt.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Schedule Modal */}
            {editingScheduleDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Working Hours</h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Dr. {editingScheduleDoc.name}</p>
                            </div>
                            <button onClick={() => setEditingScheduleDoc(null)} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-neutral-900">
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4 px-2 mb-2">
                                    <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Day</div>
                                    <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Start Time</div>
                                    <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">End Time</div>
                                </div>
                                {scheduleForm.map((dayObj, i) => (
                                    <div key={dayObj.day} className="grid grid-cols-3 gap-4 items-center bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 hover:border-brand-200 dark:hover:border-brand-500/30 transition-colors">
                                        <div className="font-semibold text-sm text-neutral-700 dark:text-neutral-200 pl-2">{dayObj.day}</div>
                                        <input
                                            type="time"
                                            value={dayObj.startTime}
                                            onChange={(e) => handleScheduleChange(i, "startTime", e.target.value)}
                                            className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 outline-none"
                                        />
                                        <input
                                            type="time"
                                            value={dayObj.endTime}
                                            onChange={(e) => handleScheduleChange(i, "endTime", e.target.value)}
                                            className="px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-neutral-500 mt-4 text-center">Leave times blank if not working on a day.</p>
                        </div>

                        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingScheduleDoc(null)}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={loading}
                                onClick={handleSaveSchedule}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? "Saving..." : "Save Schedule"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
