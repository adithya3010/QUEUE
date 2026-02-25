"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/services/api';
import ThemeToggle from "@/components/ThemeToggle";

export default function ResetPassword() {
    const { token } = useParams();
    const router = useRouter();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            await api.post(`/auth/reset-password/${token}`, { password });
            setIsSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset. Link invalid or expired.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen flex justify-center items-center p-6 relative
        bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200
        dark:from-dark-bg dark:via-[#020617] dark:to-[#001d3d] transition-colors duration-500 overflow-hidden">

                <div className="absolute top-6 right-6 z-50"><ThemeToggle /></div>

                <div className="relative w-full max-w-[420px] bg-white/80 dark:bg-white/5 backdrop-blur-2xl border border-black/5 dark:border-white/10 shadow-2xl rounded-3xl p-8 animate-fadeIn text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <svg className="h-8 w-8 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Password Reset Successful</h3>
                    <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Redirecting to login...
                    </p>
                    <div className="mt-8">
                        <Link href="/login" className="font-bold text-primary-600 dark:text-cyan-400 hover:underline">Go to Login Now</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex justify-center items-center p-6 relative
      bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200
      dark:from-dark-bg dark:via-[#020617] dark:to-[#001d3d] transition-colors duration-500 overflow-hidden">

            <div className="absolute top-6 right-6 z-50"><ThemeToggle /></div>

            <div className="absolute w-96 h-96 bg-primary-500/20 blur-[140px] rounded-full top-10 left-10"></div>
            <div className="absolute w-96 h-96 bg-cyan-400/20 blur-[140px] rounded-full bottom-10 right-10"></div>

            <div className="relative w-full max-w-[420px]
        bg-white/80 dark:bg-white/5 backdrop-blur-2xl
        border border-black/5 dark:border-white/10
        shadow-2xl
        rounded-3xl p-8 animate-fadeIn">

                <div>
                    <h2 className="text-3xl font-extrabold text-center
            bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        Reset Password
                    </h2>
                    <p className="mt-3 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                        Enter your new password below
                    </p>
                </div>

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

                    <div className="space-y-4">
                        <div>
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-4 rounded-xl
                  bg-white dark:bg-black/20 
                  border border-gray-200 dark:border-white/10 
                  text-gray-900 dark:text-white
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                placeholder="New Password (min 8 char)"
                                disabled={isLoading}
                                minLength={8}
                            />
                        </div>

                        <div>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-4 rounded-xl
                  bg-white dark:bg-black/20 
                  border border-gray-200 dark:border-white/10 
                  text-gray-900 dark:text-white
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                placeholder="Confirm password"
                                disabled={isLoading}
                                minLength={8}
                            />
                        </div>
                    </div>

                    <div className="flex items-center px-2">
                        <input
                            id="show-password"
                            name="show-password"
                            type="checkbox"
                            checked={showPassword}
                            onChange={(e) => setShowPassword(e.target.checked)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                        />
                        <label htmlFor="show-password" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                            Show password
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl font-bold text-lg
              bg-gradient-to-r from-primary-600 to-cyan-500 hover:from-primary-500 hover:to-cyan-400
              text-white shadow-xl shadow-primary-500/20 dark:shadow-primary-900/40
              hover:scale-[1.02] hover:shadow-2xl active:scale-95
              transition-all duration-300 disabled:opacity-70 flex justify-center items-center"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Resetting...
                            </>
                        ) : (
                            'Reset Password'
                        )}
                    </button>

                    <div className="text-center mt-4">
                        <Link href="/login" className="text-sm font-bold text-primary-600 dark:text-cyan-400 hover:underline">
                            Back to Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
