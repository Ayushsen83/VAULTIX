
import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api",
  withCredentials: true,
  
});

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
      const csrfToken = sessionStorage.getItem("csrf_token");

      if (csrfToken) {
        config.headers = config.headers || {};

        if (typeof config.headers.set === "function") {
          config.headers.set("X-CSRF-Token", csrfToken);
        } else {
          config.headers["X-CSRF-Token"] = csrfToken;
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Fetch a fresh CSRF token from the backend.
export const fetchFreshCsrfToken = async () => {
  try {
    const response = await api.get("/csrf");

    const token = response.data?.csrfToken;

    if (typeof token !== "string" || !token.length) {
      throw new Error("Invalid CSRF token response.");
    }

    sessionStorage.setItem("csrf_token", token);

    return token;
  } catch (error) {
    sessionStorage.removeItem("csrf_token");

    console.error(
      "CSRF token fetch failed:",
      error.response?.data || error.message
    );

    throw error;
  }
};

export const refreshCsrfToken = fetchFreshCsrfToken;

export default api;
