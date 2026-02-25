"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import api from "@/services/api";

export default function AdminNavbar() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await api.post("/admin/auth/logout");
            localStorage.removeItem("adminId");
            localStorage.removeItem("adminName");
            localStorage.removeItem("hospitalId");
            router.push("/developer/login");
        } catch (err) {
            console.error(err);
        }
    };

    const navLinks = [
        { name: "Portal", path: "/developer" },
        { name: "Team", path: "/developer/team" },
        { name: "Analytics", path: "/developer/analytics" }
    ];

    const isAuthPage = pathname === "/developer/login" || pathname === "/developer/signup";

    return (
        <div
            className="
      fixed top-0 left-0 w-full z-50
      bg-dark-bg/80 backdrop-blur-xl
      border-b border-white/20
      shadow-[0_10px_40px_rgba(0,0,0,0.4)]
      px-6 py-4 flex justify-between items-center
    "
        >
            <h1 className="font-extrabold text-2xl
        bg-gradient-to-r from-purple-400 via-fuchsia-500 to-pink-500
        bg-clip-text text-transparent tracking-wide">
                Smart Queue QaaS Admin
            </h1>

            {!isAuthPage && (
                <div className="hidden md:flex gap-10 text-gray-200 font-medium items-center">
                    {navLinks.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                href={item.path}
                                className={`
                    relative group
                    hover:text-fuchsia-300 transition
                    ${isActive ? "text-fuchsia-400" : ""}
                `}
                            >
                                {item.name}
                                <span
                                    className={`
                    absolute left-0 -bottom-1 h-[2px]
                    bg-gradient-to-r from-fuchsia-400 to-pink-500
                    transition-all duration-300
                    ${isActive ? "w-full" : "w-0 group-hover:w-full"}
                    `}
                                ></span>
                            </Link>
                        );
                    })}
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white font-bold transition-colors"
                    >
                        Logout
                    </button>
                </div>
            )}

            {!isAuthPage && (
                <button
                    className="md:hidden text-3xl text-white"
                    onClick={() => setOpen(!open)}
                >
                    {open ? "✖" : "☰"}
                </button>
            )}

            {open && (
                <div
                    className="
          absolute top-[68px] left-0 w-full
          bg-dark-bg/95 backdrop-blur-2xl
          border-t border-white/10
          shadow-lg animate-fadeIn md:hidden
        "
                >
                    <div className="flex flex-col text-center py-5 gap-4 text-gray-200">
                        {navLinks.map((item) => {
                            const isActive = pathname === item.path;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.path}
                                    onClick={() => setOpen(false)}
                                    className={`
                    relative group
                    hover:text-fuchsia-300 transition text-lg
                    ${isActive ? "text-fuchsia-400" : ""}
                  `}
                                >
                                    {item.name}
                                    <span
                                        className={`
                      block mx-auto h-[2px]
                      bg-gradient-to-r from-fuchsia-400 to-pink-500
                      transition-all duration-300
                      ${isActive ? "w-1/2" : "w-0 group-hover:w-1/2"}
                    `}
                                    ></span>
                                </Link>
                            );
                        })}
                        <button
                            onClick={handleLogout}
                            className="mt-4 px-4 py-2 w-1/2 mx-auto bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white font-bold transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
