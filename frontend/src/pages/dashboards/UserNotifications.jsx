import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useAuth from "../../context/useAuth";
import useNotificationBadges from "../../context/useNotificationBadges";
import UserLayout from "../../components/user/UserLayout";
import { API_BASE, authHeaders } from "../../lib/http";
import { toast } from "react-hot-toast";
import {
  FaBell, FaTrash, FaCheck, FaInbox, FaCalendarAlt,
  FaDollarSign, FaTicketAlt, FaSearch, FaCheckCircle,
  FaTimesCircle, FaExclamationCircle, FaArrowRight
} from "react-icons/fa";

// ── helpers ──────────────────────────────────────────────────────────────────
const timeAgo = (d) => {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (day < 7) return `${day}d ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const TYPE_META = {
  booking:              { icon: FaCalendarAlt, bg: "bg-green-100",  text: "text-green-600",  label: "Booking" },
  booking_request:      { icon: FaCalendarAlt, bg: "bg-purple-100", text: "text-purple-600", label: "Booking" },
  booking_approved:     { icon: FaCheckCircle, bg: "bg-green-100",  text: "text-green-600",  label: "Approved" },
  booking_update:       { icon: FaCalendarAlt, bg: "bg-blue-100",   text: "text-blue-600",   label: "Update" },
  booking_cancelled:    { icon: FaTimesCircle, bg: "bg-red-100",    text: "text-red-600",    label: "Cancelled" },
  booking_completed:    { icon: FaCheckCircle, bg: "bg-teal-100",   text: "text-teal-600",   label: "Completed" },
  booking_status_update:{ icon: FaCalendarAlt, bg: "bg-blue-100",   text: "text-blue-600",   label: "Status" },
  payment:              { icon: FaDollarSign,  bg: "bg-blue-100",   text: "text-blue-600",   label: "Payment" },
  payment_received:     { icon: FaDollarSign,  bg: "bg-green-100",  text: "text-green-600",  label: "Paid" },
  payment_failed:       { icon: FaExclamationCircle, bg: "bg-red-100", text: "text-red-600", label: "Failed" },
  payment_request:      { icon: FaDollarSign,  bg: "bg-orange-100", text: "text-orange-600", label: "Payment" },
  general:              { icon: FaBell,        bg: "bg-amber-100",  text: "text-amber-600",  label: "Info" },
  system:               { icon: FaBell,        bg: "bg-gray-100",   text: "text-gray-600",   label: "System" },
};

const getMeta = (type) => TYPE_META[type] || TYPE_META.general;

const getActionLink = (notif, navigate) => {
  if (notif.actionUrl) return () => navigate(notif.actionUrl);
  if (notif.bookingId) return () => navigate("/dashboard/user/bookings");
  if (notif.eventId)   return () => navigate("/dashboard/user/browse");
  return null;
};

const FILTERS = [
  { key: "all",     label: "All" },
  { key: "booking", label: "Bookings",  icon: FaCalendarAlt },
  { key: "payment", label: "Payments",  icon: FaDollarSign },
];

// ── component ─────────────────────────────────────────────────────────────────
const UserNotifications = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { refreshBadges } = useNotificationBadges();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0, hasNext: false, hasPrev: false });

  const load = useCallback(async (pg = 1, f = filter) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: pg, limit: "20" });
      if (f !== "all") params.append("type", f);
      const { data } = await axios.get(`${API_BASE}/notifications?${params}`, { headers: authHeaders(token) });
      if (data.success) {
        setNotifications(data.notifications || []);
        setPagination(data.pagination || {});
        setPage(pg);
      }
    } catch { toast.error("Failed to load notifications"); }
    finally { setLoading(false); }
  }, [token, filter]);

  useEffect(() => { load(1, filter); }, [filter]);

  const markRead = async (id) => {
    await axios.patch(`${API_BASE}/notifications/${id}/read`, {}, { headers: authHeaders(token) });
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    refreshBadges();
  };

  const markAllRead = async () => {
    await axios.post(`${API_BASE}/notifications/mark-all-read`, {}, { headers: authHeaders(token) });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    refreshBadges();
    toast.success("All marked as read");
  };

  const del = async (id) => {
    await axios.delete(`${API_BASE}/notifications/${id}`, { headers: authHeaders(token) });
    setNotifications(prev => prev.filter(n => n._id !== id));
    refreshBadges();
  };

  const delAll = async () => {
    if (!window.confirm("Delete all notifications?")) return;
    await Promise.all(notifications.map(n => axios.delete(`${API_BASE}/notifications/${n._id}`, { headers: authHeaders(token) })));
    setNotifications([]);
    refreshBadges();
    toast.success("All deleted");
  };

  const visible = notifications.filter(n =>
    !search || n.message.toLowerCase().includes(search.toLowerCase())
  );
  const unread = visible.filter(n => !n.read).length;

  return (
    <UserLayout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Notifications</h2>
          <p className="text-gray-500 text-sm mt-0.5">Your bookings, payments and updates</p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={markAllRead} className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium transition responsive-btn">
              <span className="btn-label">Mark All Read</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={delAll} className="px-4 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-medium transition">
              Delete All
            </button>
          )}
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-2">
          {FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition ${
                filter === key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {Icon && <Icon size={13} />} {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between bg-gray-50">
          <span className="text-sm font-medium text-gray-700">
            {pagination.total || visible.length} notification{(pagination.total || visible.length) !== 1 ? "s" : ""}
          </span>
          {unread > 0 && (
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">
              {unread} unread
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading notifications...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <FaInbox className="mx-auto text-5xl text-gray-300 mb-4" />
            <p className="font-semibold text-gray-700">No notifications yet</p>
            <p className="text-gray-400 text-sm mt-1">Booking and payment updates will appear here</p>
            <button onClick={() => navigate("/dashboard/user/browse")} className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
              Browse Events
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {visible.map((notif) => {
              const meta = getMeta(notif.type);
              const Icon = meta.icon;
              const action = getActionLink(notif, navigate);

              return (
                <div
                  key={notif._id}
                  className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition ${!notif.read ? "bg-blue-50/40 border-l-4 border-l-blue-500" : ""}`}
                >
                  {/* Icon */}
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.bg}`}>
                    <Icon className={`text-sm ${meta.text}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-5 ${!notif.read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-gray-400">{timeAgo(notif.createdAt)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.bg} ${meta.text}`}>
                        {meta.label}
                      </span>
                      {!notif.read && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">NEW</span>
                      )}
                    </div>

                    {/* Action button */}
                    {action && (
                      <button
                        onClick={action}
                        className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {notif.bookingId ? "View Booking" : "View Event"}
                        <FaArrowRight size={10} />
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    {!notif.read && (
                      <button onClick={() => markRead(notif._id)} title="Mark as read"
                        className="p-2 text-green-600 hover:bg-green-100 rounded-full transition">
                        <FaCheck size={12} />
                      </button>
                    )}
                    <button onClick={() => del(notif._id)} title="Delete"
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition">
                      <FaTrash size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-5 py-3 border-t flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">Page {page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <button onClick={() => load(page - 1)} disabled={!pagination.hasPrev}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-40">Prev</button>
              <button onClick={() => load(page + 1)} disabled={!pagination.hasNext}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Responsive Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 767px) {
          .responsive-btn { 
            padding: 6px 10px !important; 
            font-size: 12px !important; 
          }
          .btn-label { display: none; }
        }
      ` }} />
    </UserLayout>
  );
};

export default UserNotifications;
