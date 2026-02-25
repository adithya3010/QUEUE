"use client";

import React from 'react';

export default function Loader() {
    return (
        <div className="min-h-screen flex items-center justify-center
    bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200
    dark:from-dark-bg dark:via-[#020617] dark:to-[#001d3d] z-50">

            <div className="relative">
                <div className="w-16 h-16 border-4 border-primary-500 dark:border-cyan-400 border-t-transparent 
        rounded-full animate-spin"></div>

                <p className="mt-4 text-gray-700 dark:text-gray-300 text-center tracking-wider font-semibold">
                    Loading…
                </p>
            </div>

        </div>
    );
}
