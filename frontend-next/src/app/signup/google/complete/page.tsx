import React, { Suspense } from "react";
import GoogleCompleteSignupClient from "./GoogleCompleteSignupClient";

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">Loading...</div>}>
            <GoogleCompleteSignupClient />
        </Suspense>
    );
}
