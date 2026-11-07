
import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Read a JavaScript-accessible CSRF cookie.
// Never attempt to read the HttpOnly authentication cookie.
function getCookie(name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${escapedName}=([^;]*)`)
  );

  return match ? decodeURIComponent(match[1]) : null;
}

// Attach CSRF token to state-changing requests.
api.interceptors.request.use(
  (config) => {
    const method = (config.method || "get").toLowerCase();

    const isStateChanging = [
      "post",
      "put",
      "patch",
      "delete",
    ].includes(method);

    if (isStateChanging) {
      const csrfToken =
        sessionStorage.getItem("csrf_token") ||
        getCookie("x-csrf-token") ||
        getCookie("_csrf") ||
        getCookie("csrfToken");

      if (csrfToken) {
        if (typeof config.headers?.set === "function") {
          config.headers.set("X-CSRF-Token", csrfToken);
        } else {
          config.headers = config.headers || {};
          config.headers["X-CSRF-Token"] = csrfToken;
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Backend must provide GET /api/csrf
// Response format: { csrfToken: "..." }
export const fetchFreshCsrfToken = async () => {
  try {
    const response = await api.get("/csrf");

    const token = response.data?.csrfToken;

    if (typeof token !== "string" || token.length === 0) {
      throw new Error(
        "The CSRF endpoint did not return a valid token."
      );
    }

    sessionStorage.setItem("csrf_token", token);

    return token;
  } catch (error) {
    console.error(
      "Unable to obtain CSRF token:",
      error.response?.data || error.message
    );

    sessionStorage.removeItem("csrf_token");

    throw error;
  }
};

export const refreshCsrfToken = fetchFreshCsrfToken;

export default api;
