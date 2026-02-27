"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loader from "./Loader";
import api from "@/services/api";

export default function ProtectedRoute({ children }) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const userId = localStorage.getItem("userId") || localStorage.getItem("doctorId");

        if (userId) {
            // Already authenticated via localStorage (email/password login)
            setIsAuthenticated(true);
            return;
        }

        // No localStorage entry — might be a Google OAuth user.
        // Verify via cookie-based auth by calling /auth/me
        api.get("/auth/me")
            .then((res) => {
                const user = res.data;
                // Persist to localStorage so subsequent checks are instant
                if (user?.id) {
                    localStorage.setItem("userId", user.id);
                    localStorage.setItem("role", user.role);
                }
                setIsAuthenticated(true);
            })
            .catch(() => {
                router.push("/login");
            });
    }, [router]);

    if (!isAuthenticated) return <Loader />;

    return <>{children}</>;
}
