import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../lib/http";

const CouponSection = ({ token, eventId, couponHook, compact = false }) => {
  const { applied, discount, loading, error, apply, remove } = couponHook;
  const [inputCode, setInputCode] = useState("");
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    if (!token || !eventId) return;
    axios.get(`${API_BASE}/coupons/available`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { eventId, totalAmount: 999999 },
    })
      .then(r => { if (r.data.success) setOffers(r.data.coupons || []); })
      .catch(() => {});
  }, [token, eventId]);

  useEffect(() => { if (!applied) setInputCode(""); }, [applied]);

  return (
    <div style={{ marginBottom: compact ? 12 : 16 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8, display: "block" }}>
        Coupon Code
      </label>

      {/* ── Applied state ── */}
      {applied ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "2px solid #16a34a", borderRadius: 12 }}>
          <svg width="20" height="20" fill="none" stroke="#16a34a" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#15803d", fontFamily: "monospace", letterSpacing: "0.08em" }}>
                {applied.coupon?.code}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", background: "#16a34a", color: "#fff", borderRadius: 20 }}>
                {applied.coupon?.discountType === "percentage"
                  ? `${applied.coupon.discountValue}% OFF`
                  : `₹${applied.coupon?.discountValue} OFF`}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#16a34a", marginTop: 2 }}>
              You save ₹{discount.toLocaleString("en-IN")}
            </div>
          </div>
          <button
            type="button"
            onClick={remove}
            style={{ fontSize: 11, color: "#dc2626", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 700, flexShrink: 0 }}
          >
            Remove
          </button>
        </div>
      ) : (
        <>
          {/* ── Input row ── */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); apply(inputCode); } }}
              placeholder="Enter coupon code"
              disabled={loading}
              style={{
                flex: 1, padding: compact ? "8px 12px" : "10px 14px",
                border: `1.5px solid ${error ? "#ef4444" : "#e2e8f0"}`,
                borderRadius: 10, fontSize: 13, outline: "none",
                background: error ? "#fef2f2" : "#f8fafc",
                fontWeight: 600, letterSpacing: "0.06em", boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => apply(inputCode)}
              disabled={loading || !inputCode.trim()}
              style={{
                padding: compact ? "0 14px" : "0 18px",
                background: loading ? "#93c5fd" : "#2563eb",
                color: "#fff", border: "none", borderRadius: 10,
                fontSize: 13, fontWeight: 700,
                cursor: loading || !inputCode.trim() ? "not-allowed" : "pointer",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              {loading ? "..." : "Apply"}
            </button>
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, marginTop: 6 }}>
              <svg width="13" height="13" fill="none" stroke="#ef4444" strokeWidth="2.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 500 }}>{error}</span>
            </div>
          )}

          {/* ── Coupon cards — all look the same ── */}
          {offers.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              {offers.slice(0, 6).map(c => {
                const discLabel = c.discountType === "percentage"
                  ? `${c.discountValue}% OFF`
                  : `₹${c.discountValue} OFF`;

                return (
                  <button
                    key={c._id}
                    type="button"
                    disabled={loading}
                    onClick={() => { if (!loading) apply(c.code); }}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "flex-start",
                      padding: "10px 12px", borderRadius: 10, textAlign: "left",
                      cursor: loading ? "not-allowed" : "pointer",
                      border: "1.5px dashed #cbd5e1",
                      background: "#f8fafc",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => {
                      if (!loading) {
                        e.currentTarget.style.borderColor = "#2563eb";
                        e.currentTarget.style.background = "#eff6ff";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!loading) {
                        e.currentTarget.style.borderColor = "#cbd5e1";
                        e.currentTarget.style.background = "#f8fafc";
                      }
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: "#2563eb", color: "#fff", marginBottom: 5 }}>
                      {discLabel}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "monospace", letterSpacing: "0.08em", color: "#0f172a" }}>
                      {c.code}
                    </span>
                    {(c.description || c.minAmount > 0) && (
                      <span style={{ fontSize: 10, color: "#64748b", marginTop: 3, lineHeight: 1.4 }}>
                        {c.description || `Min ₹${c.minAmount?.toLocaleString("en-IN")}`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CouponSection;
