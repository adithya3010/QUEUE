"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import api from '@/services/api';
import ThemeToggle from "@/components/ThemeToggle";

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address');
            setIsLoading(false);
            return;
        }

        try {
            const response = await api.post('/auth/forgot-password', { email });
            setMessage(response.data.message);
            setIsSuccess(true);
            setEmail('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex justify-center items-center p-6 relative
      bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200
      dark:from-dark-bg dark:via-[#020617] dark:to-[#001d3d] transition-colors duration-500 overflow-hidden">

            <div className="absolute top-6 right-6 z-50"><ThemeToggle /></div>

            <div className="absolute w-96 h-96 bg-primary-500/20 blur-[140px] rounded-full top-10 left-10"></div>
            <div className="absolute w-96 h-96 bg-light-blue-400/20 blur-[140px] rounded-full bottom-10 right-10"></div>

            <div className="relative w-full max-w-[420px]
        bg-white/80 dark:bg-white/5 backdrop-blur-2xl
        border border-black/5 dark:border-white/10
        shadow-2xl
        rounded-3xl p-8 animate-fadeIn">

                <div>
                    <h2 className="text-3xl font-extrabold text-center
            bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        Forgot Password
                    </h2>
                    <p className="mt-3 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                        Enter your email address and we'll send you a link to reset your password
                    </p>
                </div>

                {isSuccess ? (
                    <div className="mt-6 rounded-2xl bg-green-50 dark:bg-green-900/20 p-5 border border-green-200 dark:border-green-800/30">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-bold text-green-800 dark:text-green-400">Email Sent</h3>
                                <p className="mt-1 text-sm text-green-700 dark:text-green-300 font-medium">{message}</p>
                            </div>
                        </div>
                        <div className="mt-6 text-center">
                            <Link href="/login" className="font-bold text-primary-600 dark:text-light-blue-400 hover:underline">
                                Return to Login
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                        {error && (
                            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800/30">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-semibold text-red-800 dark:text-red-400">{error}</h3>
                                    </div>
                                </div>
                            </div>
                        )}

                        {message && !isSuccess && (
                            <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 p-4 border border-primary-200 dark:border-primary-800/30">
                                <p className="text-sm font-medium text-primary-700 dark:text-cyan-300">{message}</p>
                            </div>
                        )}

                        <div>
                            <input
                                name="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-4 rounded-xl
                  bg-white dark:bg-black/20 
                  border border-gray-200 dark:border-white/10 
                  text-gray-900 dark:text-white
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                placeholder="Email address"
                                disabled={isLoading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl font-bold text-lg
                bg-gradient-to-r from-primary-600 to-light-blue-500 hover:from-primary-500 hover:to-light-blue-400
                text-white shadow-xl shadow-primary-500/20 dark:shadow-primary-900/40
                hover:scale-[1.02] hover:shadow-2xl active:scale-95
                transition-all duration-300 disabled:opacity-70 disabled:pointer-events-none flex justify-center items-center"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Sending...
                                </>
                            ) : (
                                'Send Reset Link'
                            )}
                        </button>

                        <div className="text-center mt-4">
                            <Link href="/login" className="text-sm font-bold text-primary-600 dark:text-light-blue-400 hover:underline">
                                Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
