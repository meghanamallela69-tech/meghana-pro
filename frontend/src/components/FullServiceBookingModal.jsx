import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { API_BASE, authHeaders } from "../lib/http";
import useAuth from "../context/useAuth";
import { toast } from "react-hot-toast";
import { FiX, FiCalendar, FiClock, FiUsers, FiMinus, FiPlus, FiMapPin } from "react-icons/fi";
import { FaRupeeSign, FaCheckCircle, FaStar } from "react-icons/fa";
import PropTypes from "prop-types";
import useCoupon from "../hooks/useCoupon";
import CouponSection from "./CouponSection";

const FullServiceBookingModal = ({ isOpen, onClose, event, onSuccess }) => {
  const { token } = useAuth();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState(1);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedAddons, setSelectedAddons] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  // ── Coupon hook — must be before any conditional returns ──────────────────
  const coupon = useCoupon({ token, eventId: event?._id, getAmount: () => parseFloat(event?.price) || 0 });

  useEffect(() => {
    if (isOpen) {
      setDate(""); setTime(""); setGuests(1); setNotes(""); setActiveImg(0);
      setLocation(""); coupon.reset();
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

  if (!isOpen || !event) return null;

  // Check if user is logged in
  if (!token) {
    localStorage.setItem("bookingEventId", event._id);
    window.location.href = `/login?redirect=booking`;
    return null;
  }

  const images = event.images?.map(i => i.url).filter(Boolean) || [];
  const mainImg = images[activeImg] || images[0] || "/party.jpg";
  const basePrice = event.price || 0;
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
  const discount = coupon.discount;
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
    console.log("🔵 handleSubmit called");
    
    // Prevent double submission
    if (submitting) {
      console.warn("⚠️ Submission already in progress");
      return;
    }
    
    console.log("Event:", event);
    console.log("Date:", date);
    console.log("Time:", time);
    console.log("Guests:", guests);
    
    // Defensive checks
    if (!event) {
      console.error("❌ Event data missing");
      toast.error("Event data is missing. Please refresh and try again.");
      return;
    }

    if (!event._id) {
      console.error("❌ Event ID missing");
      toast.error("Event ID is missing. Please refresh and try again.");
      return;
    }

    if (!date) {
      console.error("❌ Date not selected");
      return toast.error("Please select a service date");
    }
    if (!time) {
      console.error("❌ Time not selected");
      return toast.error("Please select a service time");
    }
    if (!guests || guests < 1) {
      console.error("❌ Invalid guest count");
      return toast.error("Please enter number of guests");
    }

    // Validate per_person addons don't exceed guests
    if (perPersonTotal > guests) {
      console.error("❌ Per-person addons exceed guests");
      return toast.error(`Total persons in add-ons (${perPersonTotal}) cannot exceed guests (${guests})`);
    }

    const selectedAddonsList = addons
      .filter(a => a.type === "per_person" ? (selectedAddons[a.name] || 0) > 0 : selectedAddons[a.name])
      .map(a => ({
        name: a.name, type: a.type, price: a.price,
        quantity: a.type === "per_person" ? (selectedAddons[a.name] || 0) : 1,
        total: a.type === "per_person" ? a.price * (selectedAddons[a.name] || 0) : a.price,
      }));

    console.log("✅ All validations passed");
    console.log("Selected addons:", selectedAddonsList);
    console.log("Total amount:", total);
    console.log("onSuccess callback:", onSuccess);

    setSubmitting(true);
    try {
      // Ensure onSuccess callback exists
      if (!onSuccess) {
        console.error("❌ onSuccess callback not provided");
        toast.error("Booking callback error. Please try again.");
        setSubmitting(false);
        return;
      }

      console.log("📤 Sending booking request to API...");
      console.log("API_BASE:", API_BASE);
      console.log("Token:", token ? "✓ Present" : "✗ Missing");
      console.log("Headers:", authHeaders(token));
      
      const bookingPayload = {
        serviceId: event?._id,
        serviceTitle: event?.title,
        serviceCategory: event?.category || "Event",
        servicePrice: basePrice,
        eventType: "full-service",
        date, time,
        guestCount: guests,
        location: location || event?.location || "",
        notes,
        selectedAddOns: selectedAddonsList,
        totalAmount: total,
        discount,
        promoCode: coupon.applied?.coupon?.code || "",
        status: "pending",
      };
      
      console.log("Booking payload:", bookingPayload);
      
      const res = await axios.post(`${API_BASE}/bookings`, bookingPayload, { 
        headers: authHeaders(token) 
      });

      console.log("✅ API Response:", res.data);

      if (res.data.success) {
        console.log("✅ Booking created successfully!");
        toast.success("Booking request sent! Awaiting merchant confirmation.");
        // Pass booking data to parent component
        const bookingData = {
          serviceId: event?._id,
          date,
          time,
          guests,
          location,
          totalAmount: total,
          discount,
          promoCode: coupon.applied?.coupon?.code || "",
          selectedAddOns: selectedAddonsList,
        };
        console.log("📤 Calling onSuccess with booking data:", bookingData);
        onSuccess?.(bookingData);
        console.log("✅ onSuccess called");
        console.log("Calling onClose...");
        onClose();
        console.log("✅ onClose called");
      } else {
        console.error("❌ API returned success: false");
        console.error("Response:", res.data);
        toast.error(res.data.message || "Booking failed");
      }
    } catch (err) {
      console.error("❌ Booking error:", err);
      console.error("Error response:", err.response?.data);
      toast.error(err.response?.data?.message || "Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "stretch" }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 0 }} />

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
            <CouponSection token={token} eventId={event?._id} couponHook={coupon} />

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
