import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import { setUser } from "../utils/sentry";

export default function DoctorDashboard() {

  const [doctor, setDoctor] = useState(null);
  const [msg, setMsg] = useState("");
  const [avgTime, setAvgTime] = useState("");

  const navigate = useNavigate();

  async function loadDoctor() {
    const res = await api.get("doctors/info");
    setDoctor(res.data);
    setAvgTime(res.data.avgConsultationTime);
  }

  async function updateAvgTime() {
    await api.put("/doctors/update-avg-time", { avgTime });

    setDoctor(prev => ({
      ...prev,
      avgConsultationTime: avgTime
    }));

    setMsg("Average Consultation Time Updated");
    setTimeout(() => setMsg(""), 1500);
  }

  useEffect(() => {
    loadDoctor();
  }, []);

  async function changeAvailability(state) {
    await api.put("/doctors/availability", { availability: state });

    setDoctor(prev => ({ ...prev, availability: state }));

    setMsg(`Availability set to ${state}`);
    setTimeout(() => setMsg(""), 1500);
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Clear localStorage regardless of API call success
      localStorage.removeItem("doctorId");
      // Clear any other stored data
      localStorage.clear();

      // Clear user context from Sentry
      setUser(null);

      navigate("/");
    }
  }

  if (!doctor) return <Loader />;

  return (
    <div className="min-h-screen w-full overflow-x-hidden
    relative 
    flex justify-center items-center
    bg-gradient-to-br from-[#0f172a] via-[#020617] to-[#001d3d] p-6">

  
      <div className="absolute w-96 h-96 bg-blue-500/20 blur-[140px] rounded-full top-10 left-10"></div>
      <div className="absolute w-96 h-96 bg-cyan-400/20 blur-[140px] rounded-full bottom-10 right-10"></div>

      <div className="relative w-full max-w-[420px]
        bg-white/10 backdrop-blur-xl
        border border-white/20
        shadow-[0_25px_60px_rgba(0,0,0,0.4)]
        rounded-3xl p-8 animate-fadeIn mt-12">

        <h2 className="text-3xl font-extrabold text-center
        bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Doctor Dashboard
        </h2>

        {msg && (
          <p className="mt-3 text-center bg-blue-100/20 text-cyan-300
          border border-white/20 py-2 rounded-lg text-sm animate-fadeIn">
            {msg}
          </p>
        )}


        <div className="mt-5 bg-white/10 border border-white/20
        rounded-2xl p-5 shadow">
          <p className="text-gray-200"><b>Name:</b> {doctor.name}</p>
          <p className="text-gray-200"><b>Specialization:</b> {doctor.specialization}</p>
          <p className="text-gray-200"><b>Email:</b> {doctor.email}</p>

          <p className="mt-2 text-gray-200">
            <b>Status:</b>{" "}
            <span className={`
              px-3 py-1 rounded text-white text-sm
              ${doctor.availability === "Available" && "bg-green-600"}
              ${doctor.availability === "Not Available" && "bg-red-600"}
            `}>
              {doctor.availability}
            </span>
          </p>
        </div>


        <div className="mt-4 bg-white/10 border border-white/20 rounded-2xl p-5 shadow">
          <p className="text-gray-200 font-semibold">
            ⏳ Current Average Consultation Time:
          </p>

          <p className="mt-2 text-2xl font-bold text-cyan-300">
            {doctor.avgConsultationTime ? `${doctor.avgConsultationTime} min` : "Not Set"}
          </p>
        </div>

        <h3 className="mt-6 font-semibold text-center text-gray-300">
          Change Availability
        </h3>

        <div className="mt-3 flex gap-2 justify-center flex-wrap">
          {["Available", "Not Available"].map(s => (
            <button
              key={s}
              onClick={() => changeAvailability(s)}
              className={`
                px-5 py-2 rounded-lg text-white transition shadow-lg
                hover:scale-[1.05] active:scale-95

                ${s === "Available" &&
                  "bg-gradient-to-r from-green-500 to-emerald-400 shadow-green-900/40 hover:opacity-90"}

                ${s === "Not Available" &&
                  "bg-gradient-to-r from-red-500 to-red-700 shadow-red-900/40 hover:opacity-90"}

                ${doctor.availability === s && "ring-4 ring-cyan-400/60"}
              `}
            >
              {s}
            </button>
          ))}
        </div>

  
        <h3 className="mt-6 font-semibold text-center text-gray-300">
          Set Average Consultation Time
        </h3>

        <div className="mt-3 flex justify-center gap-2">
          <input
            type="number"
            className="border p-2 rounded w-28 text-center bg-white/10
            border-white/30 text-white"
            value={avgTime}
            onChange={(e) => setAvgTime(e.target.value)}
            min="1"
          />

          <button
            onClick={updateAvgTime}
            className="px-5 py-2 rounded-lg text-white
            bg-gradient-to-r from-blue-500 to-cyan-400
            shadow-blue-900/40 hover:scale-[1.03] transition"
          >
            Update
          </button>
        </div>


        <button
          onClick={logout}
          className="mt-6 w-full
          bg-gradient-to-r from-red-500 to-red-700
          text-white py-3 rounded-xl shadow-md
          hover:scale-[1.03] active:scale-95 transition"
        >
          Logout
        </button>

      </div>
    </div>
  );
}
