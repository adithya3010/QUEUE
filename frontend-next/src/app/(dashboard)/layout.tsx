import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardLayout({ children }) {
    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#060c21] relative overflow-hidden">
                {/* Background Glows */}
                <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-600/20 blur-[150px] rounded-full pointer-events-none" />
                <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-600/20 blur-[150px] rounded-full pointer-events-none" />
                <div className="fixed top-[40%] left-[30%] w-[30%] h-[20%] bg-light-blue-400/10 blur-[150px] rounded-[100%] pointer-events-none" />
                
                <Navbar />
                <div className="relative z-10 pt-20">
                    {children}
                </div>
            </div>
        </ProtectedRoute>
    );
}
