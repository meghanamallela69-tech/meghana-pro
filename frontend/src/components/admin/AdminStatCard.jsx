import PropTypes from "prop-types";

/**
 * Reusable stat card used across all admin pages.
 * Mobile: icon shrinks, text wraps cleanly — no overlap.
 * Desktop: unchanged layout.
 */
const AdminStatCard = ({ label, value, icon: Icon, iconBg = "bg-blue-100", iconColor = "text-blue-600", valueColor = "text-gray-900" }) => (
  <div className="bg-white p-3 md:p-6 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-sm text-gray-600 font-medium leading-tight">{label}</p>
        <p className={`text-xs md:text-2xl font-bold mt-1 leading-tight break-all ${valueColor}`} title={String(value)}>{value}</p>
      </div>
      <div className={`flex-shrink-0 w-8 h-8 md:w-12 md:h-12 ${iconBg} rounded-full flex items-center justify-center mt-0.5`}>
        {Icon && <Icon className={`text-xs md:text-xl ${iconColor}`} />}
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
