import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { RxDashboard } from "react-icons/rx";
import { BsCalendarEvent, BsBookmarkHeart, BsSearch } from "react-icons/bs";
import { FaUser, FaTicketAlt, FaHome, FaCreditCard, FaEnvelope, FaStar } from "react-icons/fa";
import { FiBell, FiLogOut } from "react-icons/fi";
import PropTypes from "prop-types";
import axios from "axios";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";

const Item = ({ icon: Icon, label, to, badge }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
        isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
      }`
    }
    style={{ overflow: "visible" }}
  >
    <Icon style={{ fontSize: 17, flexShrink: 0 }} />
    <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{label}</span>
    {badge !== undefined && badge > 0 && (
      <span style={{
        background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 700,
        padding: "1px 7px", borderRadius: 20, minWidth: 20, textAlign: "center",
        flexShrink: 0, lineHeight: "18px",
      }}>
        {badge > 99 ? "99+" : badge}
      </span>
    )}
  </NavLink>
);

Item.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
};

const UserSidebar = ({ onLogout, onClose }) => {
  const { token } = useAuth();
  const [messageCount, setMessageCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    loadUnreadCounts();
    const interval = setInterval(loadUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const loadUnreadCounts = async () => {
    try {
      const msgResponse = await axios.get(`${API_BASE}/message/unread-count`, { 
        headers: authHeaders(token) 
      });
      if (msgResponse.data.success) setMessageCount(msgResponse.data.count || 0);
      
      const notifResponse = await axios.get(`${API_BASE}/notifications/unread-counts`, { 
        headers: authHeaders(token) 
      });
      if (notifResponse.data.success) setNotificationCount(notifResponse.data.data?.total || 0);
    } catch {}
  };

  return (
    <div style={{ height: "100%", width: "100%", background: "#fff", display: "flex", flexDirection: "column" }}>
      <div className="px-4 py-4 text-lg font-semibold border-b border-gray-200 text-blue-600 flex items-center justify-between" style={{ flexShrink: 0 }}>
        <span>User Dashboard</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div role="navigation" style={{ flex: 1, overflowY: "auto", overflowX: "visible", padding: "8px" }}>
        <Item icon={RxDashboard} label="Dashboard" to="/dashboard/user" />
        <Item icon={BsSearch} label="Browse Events" to="/dashboard/user/browse" />
        <Item icon={FaTicketAlt} label="My Bookings" to="/dashboard/user/bookings" />
        <Item icon={FaCreditCard} label="Payments" to="/dashboard/user/payments" />
        <Item icon={FaEnvelope} label="Messages" to="/dashboard/user/messages" badge={messageCount} />
        <Item icon={BsBookmarkHeart} label="Saved Events" to="/dashboard/user/saved" />
        <Item icon={FaStar} label="My Reviews" to="/dashboard/user/reviews" />
        <Item icon={FiBell} label="Notifications" to="/dashboard/user/notifications" badge={notificationCount} />
        <Item icon={FaUser} label="My Profile" to="/dashboard/user/profile" />
        <Item icon={FaHome} label="Back to Home" to="/home" />
      </div>
      <div style={{ padding: "12px", borderTop: "1px solid #e5e7eb", flexShrink: 0 }}>
        <button
          onClick={onLogout}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 8, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
        >
          <FiLogOut style={{ fontSize: 16 }} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

UserSidebar.propTypes = {
  onLogout: PropTypes.func,
  onClose: PropTypes.func,
};

export default UserSidebar;
