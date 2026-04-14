import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

const SummaryCard = ({ title, value, icon: Icon, color = "bg-blue-600", to }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={to ? () => navigate(to) : undefined}
      className={`summary-card group overflow-hidden rounded-xl bg-white p-3 md:p-5 shadow-sm ring-1 ring-gray-200 hover:shadow-md transition w-full ${to ? "cursor-pointer hover:ring-2 hover:ring-blue-400" : ""}`}
    >
      {/* Desktop layout: side by side */}
      <div className="summary-card-inner flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs md:text-sm text-gray-500 leading-tight">{title}</div>
          <div className="mt-1 text-lg md:text-2xl font-semibold leading-tight break-all">
            {value !== undefined && value !== null ? value : 0}
          </div>
        </div>
        <div className={`summary-card-icon h-9 w-9 md:h-12 md:w-12 flex-shrink-0 ${color} text-white flex items-center justify-center rounded-lg group-hover:scale-105 transition`}>
          {Icon && <Icon className="summary-card-icon-inner text-sm md:text-xl" />}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 767px) {
          .summary-card { position: relative !important; }
          .summary-card-inner { display: block !important; }
          .summary-card-icon {
            position: absolute !important;
            top: 8px !important;
            right: 8px !important;
            width: 26px !important;
            height: 26px !important;
            border-radius: 6px !important;
          }
          .summary-card-icon-inner { font-size: 11px !important; }
        }
      ` }} />
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
