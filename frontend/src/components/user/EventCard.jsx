import PropTypes from "prop-types";
import toast from "react-hot-toast";

const statusClass = (s) => {
  if (s === "Upcoming") return "bg-green-100 text-green-700";
  if (s === "Full") return "bg-yellow-100 text-yellow-700";
  if (s === "Cancelled") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

const ShareIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

const EventCard = ({ image, title, date, location, status, actionText = "View", onAction, eventId, expired = false }) => {
  const handleShare = (e) => {
    e.stopPropagation();
    const url = eventId
      ? `${window.location.origin}/dashboard/user/events/${eventId}`
      : window.location.href;
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition">
      <div className="h-36 w-full overflow-hidden relative">
        <img src={image} alt={title} className="w-full h-full object-cover" />
        {expired && (
          <span style={{ position: 'absolute', top: 8, right: 8, background: '#4b5563', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, letterSpacing: '0.5px' }}>
            COMPLETED
          </span>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold truncate flex-1 mr-2">{title}</h4>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-xs px-2 py-1 rounded ${statusClass(status)}`}>{status}</span>
            <button
              onClick={handleShare}
              className="p-1.5 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition"
              title="Share event"
            >
              <ShareIcon />
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-600">{date}</div>
        <div className="text-sm text-gray-600">{location}</div>
        {expired ? (
          <div className="mt-2 w-full px-3 py-2 rounded-lg bg-gray-100 text-gray-400 text-center font-medium text-sm cursor-not-allowed border border-gray-200">
            🚫 Event Completed
          </div>
        ) : (
          <button
            className="mt-2 w-full px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-black transition"
            onClick={onAction}
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};

EventCard.propTypes = {
  image: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  location: PropTypes.string.isRequired,
  status: PropTypes.string,
  actionText: PropTypes.string,
  onAction: PropTypes.func,
  eventId: PropTypes.string,
  expired: PropTypes.bool,
};

export default EventCard;
