import axios from "axios";

// Uses VITE_API_URL from .env — works for both localhost and mobile (network IP)
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

// Enable credentials globally for all axios requests
axios.defaults.withCredentials = true;

export const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});
