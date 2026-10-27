import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true, // Sends HttpOnly session cookies automatically
});

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
  return match ? decodeURIComponent(match[3]) : null;
}

// Attach Temporary JWT and CSRF Token to state-changing requests
api.interceptors.request.use(
  (config) => {
    // 1. Attach JWT if temporary token is saved in sessionStorage
    const tempJwt = sessionStorage.getItem("temp_jwt");
    if (tempJwt && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${tempJwt}`;
    }

    // 2. Attach CSRF token
    let csrfToken = sessionStorage.getItem("csrf_token");
    if (!csrfToken) {
      csrfToken = getCookie("x-csrf-token") || getCookie("_csrf") || getCookie("csrfToken");
    }

    if (csrfToken) {
      config.headers["x-csrf-token"] = csrfToken;
      config.headers["x-xsrf-token"] = csrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Fetch a fresh CSRF token
export const fetchFreshCsrfToken = async (customHeaders = {}) => {
  try {
    const res = await api.get("/csrf-token", { headers: customHeaders });
    const token = res.data?.csrfToken || res.data?.token;
    if (token) {
      sessionStorage.setItem("csrf_token", token);
      return token;
    }
  } catch (err) {
    console.warn("CSRF token fetch warning:", err.response?.data || err.message);
  }
  return null;
};

// Alias export to satisfy Login.jsx without breaking Register.jsx
export const refreshCsrfToken = fetchFreshCsrfToken;

export default api;