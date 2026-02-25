"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Loader from "./Loader";

export default function AdminProtectedRoute({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const isAuthPage = pathname === "/developer/login" || pathname === "/developer/signup";
        const adminId = localStorage.getItem("adminId");

        if (isAuthPage) {
            if (adminId) {
                router.push("/developer");
            } else {
                setIsAuthenticated(true);
            }
            return;
        }

        if (!adminId) {
            router.push("/developer/login");
        } else {
            setIsAuthenticated(true);
        }
    }, [router, pathname]);

    if (!isAuthenticated) return <Loader />;

    return <>{children}</>;
}
