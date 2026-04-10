import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

const SummaryCard = ({ title, value, icon: Icon, color = "bg-blue-600", to }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={to ? () => navigate(to) : undefined}
      className={`group overflow-hidden rounded-xl bg-white p-3 md:p-5 shadow-sm ring-1 ring-gray-200 hover:shadow-md transition w-full ${to ? "cursor-pointer hover:ring-2 hover:ring-blue-400" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs md:text-sm text-gray-500 break-words leading-tight">{title}</div>
          <div className="mt-1 text-lg md:text-2xl font-semibold break-words leading-tight">
            {value !== undefined && value !== null ? value : 0}
          </div>
        </div>
        <div className={`h-9 w-9 md:h-12 md:w-12 flex-shrink-0 ${color} text-white flex items-center justify-center rounded-lg group-hover:scale-105 transition`}>
          {Icon && <Icon className="text-sm md:text-xl" />}
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
SummaryCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  icon: PropTypes.elementType,
  color: PropTypes.string,
  to: PropTypes.string,
};
