import axios from "axios";

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
    },
    timeout: 15000,
});

// ── Request interceptor (e.g. attach JWT later) ──
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ── Response interceptor (normalise errors) ──
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const message =
                typeof error.response.data === "string"
                    ? error.response.data
                    : error.response.data?.message ?? "Đã xảy ra lỗi từ máy chủ.";

            return Promise.reject({ message, status: error.response.status });
        }

        if (error.request) {
            return Promise.reject({
                message: "Không thể kết nối đến máy chủ. Vui lòng thử lại.",
                status: 0,
            });
        }

        return Promise.reject({ message: error.message, status: 0 });
    },
);

export default apiClient;
