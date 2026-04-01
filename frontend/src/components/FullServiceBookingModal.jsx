import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { API_BASE, authHeaders } from "../lib/http";
import useAuth from "../context/useAuth";
import { toast } from "react-hot-toast";
import { FiX, FiCalendar, FiClock, FiUsers, FiMinus, FiPlus, FiMapPin } from "react-icons/fi";
import { FaRupeeSign, FaCheckCircle, FaStar } from "react-icons/fa";
import PropTypes from "prop-types";

const FullServiceBookingModal = ({ isOpen, onClose, event, onSuccess }) => {
  const { token } = useAuth();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState(1);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [showCouponList, setShowCouponList] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setDate(""); setTime(""); setGuests(1); setNotes(""); setActiveImg(0);
      setLocation(""); setCouponCode(""); setAppliedCoupon(null); setShowCouponList(false); setCouponError("");
      applyingRef.current = false;
      const normalizedAddons = (event?.addons || []).map(a => ({
        ...a,
        type: /catering|food|meal|veg|non.?veg|plate|per.?person|person/i.test(a.name)
          ? "per_person"
          : (a.type || "fixed"),
      }));
      const init = {};
      normalizedAddons.forEach(a => { init[a.name] = a.type === "per_person" ? 0 : false; });
      setSelectedAddons(init);
    }
  }, [isOpen, event]);

  // Fetch available coupons for this event
  useEffect(() => {
    if (!isOpen || !event?._id || !token) return;
    axios.get(`${API_BASE}/coupons/available`, {
      headers: authHeaders(token),
      params: {
        eventId: event._id,
        serviceId: event._id,
        totalAmount: event.price || 1,
        category: event.category || ""
      }
    })
      .then(r => {
        if (r.data.success) setAvailableCoupons(r.data.coupons || []);
      })
      .catch(() => setAvailableCoupons([]));
  }, [isOpen, event, token]);

  const couponRef = useRef(null);
  const applyingRef = useRef(false); // prevent double-call

  // Close coupon dropdown on outside click
  useEffect(() => {
    if (!showCouponList) return;
    const handler = (e) => {
      if (couponRef.current && !couponRef.current.contains(e.target)) {
        setShowCouponList(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCouponList]);

  if (!isOpen || !event) return null;

  const images = event.images?.map(i => i.url).filter(Boolean) || [];
  const mainImg = images[activeImg] || images[0] || "/party.jpg";
  const basePrice = event.price || 0;
  // (handles old events where type was stored as "fixed" before schema update)
  const addons = (event.addons || []).map(a => ({
    ...a,
    type: /catering|food|meal|veg|non.?veg|plate|per.?person|person/i.test(a.name)
      ? "per_person"
      : (a.type || "fixed"),
  }));

  // ── Total calculation ──────────────────────────────────────────────────────
  const addonTotal = addons.reduce((sum, a) => {
    if (a.type === "per_person") return sum + a.price * (selectedAddons[a.name] || 0);
    return sum + (selectedAddons[a.name] ? a.price : 0);
  }, 0);
  const subtotal = basePrice + addonTotal;
  const discount = appliedCoupon
    ? (appliedCoupon.discountType === "percentage")
      ? Math.min(
          Math.round(subtotal * appliedCoupon.discountValue / 100),
          appliedCoupon.maxDiscount || Infinity
        )
      : Math.min(appliedCoupon.discountValue, subtotal) // "flat" type
    : 0;
  const total = Math.max(0, subtotal - discount);
  const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

  const toggleFixed = (name) => setSelectedAddons(p => ({ ...p, [name]: !p[name] }));

  // Per-person addons: total qty across all per_person addons cannot exceed guests
  const perPersonTotal = addons
    .filter(a => a.type === "per_person")
    .reduce((sum, a) => sum + (selectedAddons[a.name] || 0), 0);

  const changeQty = (name, delta) => {
    setSelectedAddons(p => {
      const current = p[name] || 0;
      const newVal = current + delta;
      if (newVal < 0) return p;
      // When increasing, check if total per_person would exceed guests
      if (delta > 0 && perPersonTotal >= guests) {
        toast.error(`Total persons cannot exceed ${guests} guests`);
        return p;
      }
      return { ...p, [name]: newVal };
    });
  };

  // ── Coupon ─────────────────────────────────────────────────────────────────
  const applyCouponCode = async (codeOverride) => {
    const code = (typeof codeOverride === "string" ? codeOverride : couponCode).trim().toUpperCase();
    if (!code) return toast.error("Enter a coupon code");
    // Hard guard using ref — prevents any double-call regardless of state timing
    if (applyingRef.current) return;
    applyingRef.current = true;
    setCouponCode(code);
    setCouponLoading(true);
    try {
      const base = parseFloat(event?.price) || 0;
      const addonsAmt = addons.reduce((sum, a) => {
        if (a.type === "per_person") return sum + (parseFloat(a.price) || 0) * (selectedAddons[a.name] || 0);
        return sum + (selectedAddons[a.name] ? (parseFloat(a.price) || 0) : 0);
      }, 0);
      const computedSubtotal = base + addonsAmt;
      const amountToValidate = computedSubtotal > 0 ? computedSubtotal : base > 0 ? base : 1;

      const res = await axios.post(`${API_BASE}/coupons/validate`, {
        couponCode: code,
        eventId: event._id,
        amount: amountToValidate,
      }, { headers: authHeaders(token) });

      if (res.data.success) {
        setAppliedCoupon(res.data.coupon);
        setCouponError("");
        const c = res.data.coupon;
        const isPercent = c.discountType === "percentage";
        const saved = isPercent ? `${c.discountValue}%` : `₹${c.discountValue}`;
        toast.success(`Coupon "${code}" applied! You save ${saved}`);
      } else {
        const errMsg = res.data.message || "Invalid coupon";
        setCouponError(errMsg);
        setAppliedCoupon(null);
        toast.error(errMsg, { duration: 4000 });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid coupon code";
      setCouponError(msg);
      setAppliedCoupon(null);
      toast.error(msg, { duration: 4000 });
    } finally {
      setCouponLoading(false);
      applyingRef.current = false;
    }
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponCode(""); setCouponError(""); };

  // ── Current location ───────────────────────────────────────────────────────
  const getCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    toast.loading("Getting your location...", { id: "geo" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const addr = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setLocation(addr);
          toast.success("Location detected!", { id: "geo" });
        } catch {
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          toast.success("Location set!", { id: "geo" });
        }
      },
      () => { toast.error("Could not get location", { id: "geo" }); }
    );
  };

  const handleSubmit = async () => {
    if (!date) return toast.error("Please select a service date");
    if (!time) return toast.error("Please select a service time");
    if (!guests || guests < 1) return toast.error("Please enter number of guests");

    // Validate per_person addons don't exceed guests
    if (perPersonTotal > guests) {
      return toast.error(`Total persons in add-ons (${perPersonTotal}) cannot exceed guests (${guests})`);
    }

    const selectedAddonsList = addons
      .filter(a => a.type === "per_person" ? (selectedAddons[a.name] || 0) > 0 : selectedAddons[a.name])
      .map(a => ({
        name: a.name, type: a.type, price: a.price,
        quantity: a.type === "per_person" ? (selectedAddons[a.name] || 0) : 1,
        total: a.type === "per_person" ? a.price * (selectedAddons[a.name] || 0) : a.price,
      }));

    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE}/bookings`, {
        serviceId: event._id,
        serviceTitle: event.title,
        serviceCategory: event.category || "Event",
        servicePrice: basePrice,
        eventType: "full-service",
        date, time,
        guestCount: guests,
        location: location || event.location || "",
        notes,
        selectedAddOns: selectedAddonsList,
        totalAmount: total,
        discount,
        promoCode: appliedCoupon?.code || "",
        status: "pending",
      }, { headers: authHeaders(token) });

      if (res.data.success) {
        toast.success("Booking request sent! Awaiting merchant confirmation.");
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "stretch" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} />

      {/* Full-page modal */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", width: "100%", height: "100%",
        background: "#fff",
        overflow: "hidden",
      }}>

        {/* ── LEFT: Event Banner & Info ── */}
        <div style={{
          width: "45%", flexShrink: 0,
          display: "flex", flexDirection: "column",
          background: "#0f172a",
          overflow: "hidden",
          height: "100%",
        }}>
          {/* Main image — takes most of the space */}
          <div style={{ position: "relative", flex: 1, overflow: "hidden", minHeight: 0 }}>
            <img
              src={mainImg}
              alt={event.title}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
            />
            {/* Gradient overlay */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.05) 100%)" }} />

            {/* Event info overlay */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 24px" }}>
              <span style={{ display: "inline-block", padding: "3px 10px", background: "#2563eb", color: "#fff", borderRadius: 20, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {event.category || "Event"}
              </span>
              <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.2, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                {event.title}
              </h1>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {event.location && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.85)", fontSize: 13 }}>
                    <FiMapPin size={13} />
                    <span>{event.location}</span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <FaRupeeSign size={11} style={{ color: "rgba(255,255,255,0.7)" }} />
                  <span style={{ fontWeight: 700, fontSize: 17, color: "#fff" }}>
                    {basePrice > 0 ? fmt(basePrice) : "Free"}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>base price</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gallery grid */}
          {images.length > 1 && (
            <div style={{ padding: "12px 14px", background: "#0f172a", flexShrink: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Event Gallery
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5 }}>
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    style={{
                      aspectRatio: "4/3", borderRadius: 7, overflow: "hidden",
                      border: `2px solid ${activeImg === i ? "#2563eb" : "transparent"}`,
                      cursor: "pointer", padding: 0, background: "#1e293b",
                      transition: "border-color 0.15s, transform 0.1s",
                      transform: activeImg === i ? "scale(1.04)" : "scale(1)",
                    }}>
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          {event.features?.length > 0 && (
            <div style={{ padding: "10px 14px", background: "#1e293b", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {event.features.slice(0, 6).map((f, i) => (
                  <span key={i} style={{ padding: "3px 9px", background: "rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.75)", borderRadius: 20, fontSize: 11 }}>
                    ✓ {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Booking Form ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff" }}>
          {/* Header */}
          <div style={{ padding: "20px 28px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", flexShrink: 0 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>Book Service</h2>
              <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 0" }}>Fill in your details to send a booking request</p>
            </div>
            <button onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
              <FiX size={18} />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

            {/* Date + Time */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Service Date *
                </label>
                <div style={{ position: "relative" }}>
                  <FiCalendar style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} size={15} />
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f8fafc" }}
                    onFocus={e => e.target.style.borderColor = "#2563eb"}
                    onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Service Time *
                </label>
                <div style={{ position: "relative" }}>
                  <FiClock style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} size={15} />
                  <input type="time" value={time} onChange={e => setTime(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f8fafc" }}
                    onFocus={e => e.target.style.borderColor = "#2563eb"}
                    onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                  />
                </div>
              </div>
            </div>

            {/* Guests */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Number of Guests *
              </label>
              <div style={{ position: "relative" }}>
                <FiUsers style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} size={15} />
                <input
                  type="number"
                  value={guests}
                  min={1}
                  onChange={e => setGuests(Math.max(1, parseInt(e.target.value) || 1))}
                  placeholder="e.g. 50"
                  style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#f8fafc" }}
                  onFocus={e => e.target.style.borderColor = "#2563eb"}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                />
              </div>
            </div>

            {/* Location */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Event Location
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <FiMapPin style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} size={15} />
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Type address or use current location"
                    style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", background: "#f8fafc" }}
                    onFocus={e => e.target.style.borderColor = "#2563eb"}
                    onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                  />
                </div>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  title="Use current location"
                  style={{ flexShrink: 0, padding: "0 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#374151"; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                    <path d="M12 8a4 4 0 100 8 4 4 0 000-8z"/>
                  </svg>
                  Current
                </button>
              </div>
            </div>

            {/* Add-ons */}
            {addons.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Add-ons
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {addons.map((a) => {
                    const isSelected = a.type === "per_person" ? (selectedAddons[a.name] || 0) > 0 : !!selectedAddons[a.name];
                    return (
                      <div key={a.name} style={{
                        padding: "12px 14px", borderRadius: 10,
                        border: `1.5px solid ${isSelected ? "#2563eb" : "#e2e8f0"}`,
                        background: isSelected ? "#eff6ff" : "#f8fafc",
                        transition: "all 0.15s", cursor: a.type === "fixed" ? "pointer" : "default",
                      }}
                        onClick={a.type === "fixed" ? () => toggleFixed(a.name) : undefined}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: a.type === "per_person" ? 8 : 0 }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0 }}>{a.name}</p>
                            <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>
                              {fmt(a.price)}{a.type === "per_person" ? " / person" : " (fixed)"}
                            </p>
                          </div>
                          {a.type === "fixed" && (
                            <div style={{
                              width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginLeft: 8,
                              border: `2px solid ${isSelected ? "#2563eb" : "#cbd5e1"}`,
                              background: isSelected ? "#2563eb" : "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {isSelected && <FaCheckCircle style={{ color: "#fff", fontSize: 10 }} />}
                            </div>
                          )}
                        </div>
                        {a.type === "per_person" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button type="button" onClick={(e) => { e.stopPropagation(); changeQty(a.name, -1); }}
                              style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 300, lineHeight: 1, color: "#374151" }}>
                              −
                            </button>
                            <span style={{ minWidth: 20, textAlign: "center", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                              {selectedAddons[a.name] || 0}
                            </span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); changeQty(a.name, 1); }}
                              disabled={perPersonTotal >= guests}
                              style={{
                                width: 28, height: 28, borderRadius: "50%",
                                border: `1px solid ${perPersonTotal >= guests ? "#e2e8f0" : "#cbd5e1"}`,
                                background: perPersonTotal >= guests ? "#f1f5f9" : "#fff",
                                cursor: perPersonTotal >= guests ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 18, fontWeight: 300, lineHeight: 1,
                                color: perPersonTotal >= guests ? "#cbd5e1" : "#374151",
                              }}>
                              +
                            </button>
                            {(selectedAddons[a.name] || 0) > 0 && (
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", marginLeft: "auto" }}>
                                {fmt(a.price * selectedAddons[a.name])}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Guest capacity indicator — only show when per_person addons exist */}
            {addons.some(a => a.type === "per_person") && guests > 0 && (
              <div style={{ marginBottom: 16, padding: "8px 14px", background: perPersonTotal >= guests ? "#fef2f2" : "#f0fdf4", border: `1px solid ${perPersonTotal >= guests ? "#fca5a5" : "#86efac"}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: perPersonTotal >= guests ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
                  {perPersonTotal >= guests
                    ? `All ${guests} guests allocated`
                    : `${perPersonTotal} of ${guests} guests allocated`}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  {Array.from({ length: guests }).map((_, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < perPersonTotal ? "#2563eb" : "#e2e8f0" }} />
                  ))}
                </div>
              </div>
            )}

            {/* Coupon */}
            <div style={{ marginBottom: 16 }} ref={couponRef}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Coupon Code
              </label>

              {appliedCoupon ? (
                /* ── Applied: full green bar ── */
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "2px solid #16a34a", borderRadius: 12, boxShadow: "0 2px 8px rgba(22,163,74,0.15)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#15803d", fontFamily: "monospace", letterSpacing: "0.08em" }}>{appliedCoupon.code}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", background: "#16a34a", color: "#fff", borderRadius: 20 }}>
                        {appliedCoupon.discountType === "percentage" ? `${appliedCoupon.discountValue}% OFF` : `₹${appliedCoupon.discountValue} OFF`}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: "#16a34a", margin: "2px 0 0" }}>
                      Discount applied to your total
                    </p>
                  </div>
                  <button type="button" onClick={removeCoupon}
                    style={{ fontSize: 11, color: "#dc2626", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 700, flexShrink: 0 }}>
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  {/* Input row */}
                  <div style={{ display: "flex", gap: 8, marginBottom: couponError ? 6 : availableCoupons.length > 0 ? 10 : 0 }}>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); applyCouponCode(); } }}
                      placeholder="Enter coupon code"
                      style={{ flex: 1, padding: "10px 14px", border: `1.5px solid ${couponError ? "#ef4444" : "#e2e8f0"}`, borderRadius: 10, fontSize: 13, outline: "none", background: couponError ? "#fef2f2" : "#f8fafc", letterSpacing: "0.06em", fontWeight: 600, boxSizing: "border-box" }}
                      onFocus={e => e.target.style.borderColor = couponError ? "#ef4444" : "#2563eb"}
                      onBlur={e => e.target.style.borderColor = couponError ? "#ef4444" : "#e2e8f0"}
                    />
                    <button type="button" onClick={() => applyCouponCode()} disabled={couponLoading}
                      style={{ padding: "0 18px", background: couponLoading ? "#93c5fd" : "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: couponLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {couponLoading ? "..." : "Apply"}
                    </button>
                  </div>

                  {/* Inline error */}
                  {couponError && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, marginBottom: 8 }}>
                      <svg width="13" height="13" fill="none" stroke="#ef4444" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 500 }}>{couponError}</span>
                    </div>
                  )}

                  {/* Coupon cards — always visible */}
                  {availableCoupons.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {availableCoupons.slice(0, 4).map(c => {
                        const isApplied = appliedCoupon?.code === c.code;
                        const isLoading = couponLoading && couponCode === c.code;
                        const discountLabel = c.discountType === "percentage"
                          ? `${c.discountValue}% OFF`
                          : `₹${c.discountValue} OFF`;

                        return (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => !couponLoading && (isApplied ? removeCoupon() : applyCouponCode(c.code))}
                            disabled={couponLoading}
                            style={{
                              display: "flex", flexDirection: "column", alignItems: "flex-start",
                              padding: "12px 14px", borderRadius: 12, textAlign: "left",
                              cursor: couponLoading ? "not-allowed" : "pointer",
                              transition: "all 0.2s",
                              opacity: couponLoading && !isLoading ? 0.5 : 1,
                              // Applied = solid green; unapplied = dashed gray
                              background: isApplied
                                ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
                                : "#f8fafc",
                              border: isApplied
                                ? "2px solid #16a34a"
                                : "1.5px dashed #cbd5e1",
                              boxShadow: isApplied ? "0 2px 8px rgba(22,163,74,0.15)" : "none",
                            }}
                            onMouseEnter={e => {
                              if (!couponLoading && !isApplied) {
                                e.currentTarget.style.borderColor = "#2563eb";
                                e.currentTarget.style.background = "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)";
                                e.currentTarget.style.boxShadow = "0 2px 8px rgba(37,99,235,0.12)";
                              }
                            }}
                            onMouseLeave={e => {
                              if (!couponLoading && !isApplied) {
                                e.currentTarget.style.borderColor = "#cbd5e1";
                                e.currentTarget.style.background = "#f8fafc";
                                e.currentTarget.style.boxShadow = "none";
                              }
                            }}
                          >
                            {/* Top row: badge + check icon */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 6 }}>
                              <span style={{
                                fontSize: 12, fontWeight: 800, letterSpacing: "0.04em",
                                padding: "3px 10px", borderRadius: 20,
                                background: isApplied ? "#16a34a" : "#2563eb",
                                color: "#fff",
                              }}>
                                {isLoading ? "..." : discountLabel}
                              </span>
                              {isApplied && (
                                <span style={{ fontSize: 16, color: "#16a34a", lineHeight: 1 }}>✓</span>
                              )}
                            </div>

                            {/* Code */}
                            <span style={{
                              fontSize: 13, fontWeight: 800,
                              color: isApplied ? "#15803d" : "#0f172a",
                              fontFamily: "monospace", letterSpacing: "0.1em",
                            }}>
                              {c.code}
                            </span>

                            {/* Description */}
                            {c.description && (
                              <span style={{ fontSize: 10, color: isApplied ? "#16a34a" : "#64748b", marginTop: 3, lineHeight: 1.4 }}>
                                {c.description}
                              </span>
                            )}

                            {/* Min amount */}
                            {c.minAmount > 0 && (
                              <span style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                                Min ₹{c.minAmount.toLocaleString("en-IN")}
                              </span>
                            )}

                            {/* Applied label */}
                            {isApplied && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", marginTop: 4 }}>
                                Tap to remove
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

            {/* Notes */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Special Notes
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Any special requirements, preferences, or questions..."
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", background: "#f8fafc", fontFamily: "inherit" }}
                onFocus={e => e.target.style.borderColor = "#2563eb"}
                onBlur={e => e.target.style.borderColor = "#e2e8f0"}
              />
            </div>
          </div>

          {/* ── Footer: Price Summary + Submit ── */}
          <div style={{ padding: "16px 28px", borderTop: "1px solid #f1f5f9", background: "#fff", flexShrink: 0 }}>
            {/* Price breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748b" }}>
                <span>Base Price</span>
                <span>{fmt(basePrice)}</span>
              </div>
              {addons.filter(a => a.type === "per_person" ? (selectedAddons[a.name] || 0) > 0 : selectedAddons[a.name]).map(a => (
                <div key={a.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8" }}>
                  <span>{a.name}{a.type === "per_person" ? ` × ${selectedAddons[a.name]}` : ""}</span>
                  <span>+{fmt(a.type === "per_person" ? a.price * selectedAddons[a.name] : a.price)}</span>
                </div>
              ))}
              {discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
                  <span>Coupon ({appliedCoupon?.code})</span>
                  <span>−{fmt(discount)}</span>
                </div>
              )}
              <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
                <span>Estimated Total</span>
                <span style={{ color: "#2563eb" }}>{fmt(total)}</span>
              </div>
            </div>

            <button type="button" onClick={handleSubmit} disabled={submitting}
              style={{
                width: "100%", padding: "14px",
                background: submitting ? "#93c5fd" : "#2563eb",
                color: "#fff", border: "none", borderRadius: 12,
                fontSize: 15, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
                transition: "background 0.2s, transform 0.1s",
              }}
              onMouseEnter={e => { if (!submitting) { e.currentTarget.style.background = "#1d4ed8"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
              onMouseLeave={e => { if (!submitting) { e.currentTarget.style.background = "#2563eb"; e.currentTarget.style.transform = "translateY(0)"; } }}
            >
              <FaRupeeSign size={14} />
              {submitting ? "Sending Request..." : `Request Booking · ${fmt(total)}`}
            </button>
            <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 8 }}>
              Merchant will review and confirm your booking request
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

FullServiceBookingModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  event: PropTypes.object,
  onSuccess: PropTypes.func,
};

export default FullServiceBookingModal;
