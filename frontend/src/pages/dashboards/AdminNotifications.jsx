import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import AdminLayout from "../../components/admin/AdminLayout";
import useAuth from "../../context/useAuth";
import useNotificationBadges from "../../context/useNotificationBadges";
import { API_BASE, authHeaders } from "../../lib/http";
import { FaBell, FaEnvelope, FaCheck, FaTrash, FaEye, FaSearch, FaFilter, FaCalendarAlt, FaDollarSign, FaInbox } from "react-icons/fa";
import toast from "react-hot-toast";

const AdminNotifications = () => {
  const { token } = useAuth();
  const { refreshBadges } = useNotificationBadges();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    status: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(activeFilter !== 'all' && { type: activeFilter })
      });

      const response = await axios.get(
        `${API_BASE}/notifications?${queryParams}`, 
        { headers: authHeaders(token) }
      );
      
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        setTotalPages(response.data.pagination?.pages || 0);
        setTotalCount(response.data.pagination?.total || 0);
        setUnreadCount(response.data.notifications?.filter(n => !n.read).length || 0);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast.error(error.response?.data?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, activeFilter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleFilterChange = (filterType) => {
    setActiveFilter(filterType);
    setCurrentPage(1);
  };



  const markAsRead = async (id) => {
    try {
      const response = await axios.patch(
        `${API_BASE}/notifications/${id}/read`,
        {},
        { headers: authHeaders(token) }
      );

      if (response.data.success) {
        toast.success("Notification marked as read");
        loadNotifications();
        refreshBadges();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    if (!confirm("Mark all notifications as read?")) return;

    try {
      const response = await axios.post(
        `${API_BASE}/notifications/mark-all-read`,
        {},
        { headers: authHeaders(token) }
      );

      if (response.data.success) {
        toast.success("All notifications marked as read");
        loadNotifications();
        refreshBadges();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to mark all as read");
    }
  };

  const deleteNotification = async (id) => {
    if (!confirm("Delete this notification?")) return;

    try {
      const response = await axios.delete(
        `${API_BASE}/notifications/${id}`,
        { headers: authHeaders(token) }
      );

      if (response.data.success) {
        toast.success("Notification deleted");
        loadNotifications();
        refreshBadges();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete notification");
    }
  };

  const filteredNotifications = notifications.filter(notif =>
    notif.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (notif.type && notif.type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getTypeBadgeColor = (type) => {
    if (type?.includes('booking')) {
      return 'bg-blue-100 text-blue-700';
    } else if (type?.includes('payment')) {
      return 'bg-green-100 text-green-700';
    } else if (type?.includes('system') || type?.includes('registration') || type?.includes('event') || type?.includes('report')) {
      return 'bg-purple-100 text-purple-700';
    } else {
      return 'bg-gray-100 text-gray-700';
    }
  };

  const getNotificationIcon = (type) => {
    if (type?.includes('booking')) {
      return <FaCalendarAlt className="text-blue-600" />;
    } else if (type?.includes('payment')) {
      return <FaDollarSign className="text-green-600" />;
    } else {
      return <FaBell className="text-purple-600" />;
    }
  };

  const filterTabs = [
    { key: 'all', label: 'All', count: totalCount },
    { key: 'booking', label: 'Bookings', icon: FaCalendarAlt },
    { key: 'payment', label: 'Payments', icon: FaDollarSign },
    { key: 'system', label: 'System', icon: FaBell },
  ];

  const createSelfNotification = async () => {
    try {
      const res = await axios.post(
        `${API_BASE}/notifications/admin-self`,
        { message: "Admin notification system is working correctly.", type: "system" },
        { headers: authHeaders(token) }
      );
      if (res.data.success) {
        toast.success("Notification created!");
        loadNotifications();
        refreshBadges();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create notification");
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Notifications</h2>
            <p className="text-gray-600 mt-1">Manage your alerts and messages</p>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 responsive-btn"
              >
                <FaCheck /> <span className="btn-label">Mark All Read ({unreadCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Notifications</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FaBell className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Unread</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{unreadCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <FaEnvelope className="text-red-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Read</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{totalCount - unreadCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <FaCheck className="text-green-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  activeFilter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {Icon && <Icon className="text-sm" />}
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeFilter === tab.key ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">All Notifications</h3>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FaInbox className="mx-auto text-6xl text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {searchTerm ? 'No matching notifications' : 'No notifications yet'}
            </h3>
            <p className="text-gray-500 text-sm">
              {searchTerm ? 'Try adjusting your search terms' : 'Notifications will appear here when customers register, make bookings, or merchants request withdrawals.'}
            </p>
            {!searchTerm && (
              <button
                onClick={createSelfNotification}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
              >
                Test Notification System
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredNotifications.map((notif) => (
              <div 
                key={notif._id} 
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !notif.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-medium ${
                          !notif.read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notif.message}
                        </p>
                        {!notif.read && (
                          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeBadgeColor(notif.type)}`}>
                          {notif.type?.replace('_', ' ') || 'general'}
                        </span>
                        <span>{new Date(notif.createdAt).toLocaleString('en-IN')}</span>
                        {notif.bookingId && (
                          <span className="text-xs">
                            Booking: {notif.bookingId.serviceTitle || 'N/A'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!notif.read && (
                      <button
                        onClick={() => markAsRead(notif._id)}
                        className="text-green-600 hover:text-green-800 p-2"
                        title="Mark as read"
                      >
                        <FaCheck />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif._id)}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
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
    </AdminLayout>
  );
};

export default AdminNotifications;
