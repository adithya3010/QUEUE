"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import { io } from "socket.io-client";
import { Users, FileText, CheckCircle, Clock, Stethoscope, Power, Activity, ShieldAlert, ArrowUp, ArrowDown, GripVertical, Smartphone, Copy, Calendar, UserPlus, RefreshCw, CalendarPlus } from "lucide-react";
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, DragEndEvent
} from "@dnd-kit/core";
import {
    SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
    useSortable, arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable row wrapper
function SortableRow({ id, children }: { id: string; children: (listeners: any, attributes: any) => React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
    };
    return (
        <tr ref={setNodeRef} style={style} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors bg-white dark:bg-transparent">
            {children(listeners, attributes)}
        </tr>
    );
}

export default function OperatorDashboard() {
    const [operator, setOperator] = useState<any>(null);
    const [organization, setOrganization] = useState<any>(null);
    const [appointmentsEnabled, setAppointmentsEnabled] = useState<boolean | null>(null);
    const [queue, setQueue] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [msg, setMsg] = useState("");
    const [form, setForm] = useState({ name: "", email: "", phone: "", age: "", notes: "", priority: "NORMAL", agentId: "" });
    const [appointmentForm, setAppointmentForm] = useState({ name: "", email: "", phone: "", scheduledAt: "", notes: "", agentId: "" });
    const [activeTab, setActiveTab] = useState<'walkin' | 'appointment'>('walkin');
    const [stats, setStats] = useState({ total: 0, waiting: 0, priority: 0, avgWaitTime: 0 });
    const router = useRouter();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        loadOperator();
    }, []);

    useEffect(() => {
        if (!operator) return;

        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000", {
            transports: ["websocket"]
        });

        socket.on("connect", () => console.log("Socket connected:", socket.id));

        // Listen for queue updates from all assigned agents (both new and legacy events)
        const assignedAgents = operator.assignedAgents || operator.assignedDoctors || [];
        assignedAgents.forEach((agent: any) => {
            socket.on(`queueUpdate-${agent._id}`, loadQueue);
            socket.on("queue.updated", loadQueue);
        });

        return () => {
            socket.disconnect();
        };
    }, [operator]);

    useEffect(() => {
        if (!operator) return;
        api.get("/auth/org").then((res) => {
            const org = res.data?.organization;
            setOrganization(org);
            const enabled = org ? (org.industry !== "salon" && org.settings?.allowAppointments !== false) : true;
            setAppointmentsEnabled(enabled);
        }).catch(() => {
            // Non-fatal: if we can't load org info, default to enabling appointments
            setAppointmentsEnabled(true);
        });
    }, [operator]);

    useEffect(() => {
        if (appointmentsEnabled === false && activeTab === "appointment") {
            setActiveTab("walkin");
        }
    }, [appointmentsEnabled, activeTab]);

    async function loadOperator() {
        try {
            const meRes = await api.get("/auth/me");
            const userData = meRes.data;

            if (userData.role !== "OPERATOR" && userData.role !== "RECEPTIONIST" &&
                userData.role !== "ORG_ADMIN" && userData.role !== "HOSPITAL_ADMIN") {
                router.push("/agent");
                return;
            }
            if (userData.role === 'ORG_ADMIN' || userData.role === 'HOSPITAL_ADMIN') {
                const staffRes = await api.get("/org/staff");
                const allStaff = staffRes.data || [];
                const operatorsList = allStaff.filter((s: any) => s.role === "OPERATOR" || s.role === "RECEPTIONIST");
                if (operatorsList.length > 0) {
                    setOperator(operatorsList[0]);
                } else {
                    router.push("/admin/dashboard");
                }
            } else {
                setOperator(userData);
            }
        } catch (err: any) {
            if (err.response?.status === 401) router.push("/login");
        }
    }

    useEffect(() => {
        if (operator) {
            loadQueue();
            if (appointmentsEnabled) loadAppointments();
        }
    }, [operator, appointmentsEnabled]);

    async function loadAppointments() {
        try {
            if (!appointmentsEnabled) {
                setAppointments([]);
                return;
            }
            let allApps: any[] = [];
            const assignedAgents = operator.assignedAgents || operator.assignedDoctors || [];
            for (let agent of assignedAgents) {
                const res = await api.get(`/appointments/agent/${agent._id}/upcoming`);
                allApps = [...allApps, ...res.data];
            }
            allApps.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
            setAppointments(allApps);
        } catch (err: any) {
            if (err?.response?.status === 403) {
                setAppointmentsEnabled(false);
                setActiveTab("walkin");
                setAppointments([]);
                return;
            }
            console.error(err);
        }
    }

    async function loadQueue() {
        try {
            let allQueues: any[] = [];
            const assignedAgents = operator.assignedAgents || operator.assignedDoctors || [];
            for (let agent of assignedAgents) {
                const res = await api.get(`/queue/${agent._id}`);
                allQueues = [...allQueues, ...res.data];
            }

            // Sort by priority (EMERGENCY and HIGH first) then by creation time
            allQueues.sort((a, b) => {
                const pMap: any = { EMERGENCY: 1, HIGH: 2, NORMAL: 3 };
                if (pMap[a.priority] !== pMap[b.priority]) return pMap[a.priority] - pMap[b.priority];
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            });

            setQueue(allQueues);
            calculateStats(allQueues);

        } catch (err) {
            console.error(err);
        }
    }

    function calculateStats(queueData: any[]) {
        const total = queueData.length;
        const waiting = queueData.filter(q => q.status === 'WAITING').length;
        const priority = queueData.filter(q => q.priority === 'EMERGENCY' || q.priority === 'HIGH').length;
        const avgWaitTime = waiting * 15;
        setStats({ total, waiting, priority, avgWaitTime });
    }

    async function addClient(e: any) {
        e.preventDefault();
        if (!form.agentId) {
            showMsg("Please select an agent", "error");
            return;
        }

        try {
            await api.post("/queue/add", {
                clientName: form.name,
                name: form.name,                // legacy compat
                number: form.phone,
                clientEmail: form.email,
                email: form.email,              // legacy compat
                description: form.priority,
                notes: form.notes,
                agentId: form.agentId,
                doctorId: form.agentId,         // legacy compat
            });
            showMsg("Client added to queue!", "success");
            setForm({ name: "", email: "", phone: "", age: "", notes: "", priority: "NORMAL", agentId: form.agentId });
            loadQueue();
        } catch (err: any) {
            showMsg(err.response?.data?.message || "Error adding client", "error");
        }
    }

    async function bookAppointment(e: any) {
        e.preventDefault();
        if (!appointmentsEnabled) {
            showMsg("Appointments are disabled for your organization", "error");
            return;
        }
        if (!appointmentForm.agentId || !appointmentForm.scheduledAt) {
            showMsg("Please fill all required fields", "error");
            return;
        }

        try {
            await api.post("/appointments/book", {
                clientName: appointmentForm.name,
                patientName: appointmentForm.name,       // legacy compat
                clientPhone: appointmentForm.phone,
                phone: appointmentForm.phone,            // legacy compat
                clientEmail: appointmentForm.email,
                email: appointmentForm.email,            // legacy compat
                scheduledAt: appointmentForm.scheduledAt,
                notes: appointmentForm.notes,
                agentId: appointmentForm.agentId,
                doctorId: appointmentForm.agentId,       // legacy compat
            });
            showMsg("Appointment booked successfully!", "success");
            setAppointmentForm({ name: "", email: "", phone: "", scheduledAt: "", notes: "", agentId: appointmentForm.agentId });
            loadAppointments();
        } catch (err: any) {
            showMsg(err.response?.data?.message || "Error booking appointment", "error");
        }
    }

    async function updateStatus(id: string, action: 'complete' | 'cancel') {
        try {
            await api.put(`/queue/${action}/${id}`);
            showMsg(`Client marked as ${action === 'complete' ? 'completed' : 'cancelled'}`, "success");
            loadQueue();
        } catch (err) {
            showMsg("Error updating status", "error");
        }
    }

    async function markArrived(appointmentId: string) {
        try {
            if (!appointmentsEnabled) {
                showMsg("Appointments are disabled for your organization", "error");
                return;
            }
            const res = await api.put(`/appointments/${appointmentId}/arrive`);
            const appt = res.data.appointment;

            // Transfer to live queue
            await api.post("/queue/add", {
                clientName: appt.clientName || appt.patientName,
                name: appt.clientName || appt.patientName,
                number: appt.clientPhone || appt.phone,
                clientEmail: appt.clientEmail || appt.email,
                email: appt.clientEmail || appt.email,
                description: 'NORMAL',
                notes: `[Appt] ${appt.notes || ''}`,
                agentId: appt.agentId || appt.doctorId,
                doctorId: appt.agentId || appt.doctorId,
            });
            showMsg("Client arrived and added to Live Queue!", "success");
            loadAppointments();
            loadQueue();
        } catch (err) {
            showMsg("Error marking arrival", "error");
        }
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = queue.findIndex(q => q._id === active.id);
        const newIndex = queue.findIndex(q => q._id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        if (oldIndex > 2 || newIndex > 2) return;

        const reordered = arrayMove(queue, oldIndex, newIndex);
        setQueue(reordered);

        const agentGroups = new Map<string, string[]>();
        for (const p of reordered) {
            const agentId = p.agentId?._id || p.doctorId?._id || p.agentId || p.doctorId;
            if (!agentGroups.has(agentId)) agentGroups.set(agentId, []);
            agentGroups.get(agentId)!.push(p._id);
        }
        for (const [agentId, newOrder] of agentGroups) {
            try {
                await api.put(`/queue/reorder/${agentId}`, { newOrder: newOrder.slice(0, 3) });
            } catch (err) {
                console.error("Reorder error", err);
            }
        }
    }

    async function submitReorder(reordered: any[]) {
        const agentGroups = new Map<string, string[]>();
        for (const p of reordered) {
            const agentId = p.agentId?._id?.toString() || p.doctorId?._id?.toString() || p.agentId?.toString() || p.doctorId?.toString();
            if (!agentId) continue;
            if (!agentGroups.has(agentId)) agentGroups.set(agentId, []);
            agentGroups.get(agentId)!.push(p._id?.toString() || p._id);
        }
        for (const [agentId, allIds] of agentGroups) {
            const top3 = allIds.slice(0, 3);
            try {
                await api.put(`/queue/reorder/${agentId}`, { newOrder: top3 });
            } catch (err) {
                console.error("Reorder error", err);
            }
        }
    }

    async function moveUp(index: number) {
        if (index <= 0 || index > 2) return;
        const a = queue[index];
        const b = queue[index - 1];
        const aAgent = a?.agentId?._id?.toString() || a?.doctorId?._id?.toString() || a?.agentId?.toString() || a?.doctorId?.toString();
        const bAgent = b?.agentId?._id?.toString() || b?.doctorId?._id?.toString() || b?.agentId?.toString() || b?.doctorId?.toString();
        if (aAgent !== bAgent) return;
        const reordered = arrayMove(queue, index, index - 1);
        setQueue(reordered);
        await submitReorder(reordered);
    }

    async function moveDown(index: number) {
        if (index < 0 || index >= 2 || index >= queue.length - 1) return;
        const a = queue[index];
        const b = queue[index + 1];
        const aAgent = a?.agentId?._id?.toString() || a?.doctorId?._id?.toString() || a?.agentId?.toString() || a?.doctorId?.toString();
        const bAgent = b?.agentId?._id?.toString() || b?.doctorId?._id?.toString() || b?.agentId?.toString() || b?.doctorId?.toString();
        if (aAgent !== bAgent) return;
        const reordered = arrayMove(queue, index, index + 1);
        setQueue(reordered);
        await submitReorder(reordered);
    }

    const copyLiveTrackingLink = (uid: string) => {
        const url = `${window.location.origin}/status/${uid}`;
        navigator.clipboard.writeText(url);
        showMsg("Live Tracking Link Copied!", "success");
    };

    function showMsg(text: string, type: string) {
        setMsg(`${type === 'success' ? '✅' : '❌'} ${text}`);
        setTimeout(() => setMsg(""), 3000);
    }

    async function logout() {
        try {
            await api.post("/auth/logout");
        } catch (err) {
            console.error(err);
        } finally {
            localStorage.clear();
            router.push("/login");
        }
    }

    if (!operator) return <Loader />;

    const assignedAgents = operator.assignedAgents || operator.assignedDoctors || [];
    const showAppointmentsTab = appointmentsEnabled === true;

    return (
        <div className="w-full min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white transition-colors duration-300 relative overflow-x-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-brand-50 dark:bg-brand-500/20 border border-brand-200 dark:border-brand-500/30 rounded-xl flex items-center justify-center shadow-sm">
                            <Users className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-white">
                                Operator Panel
                            </h1>
                            <p className="text-neutral-500 dark:text-neutral-400 text-sm font-medium mt-0.5">{operator.name} - Assigned to {assignedAgents.length} Agent{assignedAgents.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white dark:bg-neutral-800 border border-brand-200 dark:border-brand-500/20 rounded-2xl p-5 shadow-sm text-center transition-colors">
                        <div className="flex justify-center mb-2">
                            <Users className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                        </div>
                        <span className="text-3xl font-black text-brand-600 dark:text-brand-400 block">{stats.total}</span>
                        <p className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400 mt-1">Total Clients</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-success-200 dark:border-success-500/20 rounded-2xl p-5 shadow-sm text-center transition-colors">
                        <div className="flex justify-center mb-2">
                            <Activity className="w-8 h-8 text-success-600 dark:text-success-400" />
                        </div>
                        <span className="text-3xl font-black text-success-600 dark:text-success-400 block">{stats.waiting}</span>
                        <p className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400 mt-1">Waiting</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-danger-200 dark:border-danger-500/20 rounded-2xl p-5 shadow-sm text-center transition-colors">
                        <div className="flex justify-center mb-2">
                            <ShieldAlert className="w-8 h-8 text-danger-600 dark:text-danger-400" />
                        </div>
                        <span className="text-3xl font-black text-danger-600 dark:text-danger-400 block">{stats.priority}</span>
                        <p className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400 mt-1">Priority/Emergency</p>
                    </div>
                    <div className="bg-white dark:bg-neutral-800 border border-info-200 dark:border-info-500/20 rounded-2xl p-5 shadow-sm text-center transition-colors">
                        <div className="flex justify-center mb-2">
                            <Clock className="w-8 h-8 text-info-600 dark:text-info-400" />
                        </div>
                        <span className="text-3xl font-black text-info-600 dark:text-info-400 block">{stats.avgWaitTime} <span className="text-sm font-bold text-neutral-400">min</span></span>
                        <p className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400 mt-1">Est. Wait Time</p>
                    </div>
                </div>

                {msg && (
                    <div className={`mb-6 p-4 rounded-xl border text-sm font-bold animate-fade-up flex items-center justify-center gap-2 ${msg.includes('✅') ? 'bg-success-50 dark:bg-success-500/10 border-success-200 dark:border-success-500/30 text-success-600 dark:text-success-400' : 'bg-danger-50 dark:bg-danger-500/10 border-danger-200 dark:border-danger-500/30 text-danger-600 dark:text-danger-400'}`}>
                        {msg}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex bg-neutral-200/50 dark:bg-neutral-800/50 p-1.5 rounded-2xl mb-8 w-fit gap-1">
                    <button
                        onClick={() => setActiveTab('walkin')}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'walkin' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                    >
                        Walk-in Queue
                    </button>
                    {showAppointmentsTab && (
                        <button
                            onClick={() => setActiveTab('appointment')}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'appointment' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                        >
                            <Calendar className="w-4 h-4" /> Appointments (7 Days)
                        </button>
                    )}
                </div>

                {/* Forms Column */}
                <div className="lg:col-span-1">
                    {activeTab === 'walkin' ? (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm sticky top-6 animate-fadeIn">
                            <div className="flex items-center gap-2 mb-5">
                                <UserPlus className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Add Walk-in</h3>
                            </div>
                            <form onSubmit={addClient} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 pl-1 block">Client Name <span className="text-danger-500">*</span></label>
                                    <input
                                        placeholder="Full Name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 pl-1 block">Email <span className="text-neutral-400">(for confirmation)</span></label>
                                    <input
                                        type="email"
                                        placeholder="name@example.com"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 pl-1 block">Phone <span className="text-danger-500">*</span></label>
                                        <input
                                            placeholder="10-digit number"
                                            value={form.phone}
                                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm"
                                            required pattern="\d{10}" title="10 digit valid phone number"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 pl-1 block">Age</label>
                                        <input
                                            type="number"
                                            placeholder="Years"
                                            value={form.age}
                                            onChange={(e) => setForm({ ...form, age: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 pl-1 block">Assign To Agent <span className="text-danger-500">*</span></label>
                                    <select
                                        value={form.agentId}
                                        onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 outline-none text-sm appearance-none"
                                        required
                                    >
                                        <option value="" disabled>Select Agent</option>
                                        {assignedAgents.map((agent: any) => (
                                            <option key={agent._id} value={agent._id}>
                                                {agent.name} - {agent.serviceCategory || agent.specialization} ({agent.availability})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 pl-1 block">Priority Level</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: 'NORMAL', label: 'Normal', color: 'success' },
                                            { value: 'HIGH', label: 'High', color: 'warning' },
                                            { value: 'EMERGENCY', label: 'SOS', color: 'danger' },
                                        ].map(({ value, label, color }) => (
                                            <div
                                                key={value}
                                                onClick={() => setForm({ ...form, priority: value })}
                                                className={`cursor-pointer py-2 rounded-lg text-center font-bold text-xs border ${form.priority === value
                                                    ? `bg-${color}-50 dark:bg-${color}-500/20 border-${color}-300 dark:border-${color}-500/50 text-${color}-700 dark:text-${color}-400`
                                                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400'}`}
                                            >
                                                {label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 pl-1 block">Service Note <span className="text-neutral-400">(optional)</span></label>
                                    <textarea
                                        placeholder="e.g. account inquiry, loan application..."
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        rows={2}
                                        maxLength={300}
                                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm resize-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 mt-4 rounded-xl font-bold bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                                >
                                    Add Walk-in
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-sm sticky top-6 animate-fadeIn">
                            <div className="flex items-center gap-2 mb-5">
                                <CalendarPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Book Appt</h3>
                            </div>
                            <form onSubmit={bookAppointment} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 pl-1 block">Client Name <span className="text-danger-500">*</span></label>
                                    <input
                                        placeholder="Full Name"
                                        value={appointmentForm.name}
                                        onChange={(e) => setAppointmentForm({ ...appointmentForm, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 pl-1 block">Email <span className="text-neutral-400">(for reminder)</span></label>
                                    <input
                                        type="email"
                                        placeholder="name@example.com"
                                        value={appointmentForm.email}
                                        onChange={(e) => setAppointmentForm({ ...appointmentForm, email: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 pl-1 block">Phone <span className="text-danger-500">*</span></label>
                                    <input
                                        placeholder="10-digit number"
                                        value={appointmentForm.phone}
                                        onChange={(e) => setAppointmentForm({ ...appointmentForm, phone: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm"
                                        required pattern="\d{10}" title="10 digit valid phone number"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 pl-1 block">Assign To Agent <span className="text-danger-500">*</span></label>
                                    <select
                                        value={appointmentForm.agentId}
                                        onChange={(e) => setAppointmentForm({ ...appointmentForm, agentId: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500/50 outline-none text-sm appearance-none"
                                        required
                                    >
                                        <option value="" disabled>Select Agent</option>
                                        {assignedAgents.map((agent: any) => (
                                            <option key={agent._id} value={agent._id}>
                                                {agent.name} - {agent.serviceCategory || agent.specialization}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 pl-1 block">Scheduled Time <span className="text-danger-500">*</span></label>
                                    <input
                                        type="datetime-local"
                                        value={appointmentForm.scheduledAt}
                                        onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduledAt: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5 pl-1 block">Notes <span className="text-neutral-400">(optional)</span></label>
                                    <textarea
                                        placeholder="Reason for visit..."
                                        value={appointmentForm.notes}
                                        onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                                        rows={2}
                                        maxLength={300}
                                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm resize-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-3 mt-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                                >
                                    Book Appt
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Tables */}
                <div className="lg:col-span-3 mt-6">
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 min-h-[500px] flex flex-col shadow-sm">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-700">
                            <div className="flex items-center gap-3">
                                {activeTab === 'walkin' ? (
                                    <>
                                        <Activity className="w-5 h-5 text-brand-600 dark:text-brand-400 animate-pulse" />
                                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Live Queue Monitor</h3>
                                    </>
                                ) : (
                                    <>
                                        <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Appointments (7 Days)</h3>
                                    </>
                                )}
                            </div>
                            <button onClick={() => { loadQueue(); loadAppointments() }} className="p-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400 group">
                                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                            </button>
                        </div>

                        {/* Reorder note - only on walkin tab */}
                        {activeTab === 'walkin' && queue.length > 0 && (
                            <div className="mb-4 px-4 py-2.5 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-500/30 rounded-xl flex items-center gap-2 text-xs font-semibold text-info-700 dark:text-info-400">
                                <GripVertical className="w-3.5 h-3.5 shrink-0" />
                                <span>Only the first 3 clients can be reordered using drag-and-drop or the arrow buttons.</span>
                            </div>
                        )}

                        {activeTab === 'walkin' ? (
                            <div className="flex-1 overflow-x-auto custom-scrollbar relative">
                                {queue.length === 0 ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-900 rounded-3xl flex items-center justify-center mb-4 border border-neutral-200 dark:border-neutral-800">
                                            <CheckCircle className="w-10 h-10 text-neutral-300 dark:text-neutral-600" />
                                        </div>
                                        <h4 className="text-lg font-bold text-neutral-600 dark:text-neutral-300">Queue is Empty</h4>
                                        <p className="text-neutral-500 text-sm mt-1">No clients are currently waiting.</p>
                                    </div>
                                ) : (
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={queue.map((q: any) => q._id)} strategy={verticalListSortingStrategy}>
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-neutral-100 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 text-xs uppercase tracking-wider">
                                                        <th className="p-3 w-8 rounded-tl-xl text-center"></th>
                                                        <th className="p-4 font-bold">Token</th>
                                                        <th className="p-4 font-bold">Client Details</th>
                                                        <th className="p-4 font-bold hidden sm:table-cell">Agent</th>
                                                        <th className="p-4 font-bold">Status</th>
                                                        <th className="p-4 font-bold text-right rounded-tr-xl">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700/50 text-sm">
                                                    {queue.map((q: any, index: number) => (
                                                        <SortableRow key={q._id} id={q._id}>
                                                            {(listeners, attributes) => (
                                                                <>
                                                                    <td className="p-3">
                                                                        <div className="flex flex-col items-center gap-0.5">
                                                                            {index < 3 ? (
                                                                                <button {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing p-1 text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-400 transition-colors">
                                                                                    <GripVertical className="w-4 h-4" />
                                                                                </button>
                                                                            ) : (
                                                                                <span className="w-6 h-6" />
                                                                            )}
                                                                            {index > 0 && index < 3 && (
                                                                                <button
                                                                                    onClick={() => moveUp(index)}
                                                                                    className="p-0.5 text-neutral-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
                                                                                    title="Move Up"
                                                                                >
                                                                                    <ArrowUp className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            )}
                                                                            {index < 2 && index < queue.length - 1 && (
                                                                                <button
                                                                                    onClick={() => moveDown(index)}
                                                                                    className="p-0.5 text-neutral-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
                                                                                    title="Move Down"
                                                                                >
                                                                                    <ArrowDown className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`px-3 py-1.5 rounded-lg border font-black shadow-sm ${q.priority === 'EMERGENCY' ? 'bg-danger-50 dark:bg-danger-900/30 border-danger-200 dark:border-danger-500/30 text-danger-700 dark:text-danger-400' :
                                                                                q.priority === 'HIGH' ? 'bg-warning-50 dark:bg-warning-900/30 border-warning-200 dark:border-warning-500/30 text-warning-700 dark:text-warning-400' :
                                                                                    'bg-success-50 dark:bg-success-900/30 border-success-200 dark:border-success-500/30 text-success-700 dark:text-success-400'
                                                                                }`}>
                                                                                {q.tokenNumber}
                                                                            </div>
                                                                            {q.priority === 'EMERGENCY' && <span className="flex w-2 h-2 bg-danger-500 rounded-full animate-ping ml-1" />}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-4">
                                                                        <p className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                                                            {q.clientName || q.name}
                                                                            {q.age && (
                                                                                <span className="text-xs font-medium px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-md">
                                                                                    {q.age}y
                                                                                </span>
                                                                            )}
                                                                        </p>
                                                                        <div className="flex items-center gap-1.5 mt-1 text-neutral-500 dark:text-neutral-400 text-xs font-medium">
                                                                            <Smartphone className="w-3 h-3" />
                                                                            {q.clientPhone || q.number}
                                                                        </div>
                                                                        {q.notes && (
                                                                            <div className="mt-1.5 px-2.5 py-1 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-500/30 rounded-lg text-[10px] font-semibold text-info-700 dark:text-info-400">
                                                                                📋 {q.notes}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-4 hidden sm:table-cell">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-900/40 border border-brand-200 dark:border-brand-500/30 flex items-center justify-center flex-shrink-0">
                                                                                <Users className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                                                            </div>
                                                                            <span className="font-bold text-neutral-700 dark:text-neutral-300">
                                                                                {(q.agentId || q.doctorId)?.name}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-4">
                                                                        <span className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-black rounded-md shadow-sm border ${q.status === 'waiting' ? 'bg-warning-50 border-warning-200 text-warning-700 dark:bg-warning-500/20 dark:border-warning-500/30 dark:text-warning-400' :
                                                                            q.status === 'completed' ? 'bg-success-50 border-success-200 text-success-700 dark:bg-success-500/20 dark:border-success-500/30 dark:text-success-400' :
                                                                                'bg-danger-50 border-danger-200 text-danger-700 dark:bg-danger-500/20 dark:border-danger-500/30 dark:text-danger-400'
                                                                            }`}>
                                                                            {q.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-4 text-right">
                                                                        {q.status === 'waiting' ? (
                                                                            <div className="flex items-center justify-end gap-2">
                                                                                <button
                                                                                    onClick={() => copyLiveTrackingLink(q.uniqueLinkId)}
                                                                                    className="p-2 border border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-lg transition-colors"
                                                                                    title="Copy Tracking Link"
                                                                                >
                                                                                    <Copy className="w-4 h-4" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => updateStatus(q._id, 'complete')}
                                                                                    className="p-2 border border-success-200 dark:border-success-500/30 bg-success-50 dark:bg-success-500/10 hover:bg-success-100 dark:hover:bg-success-500/20 text-success-600 dark:text-success-400 rounded-lg transition-colors"
                                                                                    title="Mark Completed"
                                                                                >
                                                                                    <CheckCircle className="w-4 h-4" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => updateStatus(q._id, 'cancel')}
                                                                                    className="p-2 border border-danger-200 dark:border-danger-500/30 bg-danger-50 dark:bg-danger-500/10 hover:bg-danger-100 dark:hover:bg-danger-500/20 text-danger-600 dark:text-danger-400 rounded-lg transition-colors"
                                                                                    title="Cancel"
                                                                                >
                                                                                    <Activity className="w-4 h-4 rotate-45" />
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500">
                                                                                {new Date(q.completedAt || q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </>
                                                            )}
                                                        </SortableRow>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </SortableContext>
                                    </DndContext>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 overflow-x-auto custom-scrollbar relative">
                                {appointments.length === 0 ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-900 rounded-3xl flex items-center justify-center mb-4 border border-neutral-200 dark:border-neutral-800">
                                            <Calendar className="w-10 h-10 text-neutral-300 dark:text-neutral-600" />
                                        </div>
                                        <h4 className="text-lg font-bold text-neutral-600 dark:text-neutral-300">No Appointments</h4>
                                        <p className="text-neutral-500 text-sm mt-1">No appointments scheduled in the next 7 days.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-neutral-100 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400 text-xs uppercase tracking-wider">
                                                <th className="p-4 font-bold rounded-tl-xl">Date</th>
                                                <th className="p-4 font-bold text-center">Time</th>
                                                <th className="p-4 font-bold">Client Details</th>
                                                <th className="p-4 font-bold hidden sm:table-cell">Agent</th>
                                                <th className="p-4 font-bold">Status</th>
                                                <th className="p-4 font-bold text-right rounded-tr-xl">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700/50 text-sm">
                                            {appointments.map((appt: any) => (
                                                <tr key={appt._id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                                                    <td className="p-4">
                                                        <span className="font-bold text-neutral-700 dark:text-neutral-300 text-xs">
                                                            {new Date(appt.scheduledAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="font-bold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                                            {new Date(appt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="font-bold text-neutral-900 dark:text-white">{appt.clientName || appt.patientName}</p>
                                                        <div className="flex items-center gap-1.5 mt-1 text-neutral-500 dark:text-neutral-400 text-xs font-medium">
                                                            <Smartphone className="w-3 h-3" />
                                                            {appt.clientPhone || appt.phone}
                                                        </div>
                                                        {appt.notes && (
                                                            <div className="mt-1.5 px-2.5 py-1 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-500/30 rounded-lg text-[10px] font-semibold text-info-700 dark:text-info-400">
                                                                📅 {appt.notes}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 hidden sm:table-cell">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                                                                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                                            </div>
                                                            <span className="font-bold text-neutral-700 dark:text-neutral-300">
                                                                {(appt.agentId || appt.doctorId)?.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2.5 py-1 text-[10px] uppercase tracking-widest font-black rounded-md shadow-sm border ${appt.status === 'scheduled' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-400' :
                                                            'bg-neutral-50 border-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400'
                                                            }`}>
                                                            {appt.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {appt.status === 'scheduled' ? (
                                                            <button
                                                                onClick={() => markArrived(appt._id)}
                                                                className="px-4 py-2 border border-success-200 dark:border-success-500/30 bg-success-50 dark:bg-success-500/10 hover:bg-success-100 dark:hover:bg-success-500/20 text-success-600 dark:text-success-400 font-bold rounded-lg transition-colors flex items-center gap-2 ml-auto text-xs"
                                                                title="Mark as Arrived"
                                                            >
                                                                <CheckCircle className="w-3.5 h-3.5" /> Mark Arrived
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500">
                                                                Added to Queue
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
