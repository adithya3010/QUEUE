import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api",
    withCredentials: true
});

// Flag to prevent multiple simultaneous refresh requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Don't retry for auth endpoints (login, logout, refresh) or if no refresh path
            if (
                originalRequest.url?.includes('/auth/login') ||
                originalRequest.url?.includes('/auth/logout') ||
                originalRequest.url?.includes('/auth/refresh')
            ) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // If a refresh is already in progress, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => {
                        return api(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt to refresh the token
                await axios.post(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api"}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                // Token refreshed successfully, process queued requests
                processQueue(null);
                isRefreshing = false;

                // Retry the original request
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed, clear queue and redirect to login
                processQueue(refreshError, null);
                isRefreshing = false;

                // Clear localStorage and redirect to login
                if (typeof window !== "undefined") {
                    localStorage.clear();
                    window.location.href = '/';
                }

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
