import { NavLink } from "react-router-dom";
import { RxDashboard } from "react-icons/rx";
import { BsCalendar2Event, BsBell, BsGraphUp, BsTicket, BsMegaphone } from "react-icons/bs";
import { FaListAlt, FaCreditCard, FaUser, FaSignOutAlt, FaPlusCircle, FaRegCalendarCheck, FaCog, FaDollarSign, FaTags, FaEnvelope, FaQrcode, FaStar } from "react-icons/fa";
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
    {badge > 0 && (
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

const MerchantSidebar = ({ onLogout, onClose }) => {
  const { badgeCounts } = useNotificationBadges();
  
  return (
    <div style={{ height: "100%", width: "100%", background: "#fff", display: "flex", flexDirection: "column" }}>
      <div className="px-4 py-4 text-lg font-semibold border-b border-gray-200 text-blue-600 flex items-center justify-between" style={{ flexShrink: 0 }}>
        <span>Merchant Panel</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div role="navigation" style={{ flex: 1, overflowY: "auto", overflowX: "visible", padding: "8px" }}>
        <Item icon={RxDashboard} label="Dashboard" to="/dashboard/merchant" />
        <Item icon={BsCalendar2Event} label="My Events" to="/dashboard/merchant/events" />
        <Item icon={FaPlusCircle} label="Create Event" to="/dashboard/merchant/create" />
        <Item icon={FaRegCalendarCheck} label="Bookings / Registrations" to="/dashboard/merchant/bookings" badge={badgeCounts.bookings} />
        <Item icon={FaDollarSign} label="Earnings" to="/dashboard/merchant/earnings" />
        <Item icon={FaCreditCard} label="Payments" to="/dashboard/merchant/payments" badge={badgeCounts.payments} />
        <Item icon={FaEnvelope} label="Messages" to="/dashboard/merchant/messages" />
        <Item icon={BsGraphUp} label="Event Analytics" to="/dashboard/merchant/analytics" />
        <Item icon={FaStar} label="Ratings & Reviews" to="/dashboard/merchant/ratings" />
        <Item icon={BsTicket} label="Ticket Validation" to="/dashboard/merchant/ticket-validation" />
        <Item icon={FaQrcode} label="QR Codes" to="/dashboard/merchant/qr-codes" />
        <Item icon={BsMegaphone} label="Marketing Tools" to="/dashboard/merchant/marketing" />
        <Item icon={BsBell} label="Notifications" to="/dashboard/merchant/notifications" badge={badgeCounts.total} />
        <Item icon={FaUser} label="Profile" to="/dashboard/merchant/profile" />
        <Item icon={FaCog} label="Settings" to="/dashboard/merchant/settings" />
      </div>
      <div style={{ padding: "12px", borderTop: "1px solid #e5e7eb", flexShrink: 0 }}>
        <button
          onClick={onLogout}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 8, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
        >
          <FaSignOutAlt style={{ fontSize: 16 }} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default MerchantSidebar;
Item.propTypes = {
  icon: PropTypes.elementType,
  label: PropTypes.string,
  to: PropTypes.string,
};
MerchantSidebar.propTypes = {
  onLogout: PropTypes.func,
  onClose: PropTypes.func,
};
