import { useState } from "react";
import PropTypes from "prop-types";
import UserSidebar from "./UserSidebar";
import UserTopbar from "./UserTopbar";
import useAuth from "../../context/useAuth";
import { useNavigate } from "react-router-dom";

const UserLayout = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>

      {/* ── Sidebar: always in DOM, CSS controls position ── */}
      <aside
        className="app-sidebar"
        style={{
          position: "fixed", left: 0, top: 0,
          height: "100%", width: 256,
          background: "#fff", zIndex: 50,
          boxShadow: "2px 0 8px rgba(0,0,0,0.08)",
          transform: sidebarOpen ? "translateX(0)" : undefined,
          transition: "transform 0.3s ease",
          overflowY: "auto",
        }}
      >
        <UserSidebar onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
        />
      )}

      {/* ── Main content ── */}
      <div className="app-main" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <UserTopbar
          onToggleSidebar={() => setSidebarOpen(p => !p)}
          onLogout={handleLogout}
        />
        <main style={{ padding: "24px", flex: 1 }}>{children}</main>
      </div>

      <style>{`
        /* Desktop: sidebar always visible, content offset */
        @media (min-width: 1024px) {
          .app-sidebar { transform: translateX(0) !important; }
          .app-main { margin-left: 256px; }
          .sidebar-backdrop { display: none !important; }
        }
        /* Mobile: sidebar hidden by default */
        @media (max-width: 1023px) {
          .app-sidebar { transform: translateX(-100%); }
          .app-main { margin-left: 0; }
        }
      `}</style>
    </div>
  );
};

UserLayout.propTypes = { children: PropTypes.node.isRequired };
export default UserLayout;
