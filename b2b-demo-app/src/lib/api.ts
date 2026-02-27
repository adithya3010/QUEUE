/**
 * API Client for interacting with the Smart-Queue B2B v2 API.
 * This simulates a third-party backend calling Smart-Queue.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api/v2";
const API_KEY = "sq_live_NjlhMWNkMGVmMWNkMmMwZTlhOGQxNGVi_c53734d728f6361c15a565fd16fa09b7d6631c246020088800776db17768eb06";

type FetchOptions = RequestInit & {
    params?: Record<string, string | number | undefined>;
};

async function fetchSQ<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { params, headers, ...rest } = options;

    // Build query string
    let url = `${BASE_URL}${endpoint}`;
    if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) searchParams.append(key, String(value));
        });
        const qs = searchParams.toString();
        if (qs) url += `?${qs}`;
    }

    // Next.js uses server components, so this API Key is kept hidden from the browser
    const reqHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(headers as Record<string, string>),
    };

    if (API_KEY) {
        reqHeaders["x-api-key"] = API_KEY;
    }

    const res = await fetch(url, {
        ...rest,
        headers: reqHeaders,
        // Add cache revalidation depending on the data
        cache: options.method === 'POST' ? 'no-store' : 'no-cache'
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
        throw new Error(data.message || `API Error: ${res.status}`);
    }

    return data;
}

// ─── API Endpoints ─────────────────────────────────────────────────────────

export async function getOrgInfo() {
    return fetchSQ<any>("/info");
}

export async function getServices(locationId?: string) {
    return fetchSQ<any>("/services", { params: { locationId } });
}

export async function getServiceSlots(serviceId: string, date: string) {
    return fetchSQ<any>(`/services/${serviceId}/slots`, { params: { date } });
}

export async function bookAppointment(data: {
    serviceId: string;
    agentId?: string;
    clientName: string;
    clientPhone: string;
    scheduledAt: string;
    notes?: string;
}) {
    return fetchSQ<any>("/appointments/book", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function getQueueStatus(uniqueLinkId: string) {
    return fetchSQ<any>(`/queue/${uniqueLinkId}`);
}

export async function arriveForAppointment(appointmentId: string) {
    return fetchSQ<any>(`/appointments/${appointmentId}/arrive`, {
        method: "PUT"
    });
}
