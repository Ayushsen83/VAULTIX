import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true,
});

function getCookie(name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

// Attach CSRF token to state-changing requests.
// Authentication is handled by the HttpOnly cookie, not a Bearer token.
api.interceptors.request.use(
  (config) => {
    const method = (config.method || "get").toLowerCase();
    const isStateChanging = ["post", "put", "patch", "delete"].includes(method);

    if (isStateChanging) {
      const csrfToken =
        sessionStorage.getItem("csrf_token") ||
        getCookie("x-csrf-token") ||
        getCookie("_csrf") ||
        getCookie("csrfToken");

      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Fetch a fresh CSRF token.
// Assumes backend mounts GET /token at /api/csrf.
export const fetchFreshCsrfToken = async () => {
  try {
    const res = await api.get("/csrf");

    const token = res.data?.csrfToken;

    if (typeof token === "string" && token.length > 0) {
      sessionStorage.setItem("csrf_token", token);
      return token;
    }

    console.warn("CSRF endpoint did not return a token.");
    return null;
  } catch (err) {
    console.warn(
      "CSRF token fetch warning:",
      err.response?.data || err.message
    );
    return null;
  }
};

export const refreshCsrfToken = fetchFreshCsrfToken;

export default api;
