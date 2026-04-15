import axios from "axios";

// Auto-detect: if browser is on localhost use localhost backend,
// otherwise use the network IP (for mobile access on same WiFi)
const isLocalhost = typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export const API_BASE = isLocalhost
  ? (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1")
  : "http://192.168.1.6:5000/api/v1";

// Enable credentials globally
axios.defaults.withCredentials = true;

export const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});
