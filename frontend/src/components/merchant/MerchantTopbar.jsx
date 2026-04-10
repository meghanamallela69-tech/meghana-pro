import { useState, useRef, useEffect } from "react";
import { SITE_NAME } from "../../config/site";
import { BsCalendarEvent } from "react-icons/bs";
import { FiChevronDown, FiUser, FiSettings, FiLogOut } from "react-icons/fi";
import useAuth from "../../context/useAuth";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import useNotificationBadges from "../../context/useNotificationBadges";
import NotificationDropdown from "../shared/NotificationDropdown";
import LanguageSwitcher from "../shared/LanguageSwitcher";

const MerchantTopbar = ({ onToggleSidebar }) => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { refreshBadges } = useNotificationBadges();
  const navigate = useNavigate();
  const name = user?.name || "Merchant";
  const profileRef = useRef(null);

  useEffect(() => { refreshBadges(); }, [refreshBadges]);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="tb-header-row flex items-center justify-between px-4 py-3">

        {/* Left: Hamburger + Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onToggleSidebar}
            style={{ padding: 8, border: "none", background: "transparent", cursor: "pointer", fontSize: 22, lineHeight: 1, color: "#374151" }}>
            ☰
          </button>
          <div className="font-semibold" style={{ fontSize: 15 }}>
            {SITE_NAME}
          </div>
        </div>

        <div className="tb-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NotificationDropdown viewAllPath="/dashboard/merchant/notifications" />
          <span className="tb-lang"><LanguageSwitcher /></span>

          <div style={{ position: "relative" }} ref={profileRef}>
            <button type="button" onClick={() => setOpen(p => !p)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: 4, border: "none", background: "transparent", cursor: "pointer", borderRadius: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#4f46e5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, fontSize: 14, fontWeight: 700 }}>
                {user?.profileImage
                  ? <img src={user.profileImage} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (user?.name?.[0] || name[0])}
              </div>
              <span className="tb-name" style={{ fontSize: 13 }}>{user?.name || name}</span>
              <FiChevronDown className="tb-name" style={{ fontSize: 12, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }} />
            </button>

            {open && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 176, background: "#fff", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb", zIndex: 9999 }}>
                <button onClick={() => { setOpen(false); navigate("/dashboard/merchant/profile"); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2">
                  <FiUser style={{ color: "#6b7280" }} /> Profile
                </button>
                <button onClick={() => { setOpen(false); navigate("/dashboard/merchant/settings"); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2">
                  <FiSettings style={{ color: "#6b7280" }} /> Settings
                </button>
                <hr style={{ margin: "4px 0" }} />
                <button onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-red-600 flex items-center gap-2">
                  <FiLogOut style={{ color: "#dc2626" }} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .tb-name { display: inline !important; }
        @media (max-width: 768px) {
          .tb-name { display: none !important; }
          .tb-lang { display: none !important; }
          .tb-header-row { padding: 6px 12px !important; gap: 4px !important; }
          .tb-right { gap: 4px !important; }
        }
      `}</style>
    </header>
  );
};

export default MerchantTopbar;
MerchantTopbar.propTypes = { onToggleSidebar: PropTypes.func };
