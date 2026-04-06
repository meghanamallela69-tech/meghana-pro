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
      `flex items-center justify-between gap-3 px-4 py-2 rounded-md transition ${
        isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
      }`
    }
  >
    <div className="flex items-center gap-3">
      <Icon className="text-lg" />
      <span className="text-sm font-medium">{label}</span>
    </div>
    {badge !== undefined && badge > 0 && (
      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </NavLink>
);

const AdminSidebar = ({ onLogout, onClose }) => {
  const { badgeCounts } = useNotificationBadges();

  return (
    <div className="h-full w-64 bg-white text-gray-800 flex flex-col border-r border-gray-200">
      <div className="px-4 py-4 text-lg font-semibold border-b border-gray-200 text-blue-600 flex items-center justify-between">
        <span>Event Admin Panel</span>
        <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-gray-100 text-gray-500">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div role="navigation" className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
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
      <div className="p-2 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 justify-center px-4 py-2 rounded-md bg-red-500 text-white transition hover:bg-red-600 shadow-sm"
        >
          <FiLogOut className="text-lg" />
          <span className="text-sm font-medium">Logout</span>
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
