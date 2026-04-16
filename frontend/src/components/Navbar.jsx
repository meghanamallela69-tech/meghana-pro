import { useState } from "react";
import { Link } from "react-router-dom";
import { MdEventNote } from "react-icons/md";
import LanguageSwitcher from "./shared/LanguageSwitcher";

const NAV_LINKS = [
  { to: "/home",     label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/about",    label: "About" },
  { to: "/reviews",  label: "Reviews" },
  { to: "/blogs",    label: "Blogs" },
  { to: "/faqs",     label: "FAQs" },
  { to: "/contact",  label: "Contact" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "#fff",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      width: "100%",
    }}>
      {/* ── Single row: logo | links + buttons ── */}
      <div className="nb-header-row" style={{
        width: "100%",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxSizing: "border-box",
        gap: 16,
      }}>

        {/* Logo */}
        <Link to="/home" style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", flexShrink: 0 }}>
          <MdEventNote className="nb-logo-icon" style={{ fontSize: 28, color: "#2563eb" }} />
          <span className="nb-logo-text" style={{ fontSize: 36, fontWeight: 900, fontStyle: "italic", color: "#2563eb", letterSpacing: "-1px", lineHeight: 1.2 }}>Event</span>
          <span className="nb-logo-text" style={{ fontSize: 36, fontWeight: 900, fontStyle: "italic", color: "#7c3aed", letterSpacing: "-1px", lineHeight: 1.2 }}>Hub</span>
        </Link>

        {/* Desktop: links + auth — hidden on mobile */}
        <div className="nb-desktop" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "nowrap", flexShrink: 0 }}>
          {NAV_LINKS.map(l => (
            <Link key={l.to} to={l.to} style={{
              color: "#374151", fontWeight: 500, textDecoration: "none",
              fontSize: 14, whiteSpace: "nowrap",
            }}
              onMouseEnter={e => e.currentTarget.style.color = "#2563eb"}
              onMouseLeave={e => e.currentTarget.style.color = "#374151"}
            >
              {l.label}
            </Link>
          ))}
          <LanguageSwitcher />
          <Link to="/login" style={{
            padding: "7px 18px", border: "2px solid #2563eb",
            color: "#2563eb", borderRadius: 8, fontWeight: 600,
            textDecoration: "none", fontSize: 14, whiteSpace: "nowrap",
            background: "transparent",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            Login
          </Link>
          <Link to="/register" style={{
            padding: "7px 18px", background: "#2563eb",
            color: "#fff", borderRadius: 8, fontWeight: 600,
            textDecoration: "none", fontSize: 14, whiteSpace: "nowrap",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#1d4ed8"}
            onMouseLeave={e => e.currentTarget.style.background = "#2563eb"}
          >
            Register
          </Link>
        </div>

        {/* Mobile: hamburger only */}
        <div className="nb-mobile" style={{ display: "none", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => setMobileOpen(p => !p)}
            style={{ padding: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 24, color: "#374151", lineHeight: 1 }}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div style={{ borderTop: "1px solid #f3f4f6", background: "#fff", padding: "8px 16px 16px" }}>
          {NAV_LINKS.map(l => (
            <Link key={l.to} to={l.to}
              onClick={() => setMobileOpen(false)}
              style={{ display: "block", padding: "10px 12px", color: "#374151", fontWeight: 500, textDecoration: "none", borderRadius: 8, fontSize: 15 }}
            >
              {l.label}
            </Link>
          ))}
          <div style={{ borderTop: "1px solid #f3f4f6", marginTop: 8, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ paddingBottom: 4 }}>
              <LanguageSwitcher />
            </div>
            <Link to="/login" onClick={() => setMobileOpen(false)}
              style={{ display: "block", padding: "10px 12px", border: "2px solid #2563eb", color: "#2563eb", borderRadius: 8, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>
              Login
            </Link>
            <Link to="/register" onClick={() => setMobileOpen(false)}
              style={{ display: "block", padding: "10px 12px", background: "#2563eb", color: "#fff", borderRadius: 8, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>
              Register
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 900px) {
          .nb-desktop { display: flex !important; }
          .nb-mobile  { display: none !important; }
        }
        @media (max-width: 899px) {
          .nb-desktop { display: none !important; }
          .nb-mobile  { display: flex !important; }
          .nb-header-row {
            padding: 8px 12px !important;
          }
          .nb-logo-icon {
            font-size: 16px !important;
          }
          .nb-logo-text {
            font-size: 16px !important;
            letter-spacing: -0.5px !important;
          }
          .nb-mobile button {
            font-size: 18px !important;
            padding: 4px !important;
          }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
