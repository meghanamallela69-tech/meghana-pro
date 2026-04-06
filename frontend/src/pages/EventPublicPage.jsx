import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../lib/http";
import BookingModal from "../components/BookingModal";
import useAuth from "../context/useAuth";
import { FiCalendar, FiMapPin, FiTag, FiArrowLeft } from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";
import toast from "react-hot-toast";

const EventPublicPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/events/${eventId}`)
      .then(r => { if (r.data.success) setEvent(r.data.event); })
      .catch(() => toast.error("Event not found"))
      .finally(() => setLoading(false));
  }, [eventId]);

  // After login redirect: auto-open booking modal
  useEffect(() => {
    if (!event || !token) return;
    
    // Check for booking redirect from login
    const bookingEventId = localStorage.getItem("bookingEventId");
    if (bookingEventId === eventId) {
      localStorage.removeItem("bookingEventId");
      setBookingOpen(true);
      return;
    }
    
    // Check for QR booking redirect
    const redirect = localStorage.getItem("qr_booking_redirect");
    if (redirect === eventId) {
      localStorage.removeItem("qr_booking_redirect");
      setBookingOpen(true);
    }
  }, [event, token, eventId]);

  const handleBookNow = () => {
    if (!token || !user) {
      localStorage.setItem("bookingEventId", eventId);
      navigate("/login", { state: { from: `/event/${eventId}` } });
      return;
    }
    setBookingOpen(true);
  };

  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div style={{ width: 48, height: 48, border: "4px solid #2563eb", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 24, fontWeight: 600, color: "#374151" }}>Event not found</p>
          <p style={{ color: "#6b7280", marginTop: 8 }}>This event may have been removed or the link is invalid.</p>
          <button onClick={() => navigate("/")} style={{ marginTop: 20, padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const img = event.images?.[0]?.url || null;
  const isTicketed = event.eventType === "ticketed";
  const price = event.price > 0 ? `₹${event.price.toLocaleString("en-IN")}` : "Free";

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6" }}>

      {/* ── Hero Banner ── */}
      <div style={{ position: "relative", width: "100%", height: 420, overflow: "hidden", background: "#1e293b" }}>
        {img ? (
          <img
            src={img}
            alt={event.title}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1e3a5f, #2563eb)" }} />
        )}
        {/* Dark overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.10) 100%)" }} />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            position: "absolute", top: 20, left: 20,
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px",
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
            color: "#fff", border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500,
          }}
        >
          <FiArrowLeft size={14} /> Back
        </button>

        {/* Title overlay */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "32px 40px" }}>
          <span style={{
            display: "inline-block", padding: "4px 14px",
            background: "#2563eb", color: "#fff",
            borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 12,
          }}>
            {event.category || "Event"}
          </span>
          <h1 style={{ color: "#fff", fontSize: 36, fontWeight: 800, margin: 0, lineHeight: 1.2, textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
            {event.title}
          </h1>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px", display: "grid", gridTemplateColumns: "1fr 340px", gap: 28, alignItems: "start" }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* About */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 12, margin: "0 0 12px" }}>About this Event</h2>
            <p style={{ color: "#4b5563", lineHeight: 1.8, margin: 0, fontSize: 15 }}>
              {event.description || "No description provided."}
            </p>
          </div>

          {/* Features */}
          {event.features?.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 28, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 14px" }}>Features</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {event.features.map((f, i) => (
                  <span key={i} style={{ padding: "6px 14px", background: "#eff6ff", color: "#1d4ed8", borderRadius: 20, fontSize: 13, fontWeight: 500 }}>{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* Ticket Types */}
          {isTicketed && event.ticketTypes?.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 28, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 14px" }}>Ticket Types</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {event.ticketTypes.map((t, i) => {
                  const avail = (t.quantityTotal || t.quantity || 0) - (t.quantitySold || 0);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
                      <div>
                        <p style={{ fontWeight: 600, color: "#111827", margin: 0, fontSize: 15 }}>{t.name}</p>
                        <p style={{ color: "#6b7280", fontSize: 12, margin: "3px 0 0" }}>{avail} available</p>
                      </div>
                      <span style={{ fontWeight: 700, color: "#2563eb", fontSize: 17 }}>₹{t.price?.toLocaleString("en-IN")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {event.addons?.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 28, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 14px" }}>Add-ons Available</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {event.addons.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
                    <span style={{ color: "#374151", fontSize: 15 }}>{a.name}</span>
                    <span style={{ fontWeight: 600, color: "#16a34a", fontSize: 15 }}>+₹{a.price?.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Booking Card */}
        <div style={{ position: "sticky", top: 24 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, border: "1px solid #e5e7eb", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>

            {/* Price */}
            <div style={{ fontSize: 32, fontWeight: 800, color: "#2563eb", marginBottom: 22 }}>{price}</div>

            {/* Meta */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
              {fmt(event.date) && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#374151", fontSize: 14 }}>
                  <FiCalendar style={{ color: "#2563eb", flexShrink: 0, fontSize: 16 }} />
                  <span>{fmt(event.date)}{event.time ? ` · ${event.time}` : ""}</span>
                </div>
              )}
              {event.location && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#374151", fontSize: 14 }}>
                  <FiMapPin style={{ color: "#ef4444", flexShrink: 0, fontSize: 16 }} />
                  <span>{event.location}</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#374151", fontSize: 14 }}>
                <FiTag style={{ color: "#7c3aed", flexShrink: 0, fontSize: 16 }} />
                <span style={{ textTransform: "capitalize" }}>{event.eventType?.replace("-", " ") || "Event"}</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "#f3f4f6", marginBottom: 22 }} />

            {/* Book Now */}
            <button
              onClick={handleBookNow}
              style={{
                width: "100%", padding: "15px",
                background: "#2563eb", color: "#fff",
                border: "none", borderRadius: 10,
                fontSize: 16, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 4px 12px rgba(37,99,235,0.35)",
                transition: "background 0.2s, transform 0.1s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1d4ed8"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#2563eb"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <FaTicketAlt size={16} />
              {token ? "Book Now" : "Login to Book"}
            </button>

            <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
              {token
                ? "Secure booking · Instant confirmation"
                : "You'll be redirected to login, then brought back here to complete your booking."}
            </p>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {bookingOpen && event && (
        <BookingModal
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          service={{
            _id: event._id,
            title: event.title,
            category: event.category,
            price: event.price,
            location: event.location,
            images: event.images,
            eventType: event.eventType,
            ticketTypes: event.ticketTypes,
            addons: event.addons,
          }}
          coupons={event.coupons || []}
          onSuccess={() => {
            setBookingOpen(false);
            toast.success("Booking successful!");
          }}
        />
      )}
    </div>
  );
};

export default EventPublicPage;
