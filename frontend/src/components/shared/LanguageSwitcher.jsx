import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const LANGUAGES = [
  { code: "en",    label: "English" },
  { code: "hi",    label: "हिन्दी" },
  { code: "te",    label: "తెలుగు" },
  { code: "ta",    label: "தமிழ்" },
  { code: "kn",    label: "ಕನ್ನಡ" },
  { code: "ml",    label: "മലയാളം" },
  { code: "mr",    label: "मराठी" },
  { code: "bn",    label: "বাংলা" },
  { code: "gu",    label: "ગુજરાતી" },
  { code: "pa",    label: "ਪੰਜਾਬੀ" },
  { code: "ur",    label: "اردو" },
  { code: "fr",    label: "Français" },
  { code: "de",    label: "Deutsch" },
  { code: "es",    label: "Español" },
  { code: "zh-CN", label: "中文" },
  { code: "ja",    label: "日本語" },
  { code: "ko",    label: "한국어" },
  { code: "ar",    label: "العربية" },
  { code: "ru",    label: "Русский" },
  { code: "pt",    label: "Português" },
];

const GlobeIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const LanguageSwitcher = () => {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("EN");
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target)) {
        const portal = document.getElementById("lang-portal");
        if (portal && portal.contains(e.target)) return;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const updatePos = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
  };

  const handleToggle = () => {
    if (!open) updatePos();
    setOpen(p => !p);
  };

  const switchLanguage = (code, label) => {
    // Use Google Translate cookie method
    const lang = code === "en" ? "/en/en" : `/en/${code}`;
    document.cookie = `googtrans=${lang}; path=/`;
    document.cookie = `googtrans=${lang}; domain=${window.location.hostname}; path=/`;
    setCurrent(code === "en" ? "EN" : code.toUpperCase().slice(0, 2));
    setOpen(false);
    window.location.reload();
  };

  const dropdown = open ? (
    <div
      id="lang-portal"
      style={{
        position: "fixed",
        top: pos.top,
        right: pos.right,
        zIndex: 99999,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
        width: 200,
        maxHeight: 340,
        overflowY: "auto",
        padding: "6px 0",
      }}
    >
      <p style={{ fontSize: 11, color: "#9ca3af", padding: "4px 14px 6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Select Language
      </p>
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchLanguage(code, label)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "7px 14px",
            fontSize: 13,
            color: "#374151",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            transition: "background 0.1s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <span style={{ fontSize: 14 }}>{label}</span>
        </button>
      ))}
    </div>
  ) : null;

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 899;

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        title="Change Language"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          padding: "3px 6px",
          borderRadius: 6,
          border: "1px solid #e5e7eb",
          background: open ? "#f3f4f6" : "transparent",
          cursor: "pointer",
          color: "#374151",
          fontSize: 11,
          fontWeight: 600,
          transition: "all 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <GlobeIcon size={13} />
        <span>{current}</span>
      </button>
      {createPortal(dropdown, document.body)}
    </>
  );
};

export default LanguageSwitcher;
