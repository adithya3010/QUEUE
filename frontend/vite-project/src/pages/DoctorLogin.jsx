import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { setUser } from "../utils/sentry";

export default function DoctorLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");

  const handleChange = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", form);
      localStorage.setItem("doctorId", res.data.doctor.id);

      // Set user context for Sentry error tracking
      setUser(res.data.doctor);

      setMsg("Login Successful 🎉 Redirecting...");
      setTimeout(() => navigate("/reception"), 800);
    } catch (err) {
      setMsg(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen 
      bg-gradient-to-br from-[#0f172a] via-[#020617] to-[#001d3d]
      flex justify-center items-center p-6 relative">

    
      <div className="absolute w-96 h-96 bg-blue-500/20 blur-[140px] rounded-full top-10 left-10"></div>
      <div className="absolute w-96 h-96 bg-cyan-400/20 blur-[140px] rounded-full bottom-10 right-10"></div>

      <div className="relative w-[400px]
        bg-white/10 backdrop-blur-xl
        border border-white/20
        shadow-[0_25px_60px_rgba(0,0,0,0.4)]
        rounded-3xl p-8 animate-fadeIn">

        <h2 className="text-3xl font-extrabold text-center
          bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Doctor Login
        </h2>

        {msg && (
          <p className="mt-3 text-sm text-blue-300 bg-white/10 border border-white/20
            p-2 rounded text-center">
            {msg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full p-3 rounded-xl
              bg-white/10 border border-white/20 text-white
              placeholder-gray-300
              focus:ring-2 focus:ring-cyan-400 outline-none"
            required
            pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
            title="Enter a valid email like example@gmail.com"
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            onChange={handleChange}
            className="w-full p-3 rounded-xl
              bg-white/10 border border-white/20 text-white
              placeholder-gray-300
              focus:ring-2 focus:ring-cyan-400 outline-none"
            required
          />

          <button
            className="w-full py-3 rounded-xl font-semibold
              bg-gradient-to-r from-blue-500 to-cyan-400
              text-white shadow-lg shadow-blue-900/40
              hover:scale-[1.04] hover:shadow-xl
              transition-all duration-300">
            Login
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link
            to="/forgot-password"
            className="text-sm text-cyan-300 hover:text-cyan-200 underline"
          >
            Forgot Password?
          </Link>
        </div>

        <p className="mt-4 text-sm text-center text-gray-300">
          Don’t have an account?{" "}
          <Link className="text-cyan-300 underline hover:text-cyan-200" to="/signup">
            Signup
          </Link>
        </p>
      </div>
    </div>
  );
}
