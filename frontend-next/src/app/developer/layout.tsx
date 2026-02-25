import AdminNavbar from "@/components/AdminNavbar";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";

export default function DeveloperLayout({ children }) {
    return (
        <AdminProtectedRoute>
            <AdminNavbar />
            <div className="pt-24 min-h-screen bg-gradient-to-br from-dark-bg via-[#0b1021] to-[#110c21]">
                {children}
            </div>
        </AdminProtectedRoute>
    );
}
