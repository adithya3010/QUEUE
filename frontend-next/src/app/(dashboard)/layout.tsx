import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardLayout({ children }) {
    return (
        <ProtectedRoute>
            <Navbar />
            <div className="pt-20 min-h-screen bg-gradient-to-br from-dark-bg via-[#020617] to-[#001d3d]">
                {children}
            </div>
        </ProtectedRoute>
    );
}
