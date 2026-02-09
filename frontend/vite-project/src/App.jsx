import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import DoctorLogin from "./pages/DoctorLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ReceptionPanel from "./pages/ReceptionPanel";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientStatusView from "./pages/PatientStatusView";
import HistoryDashboard from "./pages/HistoryDashboard";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

function Layout() {
  const location = useLocation();

  const showNavbar =
    location.pathname.startsWith("/doctor") ||
    location.pathname.startsWith("/reception") ||
    location.pathname.startsWith("/history");

  return (
    <>
      {showNavbar && <Navbar />}

      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<DoctorLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Protected */}
        <Route
          path="/reception"
          element={
            <ProtectedRoute>
              <ReceptionPanel />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor"
          element={
            <ProtectedRoute>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryDashboard />
            </ProtectedRoute>
          }
        />

        {/* Patient Public View */}
        <Route path="/status/:uniqueLinkId" element={<PatientStatusView />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
