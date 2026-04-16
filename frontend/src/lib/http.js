import axios from "axios";

// Dynamically use the same host the browser is connecting to.
// Works for localhost, network IP (192.168.x.x), and any other host.
const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

export const API_BASE = isLocalhost
  ? (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1")
  : `http://${hostname}:5000/api/v1`;

// Enable credentials globally
axios.defaults.withCredentials = true;

export const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});
