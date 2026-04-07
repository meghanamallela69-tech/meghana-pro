import { NavLink } from "react-router-dom";
import { RxDashboard } from "react-icons/rx";
import { BsCalendar2Event, BsBell } from "react-icons/bs";
import { FaUsers, FaListAlt, FaStore, FaCreditCard, FaUser, FaClipboardCheck, FaExclamationTriangle } from "react-icons/fa";
import { FiSettings, FiLogOut } from "react-icons/fi";
import PropTypes from "prop-types";
import useNotificationBadges from "../../context/useNotificationBadges";

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

const AdminSidebar = ({ onLogout, onClose }) => {
  const { badgeCounts } = useNotificationBadges();

  return (
    <div style={{ height: "100%", width: "100%", background: "#fff", display: "flex", flexDirection: "column" }}>
      <div className="px-4 py-4 text-lg font-semibold border-b border-gray-200 text-blue-600 flex items-center justify-between" style={{ flexShrink: 0 }}>
        <span>Event Admin Panel</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div role="navigation" style={{ flex: 1, overflowY: "auto", overflowX: "visible", padding: "8px" }}>
        <Item icon={RxDashboard} label="Dashboard" to="/dashboard/admin" />
        <Item icon={FaUsers} label="Users" to="/dashboard/admin/users" />
        <Item icon={FaStore} label="Merchants" to="/dashboard/admin/merchants" />
        <Item icon={BsCalendar2Event} label="Events" to="/dashboard/admin/events" />
        <Item icon={FaListAlt} label="Bookings" to="/dashboard/admin/registrations" />
        <Item icon={FaCreditCard} label="Payments" to="/dashboard/admin/payments" />
        <Item icon={FaClipboardCheck} label="Audit Logs" to="/dashboard/admin/audit-logs" />
        <Item icon={FaExclamationTriangle} label="Complaints" to="/dashboard/admin/complaints" />
        <Item icon={FaUser} label="Profile" to="/dashboard/admin/profile" />
        <Item icon={BsBell} label="Notifications" to="/dashboard/admin/notifications" badge={badgeCounts.total} />
        <Item icon={FiSettings} label="Settings" to="/dashboard/admin/settings" />
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

export default AdminSidebar;
Item.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
};
AdminSidebar.propTypes = {
  onLogout: PropTypes.func,
  onClose: PropTypes.func,
};
