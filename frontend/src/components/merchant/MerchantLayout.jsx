import { useState } from "react";
import PropTypes from "prop-types";
import MerchantSidebar from "./MerchantSidebar";
import MerchantTopbar from "./MerchantTopbar";
import useAuth from "../../context/useAuth";
import { useNavigate } from "react-router-dom";

const MerchantLayout = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>

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
        <MerchantSidebar onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />
      </aside>

      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
        />
      )}

      <div className="app-main" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <MerchantTopbar onToggleSidebar={() => setSidebarOpen(p => !p)} />
        <main style={{ padding: "24px", flex: 1 }}>{children}</main>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .app-sidebar { transform: translateX(0) !important; }
          .app-main { margin-left: 256px; }
          .sidebar-backdrop { display: none !important; }
        }
        @media (max-width: 1023px) {
          .app-sidebar { transform: translateX(-100%); }
          .app-main { margin-left: 0; }
        }
      `}</style>
    </div>
  );
};

MerchantLayout.propTypes = { children: PropTypes.node.isRequired };
export default MerchantLayout;
