import { useState } from "react";
import PropTypes from "prop-types";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import useAuth from "../../context/useAuth";
import { useNavigate } from "react-router-dom";

const AdminLayout = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>

      {/* Drawer sidebar — hidden by default on ALL screen sizes */}
      <aside style={{
        position: "fixed", left: 0, top: 0,
        height: "100%", width: 260,
        background: "#fff", zIndex: 200,
        boxShadow: "4px 0 20px rgba(0,0,0,0.15)",
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}>
        <AdminSidebar onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Backdrop */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 199,
        }} />
      )}

      {/* Full-width main — no margin offset */}
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <AdminTopbar onToggleSidebar={() => setSidebarOpen(p => !p)} onLogout={handleLogout} />
        <main style={{ padding: "24px", flex: 1 }}>{children}</main>
      </div>
    </div>
  );
};

AdminLayout.propTypes = { children: PropTypes.node.isRequired };
export default AdminLayout;
