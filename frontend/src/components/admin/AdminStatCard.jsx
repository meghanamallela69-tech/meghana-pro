import PropTypes from "prop-types";

/**
 * Reusable stat card used across all admin pages.
 * Mobile: icon shrinks, text wraps cleanly — no overlap.
 * Desktop: unchanged layout.
 */
const AdminStatCard = ({ label, value, icon: Icon, iconBg = "bg-blue-100", iconColor = "text-blue-600", valueColor = "text-gray-900" }) => (
  <div className="bg-white p-3 md:p-6 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-sm text-gray-600 font-medium break-words">{label}</p>
        <p className={`text-lg md:text-2xl font-bold mt-1 break-words ${valueColor}`}>{value}</p>
      </div>
      <div className={`flex-shrink-0 w-9 h-9 md:w-12 md:h-12 ${iconBg} rounded-full flex items-center justify-center`}>
        {Icon && <Icon className={`text-sm md:text-xl ${iconColor}`} />}
      </div>
    </div>
  </div>
);

AdminStatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  icon: PropTypes.elementType,
  iconBg: PropTypes.string,
  iconColor: PropTypes.string,
  valueColor: PropTypes.string,
};

export default AdminStatCard;
