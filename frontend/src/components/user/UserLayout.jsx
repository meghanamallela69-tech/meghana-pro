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

      <aside style={{
        position: "fixed", left: 0, top: 0,
        height: "100%", width: 260,
        background: "#fff", zIndex: 200,
        boxShadow: "4px 0 20px rgba(0,0,0,0.15)",
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}>
        <UserSidebar onLogout={handleLogout} onClose={() => setSidebarOpen(false)} />
      </aside>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 199,
        }} />
      )}

      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <UserTopbar onToggleSidebar={() => setSidebarOpen(p => !p)} onLogout={handleLogout} />
        <main style={{ padding: "24px", flex: 1 }}>{children}</main>
      </div>
    </div>
  );
};

UserLayout.propTypes = { children: PropTypes.node.isRequired };
export default UserLayout;
