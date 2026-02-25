"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    // Highlight active link
    const navLinks = [
        { name: "Reception", path: "/reception" },
        { name: "Doctor", path: "/doctor" },
        { name: "History", path: "/history" }
    ];

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
        bg-gradient-to-r from-cyan-300 via-primary-500 to-emerald-300
        bg-clip-text text-transparent tracking-wide">
                Smart Queue
            </h1>

            <div className="hidden md:flex gap-10 text-gray-200 font-medium">
                {navLinks.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.name}
                            href={item.path}
                            className={`
                relative group
                hover:text-cyan-300 transition
                ${isActive ? "text-cyan-400" : ""}
              `}
                        >
                            {item.name}
                            <span
                                className={`
                  absolute left-0 -bottom-1 h-[2px]
                  bg-gradient-to-r from-cyan-400 to-primary-500
                  transition-all duration-300
                  ${isActive ? "w-full" : "w-0 group-hover:w-full"}
                `}
                            ></span>
                        </Link>
                    );
                })}
            </div>


            <button
                className="md:hidden text-3xl text-white"
                onClick={() => setOpen(!open)}
            >
                {open ? "✖" : "☰"}
            </button>

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
                    hover:text-cyan-300 transition text-lg
                    ${isActive ? "text-cyan-400" : ""}
                  `}
                                >
                                    {item.name}
                                    <span
                                        className={`
                      block mx-auto h-[2px]
                      bg-gradient-to-r from-cyan-400 to-primary-500
                      transition-all duration-300
                      ${isActive ? "w-1/2" : "w-0 group-hover:w-1/2"}
                    `}
                                    ></span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
