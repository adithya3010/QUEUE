"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import api from "@/services/api";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  History,
  Stethoscope,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  Activity,
  MonitorSmartphone
} from "lucide-react";

interface NavLink {
  name: string;
  path: string;
  icon: any;
  roles: string[];
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch (err) {
      console.error("Failed to load user:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/admin/logout").catch(() => { });
      await api.post("/auth/logout").catch(() => { });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.clear();
      router.push("/login");
    }
  };

  // Role-based navigation links
  const allNavLinks: NavLink[] = [
    { name: "Admin Dashboard", path: "/admin/dashboard", icon: LayoutDashboard, roles: ["HOSPITAL_ADMIN"] },
    { name: "Analytics", path: "/admin/analytics", icon: Activity, roles: ["HOSPITAL_ADMIN"] },
    { name: "Reception Desk", path: "/reception", icon: ClipboardList, roles: ["RECEPTIONIST"] },
    { name: "Doctor Panel", path: "/doctor", icon: Stethoscope, roles: ["DOCTOR"] },
    { name: "History", path: "/history", icon: History, roles: ["HOSPITAL_ADMIN", "DOCTOR", "RECEPTIONIST"] },
  ];

  // Filter links based on user role
  const navLinks: NavLink[] = user?.role
    ? allNavLinks.filter(link => link.roles.includes(user.role))
    : [];

  // Role-based styling
  const getRoleColor = () => {
    switch (user?.role) {
      case "HOSPITAL_ADMIN":
        return {
          gradient: "from-secondary-400 via-primary-500 to-light-blue-400",
          badge: "bg-gradient-to-r from-secondary-500 to-primary-600",
          icon: Shield,
          hover: "hover:text-secondary-300"
        };
      case "DOCTOR":
        return {
          gradient: "from-light-blue-400 via-primary-500 to-success-400",
          badge: "bg-gradient-to-r from-light-blue-500 to-success-600",
          icon: Stethoscope,
          hover: "hover:text-light-blue-300"
        };
      case "RECEPTIONIST":
        return {
          gradient: "from-primary-400 via-secondary-500 to-light-blue-400",
          badge: "bg-gradient-to-r from-primary-500 to-secondary-600",
          icon: Activity,
          hover: "hover:text-primary-300"
        };
      default:
        return {
          gradient: "from-light-blue-400 to-primary-500",
          badge: "bg-primary-600",
          icon: UserCircle,
          hover: "hover:text-light-blue-300"
        };
    }
  };

  const roleStyle = getRoleColor();
  const RoleIcon = roleStyle.icon;

  if (!user) return null;

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#060c21]/90 backdrop-blur-xl border-b border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-light-blue-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:shadow-primary-500/50 transition-all">
              <MonitorSmartphone className="w-5 h-5 text-white" />
            </div>
            <span className={`font-bold text-xl tracking-tight bg-gradient-to-r ${roleStyle.gradient} bg-clip-text text-transparent`}>
              SmartQueue
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`
                    relative group flex items-center gap-2 font-medium transition-all
                    ${isActive ? `text-light-blue-400` : `text-gray-300 ${roleStyle.hover}`}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                  <span
                    className={`
                      absolute left-0 -bottom-2 h-[2px] rounded-full
                      bg-gradient-to-r ${roleStyle.gradient}
                      transition-all duration-300
                      ${isActive ? "w-full" : "w-0 group-hover:w-full"}
                    `}
                  />
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
              >
                <div className={`w-8 h-8 rounded-lg ${roleStyle.badge} flex items-center justify-center shadow-lg`}>
                  <RoleIcon className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">{user.name}</div>
                  <div className="text-xs text-gray-400">{user.role?.replace("_", " ")}</div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#0a1128] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
                  <div className="p-3 border-b border-white/10">
                    <div className="text-sm font-semibold text-white">{user.name}</div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                    <div className={`inline-block mt-2 px-2 py-1 rounded text-xs font-bold text-white ${roleStyle.badge}`}>
                      {user.role?.replace("_", " ")}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {open ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {open && (
          <div className="md:hidden border-t border-white/10 bg-[#060c21]/95 backdrop-blur-xl">
            <div className="px-4 py-4 space-y-3">
              {/* User Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                <div className={`w-10 h-10 rounded-lg ${roleStyle.badge} flex items-center justify-center shadow-lg`}>
                  <RoleIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{user.name}</div>
                  <div className="text-xs text-gray-400">{user.role?.replace("_", " ")}</div>
                </div>
              </div>

              {/* Navigation Links */}
              {navLinks.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    onClick={() => setOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all
                      ${isActive
                        ? `bg-gradient-to-r ${roleStyle.gradient} text-white shadow-lg`
                        : "text-gray-300 hover:bg-white/5"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Close dropdown when clicking outside */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </nav>
  );
}
