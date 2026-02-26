// @ts-ignore
import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // New Brand Colors (Professional Blue)
                brand: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb', // Light Mode Primary
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                    950: '#172554',
                },
                // Semantic Colors
                success: {
                    50: '#f0fdf4',
                    100: '#dcfce7',
                    300: '#86efac',
                    400: '#4ade80',
                    500: '#10b981', // Primary Success
                    600: '#059669',
                    700: '#047857',
                },
                danger: {
                    50: '#fef2f2',
                    100: '#fee2e2',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#ef4444', // Primary Danger
                    600: '#dc2626',
                    700: '#b91c1c',
                },
                warning: {
                    50: '#fffbeb',
                    100: '#fef3c7',
                    300: '#fcd34d',
                    400: '#fbbf24',
                    500: '#f59e0b', // Primary Warning
                    600: '#d97706',
                    700: '#b45309',
                },
                info: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9', // Primary Info
                    600: '#0284c7',
                    700: '#0369a1',
                },
                // Neutral Grayscale
                neutral: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                }
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
            keyframes: {
                scrolling: {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(-100%)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInDown: {
                    '0%': { opacity: '0', transform: 'translateY(-20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                zoomIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                }
            },
            animation: {
                scrolling: 'scrolling 30s linear infinite',
                fadeIn: 'fadeIn 0.5s ease-out',
                fadeInDown: 'fadeInDown 0.5s ease-out',
                slideUp: 'slideUp 0.5s ease-out',
                zoomIn: 'zoomIn 0.3s ease-out',
            }
        },
    },
    // Required to enable the 'dark:' variants for Tailwind
    darkMode: 'class',
    plugins: [],
};

export default config;
