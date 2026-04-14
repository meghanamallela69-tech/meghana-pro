import { Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { API_BASE } from "../lib/http";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const SLIDES = [
  {
    src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&auto=format&fit=crop&q=80",
    alt: "Wedding event",
  },
  {
    src: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&auto=format&fit=crop&q=80",
    alt: "Concert event",
  },
  {
    src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&auto=format&fit=crop&q=80",
    alt: "Corporate event",
  },
];

const INTERVAL = 2000;

const HeroSection = () => {
  const [stats,   setStats]   = useState({ totalEvents: null, totalUsers: null, totalMerchants: null });
  const [current, setCurrent] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    axios.get(`${API_BASE}/admin/public-stats`)
      .then((res) => { if (res.data.success) setStats(res.data.stats); })
      .catch(() => {});
  }, []);

  // Auto-slide — uses ref so it never needs to be recreated
  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) {
        setCurrent(c => (c + 1) % SLIDES.length);
      }
    }, INTERVAL);
    return () => clearInterval(id);
  }, []);

  const goTo = (i) => setCurrent(i);
  const prev  = () => setCurrent(c => (c - 1 + SLIDES.length) % SLIDES.length);
  const next  = () => setCurrent(c => (c + 1) % SLIDES.length);

  const fmt = (n, fallback) =>
    (n !== null && n !== undefined) ? n.toLocaleString() : fallback;

  return (
    <section
      style={{ position: "relative", overflow: "hidden", minHeight: 520 }}
      onMouseEnter={() => { pausedRef.current = true;  }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      {/* ── Slide images ── */}
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          style={{
            position: "absolute", inset: 0,
            opacity: i === current ? 1 : 0,
            transition: "opacity 800ms ease-in-out",
            zIndex: 0,
          }}
        >
          <img
            src={slide.src}
            alt={slide.alt}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      ))}

      {/* ── Overlays ── */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(8,145,178,0.30)", zIndex: 1 }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(34,211,238,.35) 0%,rgba(59,130,246,.28) 50%,rgba(20,184,166,.35) 100%)", zIndex: 1 }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(37,99,235,.18) 0%,transparent 60%)", zIndex: 1 }} />

      {/* ── Content ── */}
      <div className="relative container mx-auto px-6 py-24 md:py-32" style={{ zIndex: 2 }}>
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-white/50 text-sm text-cyan-900 mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            Professional Event Management Platform
          </div>

          <h1 className="text-4xl md:text-6xl font-bold leading-tight text-white drop-shadow-lg">
            Plan and Manage Your Events{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-teal-300">
              Effortlessly
            </span>
          </h1>

          <p className="mt-6 text-lg text-white/90 leading-relaxed drop-shadow-md">
            A modern platform to discover premium services, book trusted vendors, and manage every detail—from invitations to payments.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/services" className="px-6 py-3 rounded-lg bg-white text-cyan-700 font-semibold hover:bg-cyan-50 transition shadow-lg">
              Explore Services
            </Link>
            <Link to="/login" className="px-6 py-3 rounded-lg border-2 border-white/80 text-white hover:bg-white/20 hover:border-white transition backdrop-blur-sm">
              Book Event
            </Link>
          </div>

          <div className="mt-12 flex gap-8">
            <div>
              <p className="text-2xl font-bold text-white drop-shadow-md">{fmt(stats.totalEvents, "—")}</p>
              <p className="text-sm text-white/80">Events Hosted</p>
            </div>
            <div className="w-px bg-white/40" />
            <div>
              <p className="text-2xl font-bold text-white drop-shadow-md">{fmt(stats.totalMerchants, "—")}</p>
              <p className="text-sm text-white/80">Trusted Vendors</p>
            </div>
            <div className="w-px bg-white/40" />
            <div>
              <p className="text-2xl font-bold text-white drop-shadow-md">{fmt(stats.totalUsers, "—")}</p>
              <p className="text-sm text-white/80">Happy Customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Arrows ── */}
      <button onClick={prev} aria-label="Previous"
        style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 3, width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.35)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", backdropFilter: "blur(4px)" }}>
        <FiChevronLeft size={22} />
      </button>
      <button onClick={next} aria-label="Next"
        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 3, width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.35)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", backdropFilter: "blur(4px)" }}>
        <FiChevronRight size={22} />
      </button>

      {/* ── Dots ── */}
      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 3, display: "flex", gap: 8, alignItems: "center" }}>
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`}
            style={{
              width: i === current ? 24 : 8, height: 8,
              borderRadius: 9999, border: "none", cursor: "pointer",
              background: i === current ? "#fff" : "rgba(255,255,255,0.45)",
              transition: "all 0.3s ease", padding: 0,
            }}
          />
        ))}
      </div>
    </section>
  );
};

export default HeroSection;
