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
                // Custom Brand Colors - Change here to update entire site
                primary: {
                    DEFAULT: '#0B8FAC',
                    50: '#E6F7FB',
                    100: '#CCF0F7',
                    200: '#99E0EF',
                    300: '#66D1E7',
                    400: '#33C1DF',
                    500: '#0B8FAC',
                    600: '#097289',
                    700: '#075667',
                    800: '#053944',
                    900: '#021D22',
                },
                secondary: {
                    DEFAULT: '#7BC1B7',
                    50: '#F0FAF8',
                    100: '#E1F5F2',
                    200: '#C3EBE5',
                    300: '#A5E1D8',
                    400: '#87D7CB',
                    500: '#7BC1B7',
                    600: '#5FA9A0',
                    700: '#4A8278',
                    800: '#355C55',
                    900: '#1F3533',
                },
                light: {
                    DEFAULT: '#D2EBE7',
                    50: '#F9FDFC',
                    100: '#F3FAF9',
                    200: '#E7F5F3',
                    300: '#DBF0ED',
                    400: '#D2EBE7',
                    500: '#B8DDD7',
                    600: '#9ECFC7',
                    700: '#84C1B7',
                    800: '#6AB3A7',
                    900: '#50A597',
                },
                'light-blue': {
                    DEFAULT: '#8ED7F0',
                    50: '#F4FBFE',
                    100: '#E9F7FD',
                    200: '#D3EFFB',
                    300: '#BDE7F9',
                    400: '#A7DFF7',
                    500: '#8ED7F0',
                    600: '#6BCDE9',
                    700: '#48C3E2',
                    800: '#25B9DB',
                    900: '#1E95B0',
                },
                success: {
                    DEFAULT: '#129820',
                    50: '#E8F7EA',
                    100: '#D1EFD5',
                    200: '#A3DFAB',
                    300: '#75CF81',
                    400: '#47BF57',
                    500: '#129820',
                    600: '#0F7A1A',
                    700: '#0B5C13',
                    800: '#083D0D',
                    900: '#041F06',
                },
                // Keep dark mode colors
                'dark-bg': '#060c21',
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
    plugins: [],
};

export default config;
