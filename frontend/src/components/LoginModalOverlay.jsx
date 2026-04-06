import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { API_BASE } from "../lib/http";

const LoginModalOverlay = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/auth/login`,
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data.success) {
        toast.success("Login successful!");
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setEmail("");
        setPassword("");
        onLoginSuccess?.();
        onClose();
      }
    } catch (error) {
      const msg = error?.response?.data?.message || "Login failed";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      zIndex: 10001,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "32px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#1f2937", margin: 0 }}>Login</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#6b7280"
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
                outline: "none"
              }}
              onFocus={(e) => e.target.style.borderColor = "#a2783a"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
                outline: "none"
              }}
              onFocus={(e) => e.target.style.borderColor = "#a2783a"}
              onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: "12px",
              backgroundColor: isLoading ? "#d1d5db" : "#a2783a",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: isLoading ? "not-allowed" : "pointer",
              marginTop: "8px"
            }}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={{ fontSize: "14px", color: "#6b7280", textAlign: "center", marginTop: "16px" }}>
          Don't have an account?{" "}
          <a href="/register" style={{ color: "#a2783a", textDecoration: "none", fontWeight: "600" }}>
            Register here
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginModalOverlay;
