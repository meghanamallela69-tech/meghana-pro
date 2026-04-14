import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";
import MerchantLayout from "../../components/merchant/MerchantLayout";
import { FaListAlt, FaCheck, FaTimes, FaTicketAlt, FaClock, FaCreditCard, FaSearch, FaFilter, FaEye, FaUser, FaCalendarAlt, FaMapMarkerAlt, FaRupeeSign } from "react-icons/fa";
import toast from "react-hot-toast";
import useNotificationBadges from "../../context/useNotificationBadges";

const MerchantBookings = () => {
  const { token } = useAuth();
  const { resetBookingBadge } = useNotificationBadges();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  
  // Filters and search
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  


  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/merchant/bookings`, { 
        headers: authHeaders(token) 
      });
      setBookings(data.bookings || []);
    } catch (error) {
      console.error("Error loading bookings:", error);
      toast.error(error.response?.data?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadBookings();
    // Reset booking badge when viewing bookings page (only once)
    const timer = setTimeout(() => {
      resetBookingBadge();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadBookings]);

  const handleApprove = async (bookingId) => {
    setProcessingId(bookingId);
    try {
      await axios.put(
        `${API_BASE}/merchant/bookings/${bookingId}/approve`,
        { message: "Your booking has been approved. Please proceed with the payment." },
        { headers: authHeaders(token) }
      );
      toast.success("Booking approved! Customer notified to pay.");
      loadBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to approve booking");
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmPayment = async (bookingId) => {
    setProcessingId(bookingId);
    try {
      await axios.put(
        `${API_BASE}/bookings/merchant/${bookingId}/confirm`,
        {},
        { headers: authHeaders(token) }
      );
      toast.success("Payment confirmed and ticket generated!");
      loadBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to confirm payment");
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateStatus = async (bookingId, newStatus) => {
    setProcessingId(bookingId);
    try {
      await axios.put(
        `${API_BASE}/merchant/bookings/${bookingId}/status`,
        { status: newStatus, bookingStatus: newStatus },
        { headers: authHeaders(token) }
      );
      toast.success(`Status updated to ${newStatus}`);
      loadBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRequestAdvance = async (bookingId) => {
    if (!window.confirm("Request advance payment from customer?")) return;
    
    setProcessingId(bookingId);
    try {
      await axios.post(
        `${API_BASE}/bookings/merchant/${bookingId}/request-advance`,
        {},
        { headers: authHeaders(token) }
      );
      toast.success("Advance payment requested! Customer notified.");
      loadBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to request advance");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkComplete = async (bookingId) => {
    if (!window.confirm("Mark this booking as complete? The customer will be prompted to pay the remaining amount and rate the event.")) return;
    
    setProcessingId(bookingId);
    try {
      await axios.put(
        `${API_BASE}/merchant/bookings/${bookingId}/status`,
        { status: "completed", bookingStatus: "completed" },
        { headers: authHeaders(token) }
      );
      toast.success("Booking marked as complete! Customer can now pay remaining and rate.");
      loadBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to mark as complete");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (bookingId) => {
    const message = prompt("Enter reason for rejection (optional):", "");
    if (message === null) return;
    
    setProcessingId(bookingId);
    try {
      await axios.put(
        `${API_BASE}/merchant/bookings/${bookingId}/status`,
        { status: "rejected", message },
        { headers: authHeaders(token) }
      );
      toast.success("Booking rejected");
      loadBookings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject booking");
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewDetails = async (bookingId) => {
    try {
      const { data } = await axios.get(`${API_BASE}/merchant/bookings/${bookingId}/details`, {
        headers: authHeaders(token)
      });
      if (data.success) {
        setViewingBooking(data.booking);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load booking details");
    }
  };

  const handleValidateTickets = async (bookingId) => {
    setProcessingId(bookingId);
    try {
      const { data } = await axios.post(
        `${API_BASE}/merchant/bookings/${bookingId}/validate-tickets`,
        {},
        { headers: authHeaders(token) }
      );
      
      if (data.success) {
        toast.success(`Tickets validated! ${data.validatedCount || 0} tickets verified.`);
        loadBookings(); // Refresh to show updated status
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to validate tickets");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === "TBD") return "Date TBD";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Date TBD";
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch (error) {
      return "Date TBD";
    }
  };

  const formatTime = (timeString) => {
    if (!timeString || timeString === "TBD" || timeString === "") return "Time TBD";
    return timeString;
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return "₹0";
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: "bg-amber-100 text-amber-700", label: "Pending" },
      approved: { color: "bg-blue-100 text-blue-700", label: "Approved" },
      accepted: { color: "bg-blue-100 text-blue-700", label: "Accepted" },
      rejected: { color: "bg-red-100 text-red-700", label: "Rejected" },
      cancelled: { color: "bg-gray-100 text-gray-700", label: "Cancelled" },
      confirmed: { color: "bg-green-100 text-green-700", label: "Confirmed" },
      processing: { color: "bg-indigo-100 text-indigo-700", label: "Processing" },
      completed: { color: "bg-green-600 text-white", label: "Completed" },
      paid: { color: "bg-purple-100 text-purple-700", label: "Paid" },
      pending_payment: { color: "bg-yellow-100 text-yellow-700", label: "Awaiting Payment" }
    };
    
    const config = statusConfig[status?.toLowerCase()] || { color: "bg-gray-100 text-gray-700", label: status || "Unknown" };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const isPaid = paymentStatus === 'paid';
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {isPaid ? 'Paid' : 'Pending'}
      </span>
    );
  };

  // Filter and search logic
  const filteredBookings = bookings.filter((booking) => {
    if (eventTypeFilter !== "all" && booking.eventType !== eventTypeFilter) {
      return false;
    }
    
    if (statusFilter !== "all" && booking.bookingStatus !== statusFilter) {
      return false;
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const userName = booking.userName?.toLowerCase() || "";
      const eventName = booking.eventName?.toLowerCase() || "";
      const userEmail = booking.userEmail?.toLowerCase() || "";
      
      return userName.includes(query) || eventName.includes(query) || userEmail.includes(query);
    }
    
    return true;
  });

  return (
    <MerchantLayout>
      <section className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold">All Bookings</h2>
            <p className="text-gray-600 mt-1">Manage all customer bookings for ticketed and full-service events</p>
          </div>

        </div>
      </section>

      {/* Stats */}
      <section className="merchant-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Full Service</p>
          <p className="text-2xl font-bold text-blue-600">
            {bookings.filter((b) => b.eventType === "full-service").length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Ticketed Events</p>
          <p className="text-2xl font-bold text-purple-600">
            {bookings.filter((b) => b.eventType === "ticketed").length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Pending Approval</p>
          <p className="text-2xl font-bold text-amber-600">
            {bookings.filter((b) => b.bookingStatus === "pending" && b.eventType === "full-service").length}
          </p>
        </div>
      </section>

      {/* Filters and Search */}
      <section className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <FaFilter className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Event Types</option>
              <option value="full-service">Full Service</option>
              <option value="ticketed">Ticketed</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="relative w-full md:w-80">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user name, email, or event name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Bookings Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <FaListAlt className="mx-auto text-4xl text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">No bookings found</p>
          <p className="text-gray-400 mt-2">Bookings will appear here when customers register</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AddOns</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-gray-600">
                      {booking._id.slice(-8)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="font-medium text-gray-900">{booking.userName}</div>
                      <div className="text-xs text-gray-500">{booking.userEmail}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {booking.eventName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        booking.eventType === 'full-service' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {booking.eventType === 'full-service' ? 'Full Service' : 'Ticketed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(booking.date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatTime(booking.time)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate" title={booking.location}>
                      {booking.location || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {booking.quantity || booking.guestCount || 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {booking.addons && booking.addons.length > 0 ? (
                        <div className="space-y-1">
                          {booking.addons.map((addon, idx) => (
                            <div key={idx} className="text-xs">
                              {addon.name}: {formatCurrency(addon.price)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(booking.totalAmount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getPaymentStatusBadge(booking.paymentStatus)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(booking.bookingStatus)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(booking.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="flex gap-2 flex-wrap items-center">
                        {/* View Details button — always visible */}
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition flex items-center gap-1"
                        >
                          <FaEye size={11} /> Details
                        </button>

                        {/* ── TICKETED EVENTS: simple paid/ticket status only ── */}
                        {booking.eventType === 'ticketed' && (
                          <>
                            {booking.paymentStatus === 'paid' ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded flex items-center gap-1">
                                <FaCheck size={12} /> Paid
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded flex items-center gap-1">
                                <FaClock size={12} /> Awaiting Payment
                              </span>
                            )}
                          </>
                        )}

                        {/* ── FULL-SERVICE EVENTS: full workflow ── */}
                        {booking.eventType === 'full-service' && (
                          <>
                            {/* Pending - Request Advance or Reject */}
                            {booking.bookingStatus === 'pending' && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleRequestAdvance(booking._id)}
                                  disabled={processingId === booking._id}
                                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1"
                                >
                                  <FaCreditCard size={12} />
                                  Req. Advance
                                </button>
                                <button
                                  onClick={() => handleReject(booking._id)}
                                  disabled={processingId === booking._id}
                                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition disabled:opacity-50"
                                >
                                  <FaTimes size={12} />
                                </button>
                              </div>
                            )}

                            {/* Awaiting Advance */}
                            {(booking.bookingStatus === 'awaiting_advance' || booking.bookingStatus === 'advance_requested') && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded flex items-center gap-1">
                                <FaClock size={12} />
                                Awaiting Advance
                              </span>
                            )}

                            {/* Advance Paid - Approve/Reject */}
                            {booking.bookingStatus === 'advance_paid' && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleApprove(booking._id)}
                                  disabled={processingId === booking._id}
                                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1"
                                >
                                  <FaCheck size={12} />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(booking._id)}
                                  disabled={processingId === booking._id}
                                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition disabled:opacity-50"
                                >
                                  <FaTimes size={12} />
                                </button>
                              </div>
                            )}

                            {/* Accepted/Confirmed/Approved - Status Dropdown */}
                            {(booking.bookingStatus === 'accepted' || booking.bookingStatus === 'confirmed' || booking.bookingStatus === 'approved') && (
                              <select
                                value={booking.bookingStatus}
                                onChange={(e) => handleUpdateStatus(booking._id, e.target.value)}
                                disabled={processingId === booking._id}
                                className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="completed">Completed</option>
                              </select>
                            )}

                            {/* Processing - Mark Complete */}
                            {booking.bookingStatus === 'processing' && (
                              <button
                                onClick={() => handleMarkComplete(booking._id)}
                                disabled={processingId === booking._id}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1"
                              >
                                <FaCheck size={12} />
                                Mark Complete
                              </button>
                            )}

                            {/* Completed */}
                            {booking.bookingStatus === 'completed' && (
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded flex items-center gap-1">
                                  <FaCheck size={12} />
                                  Completed
                                </span>
                                {booking.rating?.score ? (
                                  <span className="text-xs text-yellow-600 font-medium">⭐ {booking.rating.score}/5</span>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">Awaiting rating</span>
                                )}
                              </div>
                            )}

                            {/* Rejected */}
                            {booking.bookingStatus === 'rejected' && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded flex items-center gap-1">
                                <FaTimes size={12} />
                                Rejected
                              </span>
                            )}

                            {/* Cancelled */}
                            {booking.bookingStatus === 'cancelled' && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded flex items-center gap-1">
                                <FaTimes size={12} />
                                Cancelled
                              </span>
                            )}
                          </>
                        )}

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Booking Details</h3>
              <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-700 text-xl font-bold">✕</button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Booking ID & Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-500">#{selectedBooking._id.slice(-10).toUpperCase()}</span>
                <div className="flex gap-2">
                  {getStatusBadge(selectedBooking.bookingStatus)}
                  {getPaymentStatusBadge(selectedBooking.paymentStatus)}
                </div>
              </div>

              {/* Customer */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</p>
                <div className="flex items-center gap-2">
                  <FaUser className="text-gray-400" />
                  <span className="font-medium text-gray-900">{selectedBooking.userName}</span>
                </div>
                {selectedBooking.userEmail && (
                  <p className="text-sm text-gray-600 ml-5">{selectedBooking.userEmail}</p>
                )}
              </div>

              {/* Event */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Event</p>
                <div className="flex items-center gap-2">
                  <FaCalendarAlt className="text-blue-500" />
                  <span className="font-medium text-gray-900">{selectedBooking.eventName || selectedBooking.serviceTitle}</span>
                </div>
                <div className="flex items-center gap-2 ml-5 text-sm text-gray-600">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${selectedBooking.eventType === 'ticketed' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                    {selectedBooking.eventType === 'ticketed' ? 'Ticketed' : 'Full Service'}
                  </span>
                </div>
                {selectedBooking.eventDate && (
                  <p className="text-sm text-gray-600 ml-5">📅 {formatDate(selectedBooking.eventDate)} {selectedBooking.eventTime && `at ${formatTime(selectedBooking.eventTime)}`}</p>
                )}
                {selectedBooking.location && (
                  <div className="flex items-center gap-2 ml-5 text-sm text-gray-600">
                    <FaMapMarkerAlt className="text-red-400" />
                    {selectedBooking.location}
                  </div>
                )}
              </div>

              {/* Ticket breakdown for ticketed events */}
              {selectedBooking.eventType === 'ticketed' && selectedBooking.selectedTickets && Object.keys(selectedBooking.selectedTickets).length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tickets</p>
                  {Object.entries(selectedBooking.selectedTickets).filter(([,v]) => Number(v) > 0).map(([type, qty]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="text-gray-700">🎟 {type}</span>
                      <span className="font-medium">× {qty}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add-ons */}
              {selectedBooking.addons?.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add-ons</p>
                  {selectedBooking.addons.map((a, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-700">{a.name}</span>
                      <span className="font-medium text-gray-900">₹{Number(a.price || 0).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pricing */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pricing</p>
                {selectedBooking.servicePrice > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Base Price</span>
                    <span>₹{Number(selectedBooking.servicePrice).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t pt-2">
                  <span className="text-gray-800">Total</span>
                  <span className="text-blue-700">₹{Number(selectedBooking.totalAmount || selectedBooking.totalPrice || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedBooking.notes && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-gray-700">{selectedBooking.notes}</p>
                </div>
              )}

              {/* Merchant response */}
              {selectedBooking.merchantResponse?.message && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Your Response</p>
                  <p className="text-sm text-gray-700">{selectedBooking.merchantResponse.message}</p>
                </div>
              )}

              <p className="text-xs text-gray-400 text-right">Booked on {new Date(selectedBooking.createdAt).toLocaleString()}</p>
            </div>

            <div className="p-5 border-t">
              <button onClick={() => setSelectedBooking(null)} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 767px) {
          .merchant-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
        }
      ` }} />
    </MerchantLayout>
  );
};

export default MerchantBookings;
