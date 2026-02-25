"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import anime from "animejs";

export default function AnimatedHero() {
    const titleRef = useRef(null);
    const cardsRef = useRef(null);

    useEffect(() => {
        // Reveal animation using Anime.js
        const timeline = anime.timeline({
            easing: 'easeOutExpo',
        });

        timeline
            .add({
                targets: '.hero-title span',
                translateY: [50, 0],
                opacity: [0, 1],
                delay: anime.stagger(100),
                duration: 1200,
            })
            .add({
                targets: '.hero-desc',
                translateY: [20, 0],
                opacity: [0, 1],
                duration: 800,
            }, '-=800')
            .add({
                targets: '.feature-card',
                translateY: [40, 0],
                opacity: [0, 1],
                delay: anime.stagger(150),
                duration: 1000,
            }, '-=600')
            .add({
                targets: '.cta-buttons button, .cta-buttons a',
                scale: [0.9, 1],
                opacity: [0, 1],
                delay: anime.stagger(100),
                duration: 800,
            }, '-=800');

    }, []);

    return (
        <div className="relative max-w-5xl w-full 
        bg-white/40 dark:bg-black/40 backdrop-blur-2xl 
        border border-black/10 dark:border-white/10 
        shadow-[0_25px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)]
        rounded-[2.5rem] p-8 md:p-14 z-10 transition-colors duration-500">

            <h1 ref={titleRef} className="hero-title text-5xl md:text-7xl font-extrabold text-center tracking-tight flex flex-wrap justify-center gap-x-4">
                <span className="bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent inline-block opacity-0">Smart</span>
                <span className="bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent inline-block opacity-0">Hospital</span>
                <span className="bg-gradient-to-r from-primary-600 to-cyan-500 dark:from-primary-400 dark:to-cyan-300 bg-clip-text text-transparent inline-block opacity-0">Queue</span>
                <span className="block w-full mt-2 text-xl md:text-3xl font-medium text-gray-600 dark:text-gray-300 opacity-0">Management System</span>
            </h1>

            <p className="hero-desc mt-6 text-xl text-gray-600 dark:text-gray-300 text-center leading-relaxed max-w-3xl mx-auto opacity-0 font-light">
                Reduce crowding, improve patient trust, real‑time updates,
                doctor control & transparent queue experience — all in one elegant system.
            </p>

            <div ref={cardsRef} className="mt-14 grid md:grid-cols-3 gap-6">
                {[
                    { title: "Real‑time Queue", desc: "Live tracking, ETA & Top‑3 alerts", color: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30" },
                    { title: "Doctor Control", desc: "Availability + Break + Pause system", color: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
                    { title: "Secure History", desc: "Records + filters + secure logs", color: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30" },
                ].map((feat, idx) => (
                    <div key={idx} className={`feature-card bg-white/50 dark:bg-black/50 border ${feat.border} backdrop-blur-xl 
          p-8 rounded-3xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 opacity-0 group`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-gray-100 dark:bg-white/5 group-hover:scale-110 transition-transform ${feat.color}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className={`font-bold text-xl mb-2 text-gray-900 dark:text-white`}>{feat.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">
                            {feat.desc}
                        </p>
                    </div>
                ))}
            </div>

            <div className="cta-buttons mt-14 flex flex-col sm:flex-row gap-5 justify-center opacity-100">
                <Link
                    href="/signup"
                    className="opacity-0 px-10 py-4 rounded-full text-center font-bold text-lg
          bg-gradient-to-r from-primary-600 to-cyan-500 hover:from-primary-500 hover:to-cyan-400
          text-white shadow-xl shadow-primary-500/30 dark:shadow-primary-900/40
          hover:scale-[1.05] hover:shadow-2xl transition-all duration-300">
                    Get Started Free
                </Link>
                <Link
                    href="/login"
                    className="opacity-0 px-10 py-4 rounded-full text-center font-bold text-lg
          border-2 border-gray-300 dark:border-white/20 text-gray-800 dark:text-white
          hover:bg-gray-100 dark:hover:bg-white/10 hover:scale-[1.05]
          transition-all duration-300">
                    Doctor Login
                </Link>
            </div>

            <p className="mt-10 text-center text-gray-500 dark:text-gray-400 text-sm font-medium tracking-wide">
                Built for hospitals to be efficient, transparent & stress‑free.
            </p>
        </div>
    );
}
