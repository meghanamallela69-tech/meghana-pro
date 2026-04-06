import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import UserLayout from "../../components/user/UserLayout";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";
import { FiCalendar, FiMapPin, FiCheckCircle, FiClock, FiXCircle, FiCreditCard, FiDownload, FiStar } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import toast from "react-hot-toast";
import PaymentModal from "../../components/PaymentModal";
import TicketModal from "../../components/TicketModal";
import RatingModal from "../../components/RatingModal";

const UserMyEvents = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [processingId, setProcessingId] = useState(null);
  
  // Modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/bookings/my-bookings`, {
        headers: authHeaders(token),
      });
      
      if (response.data.success) {
        setBookings(response.data.bookings || []);
      } else {
        toast.error(response.data.message || "Failed to load bookings");
      }
    } catch (error) {
      console.error("Fetch bookings error:", error);
      toast.error(error.response?.data?.message || "Failed to load your bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    
    try {
      const response = await axios.put(`${API_BASE}/bookings/${bookingId}/cancel`, {}, {
        headers: authHeaders(token),
      });
      
      if (response.data.success) {
        toast.success("Booking cancelled successfully");
        fetchMyBookings();
      } else {
        toast.error(response.data.message || "Failed to cancel booking");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel booking");
    }
  };

  const handlePayAdvance = (booking) => {
    // Open payment modal for advance payment
    setSelectedBooking({
      ...booking,
      paymentType: "advance",  // Mark this as advance payment
      paymentAmount: booking.advanceAmount
    });
    setPaymentModalOpen(true);
  };

  const handlePayRemaining = (booking) => {
    setSelectedBooking(booking);
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false);
    fetchMyBookings();
  };

  const handleViewTicket = (booking) => {
    setSelectedBooking(booking);
    setTicketModalOpen(true);
  };

  const handleRateEvent = (booking) => {
    setSelectedBooking(booking);
    setRatingModalOpen(true);
  };

  const handleRatingSuccess = () => {
    setRatingModalOpen(false);
    fetchMyBookings();
  };

  const handleDownloadInvoice = (booking) => {
    import("../../utils/invoiceGenerator").then(({ generateInvoicePDF }) => {
      generateInvoicePDF({
        ...booking,
        userName: booking.attendeeName || booking.user?.name || "Customer",
        merchantName: booking.merchant?.name || "Merchant",
        eventTitle: booking.serviceTitle || booking.eventTitle,
        paymentId: booking.payment?.paymentId || booking._id,
        paymentMethod: booking.payment?.paymentMethod || "Online",
        bookingDate: booking.bookingDate || booking.createdAt,
      }).catch(() => toast.error("Failed to generate invoice"));
    });
  };

  const getStatusConfig = (booking) => {
    const status = booking.status?.toLowerCase();
    const paymentStatus = booking.paymentStatus?.toLowerCase();
    const isFullService = booking.eventType === "full-service";

    // ── Ticketed: simple paid/pending ──
    if (!isFullService) {
      if (paymentStatus === "paid" || status === "confirmed" || status === "completed") {
        return { color: "bg-green-100 text-green-700", label: "Confirmed" };
      }
      if (status === "cancelled") return { color: "bg-gray-100 text-gray-700", label: "Cancelled" };
      return { color: "bg-amber-100 text-amber-700", label: "Awaiting Payment" };
    }

    // ── Full-service workflow ──
    const bookingStatus = booking.bookingStatus?.toLowerCase();

    if ((status === "completed" || bookingStatus === "completed") && paymentStatus === "paid") {
      return { color: "bg-green-100 text-green-700", label: "Completed ✓" };
    }
    if ((status === "completed" || bookingStatus === "completed") && paymentStatus !== "paid") {
      return { color: "bg-orange-100 text-orange-700", label: "Pay Remaining to Complete" };
    }
    switch (status) {
      case "confirmed":   return { color: "bg-green-100 text-green-700",  label: "Confirmed" };
      case "processing":  return { color: "bg-indigo-100 text-indigo-700", label: "In Progress" };
      case "pending":     return { color: "bg-amber-100 text-amber-700",   label: "Pending Approval" };
      case "awaiting_advance": return { color: "bg-blue-100 text-blue-700", label: "Pay Advance Now" };
      case "advance_paid": return { color: "bg-teal-100 text-teal-700",   label: "Advance Paid – Awaiting Approval" };
      case "approved":
      case "accepted":    return { color: "bg-blue-100 text-blue-700",    label: "Approved" };
      case "rejected":    return { color: "bg-red-100 text-red-700",      label: "Rejected" };
      case "cancelled":   return { color: "bg-gray-100 text-gray-700",    label: "Cancelled" };
      default:            return { color: "bg-amber-100 text-amber-700",   label: status || "Pending" };
    }
  };

  const getActionButtons = (booking) => {
    const status = booking.status?.toLowerCase();
    const bookingStatus = booking.bookingStatus?.toLowerCase();
    const paymentStatus = booking.paymentStatus?.toLowerCase();
    const isFullyPaid = paymentStatus === "paid";
    const isFullService = booking.eventType === "full-service";
    const buttons = [];

    // ── TICKETED: just view ticket if paid ──
    if (!isFullService) {
      if (booking.ticket?.ticketNumber && isFullyPaid) {
        buttons.push(
          <button key="ticket" onClick={() => handleViewTicket(booking)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2">
            <FiDownload size={14} />
            View Ticket
          </button>
        );
      }
      if (!booking.rating?.score && isFullyPaid) {
        buttons.push(
          <button key="rate" onClick={() => handleRateEvent(booking)}
            className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition text-sm font-medium flex items-center gap-2">
            <FiStar size={14} />
            Rate Event
          </button>
        );
      }
      return buttons;
    }

    // ── FULL-SERVICE workflow ──

    // 1. Pay Advance
    if (status === "awaiting_advance" && booking.advanceRequired && !booking.advancePaid) {
      buttons.push(
        <button key="pay-advance" onClick={() => handlePayAdvance(booking)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2">
          <FaRupeeSign size={14} />
          Pay Advance ({formatPrice(booking.advanceAmount || 0)})
        </button>
      );
    }

    // 2. Pay Remaining — only when merchant marks completed
    const needsRemainingPayment =
      (status === "completed" || bookingStatus === "completed") &&
      booking.advancePaid &&
      booking.remainingAmount > 0 &&
      !isFullyPaid;

    if (needsRemainingPayment) {
      buttons.push(
        <button key="pay-remaining" onClick={() => handlePayRemaining(booking)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center gap-2">
          <FaRupeeSign size={14} />
          Pay Remaining ({formatPrice(booking.remainingAmount || 0)})
        </button>
      );
    }

    // 3. Download Invoice — fully paid + completed
    if (isFullyPaid && (status === "completed" || bookingStatus === "completed")) {
      buttons.push(
        <button key="invoice" onClick={() => handleDownloadInvoice(booking)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium flex items-center gap-2">
          <FiDownload size={14} />
          Download Invoice
        </button>
      );
    }

    // 4. Rate Event — fully paid + completed + not yet rated
    if (isFullyPaid && (status === "completed" || bookingStatus === "completed") && !booking.rating?.score) {
      buttons.push(
        <button key="rate" onClick={() => handleRateEvent(booking)}
          className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition text-sm font-medium flex items-center gap-2">
          <FiStar size={14} />
          Rate Event
        </button>
      );
    }

    // 5. Cancel — only before any payment
    if (["pending", "awaiting_advance"].includes(status) && !booking.advancePaid) {
      buttons.push(
        <button key="cancel" onClick={() => handleCancelBooking(booking._id)}
          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition text-sm font-medium">
          Cancel
        </button>
      );
    }

    return buttons;
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === "TBD") return "Date TBD";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Date TBD";
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Date TBD";
    }
  };

  const formatTime = (timeString) => {
    if (!timeString || timeString === "TBD") return "Time TBD";
    return timeString;
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return "Free";
    if (price === 0) return "Free";
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR', 
      maximumFractionDigits: 0 
    }).format(price);
  };

  const filteredBookings = bookings.filter((booking) => {
    if (activeTab === "all") return true;
    if (activeTab === "upcoming") {
      const eventDate = new Date(booking.eventDate);
      return eventDate >= new Date() && !["cancelled", "rejected"].includes(booking.status);
    }
    if (activeTab === "past") {
      const eventDate = new Date(booking.eventDate);
      return eventDate < new Date();
    }
    return true;
  });

  return (
    <UserLayout>
      <section className="mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold">My Bookings</h2>
        <p className="text-gray-600 mt-1">Manage your event bookings and payments</p>
      </section>

      {/* Stats Summary */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Awaiting Payment</p>
          <p className="text-2xl font-bold text-blue-600">
            {bookings.filter((b) => ["pending", "awaiting_advance"].includes(b.status)).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Confirmed</p>
          <p className="text-2xl font-bold text-green-600">
            {bookings.filter((b) => ["confirmed", "completed"].includes(b.status)).length}
          </p>
        </div>
      </section>

      {/* Tabs */}
      <section className="bg-white rounded-xl shadow-sm p-2 mb-6">
        <div className="flex gap-2">
          {["all", "upcoming", "past"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {/* Bookings List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-gray-500 text-lg">No bookings found</p>
          <p className="text-gray-400 mt-2">You haven't booked any events yet</p>
          <button
            onClick={() => navigate("/dashboard/user/browse")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Browse Events
          </button>
        </div>
      ) : (
        <section className="space-y-4">
          {filteredBookings.map((booking) => {
            const statusConfig = getStatusConfig(booking);
            const actionButtons = getActionButtons(booking);
            
            return (
              <article
                key={booking._id}
                className="bg-white rounded-xl shadow-sm p-4 md:p-6 hover:shadow-md transition"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Event Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {booking.serviceTitle}
                        </h3>
                        <p className="text-sm text-gray-500">{booking.serviceCategory}</p>
                      </div>
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiCalendar className="text-gray-400" />
                        <span className="text-sm">{formatDate(booking.eventDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiClock className="text-gray-400" />
                        <span className="text-sm">{formatTime(booking.eventTime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FiMapPin className="text-gray-400" />
                        <span className="text-sm">{booking.location || "Location TBD"}</span>
                      </div>
                    </div>

                    {/* Price Section */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Service Price:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {formatPrice(booking.servicePrice || 0)}
                          </span>
                        </div>

                        {booking.addons && booking.addons.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Add-ons:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatPrice(booking.addons.reduce((sum, a) => sum + (a.total || a.price || 0), 0))}
                            </span>
                          </div>
                        )}

                        <div className="border-t border-gray-200 pt-2 flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700">Total:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {formatPrice(booking.totalPrice || 0)}
                          </span>
                        </div>

                        {/* Advance Payment Info — full-service only */}
                        {booking.eventType === "full-service" && booking.advanceRequired && (
                          <div className="border-t border-gray-200 pt-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Advance ({booking.advancePercentage || 30}%):</span>
                              <span className={`text-sm font-semibold ${booking.advancePaid ? 'text-green-600' : 'text-blue-600'}`}>
                                {formatPrice(booking.advanceAmount || 0)}
                                {booking.advancePaid && <span className="text-xs ml-1">✓ Paid</span>}
                              </span>
                            </div>
                            {booking.advancePaid && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Remaining (70%):</span>
                                <span className={`text-sm font-semibold ${booking.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                                  {formatPrice(booking.remainingAmount || 0)}
                                  {booking.paymentStatus === 'paid' && <span className="text-xs ml-1">✓ Paid</span>}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Guest Count */}
                    {booking.guestCount && (
                      <div className="text-sm text-gray-600 mb-4">
                        <span className="font-medium">{booking.guestCount}</span> guest{booking.guestCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {actionButtons.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                    {actionButtons}
                  </div>
                )}

                {/* Merchant Response Message */}
                {booking.merchantResponse?.message && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${
                    booking.merchantResponse.accepted 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-red-50 text-red-700'
                  }`}>
                    <strong>{booking.merchantResponse.accepted ? 'Merchant Message:' : 'Rejection Reason:'}</strong> {booking.merchantResponse.message}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {/* Modals */}
      {paymentModalOpen && selectedBooking && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          booking={selectedBooking}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {ticketModalOpen && selectedBooking && (
        <TicketModal
          isOpen={ticketModalOpen}
          onClose={() => setTicketModalOpen(false)}
          booking={selectedBooking}
        />
      )}

      {ratingModalOpen && selectedBooking && (
        <RatingModal
          isOpen={ratingModalOpen}
          onClose={() => setRatingModalOpen(false)}
          booking={selectedBooking}
          onSuccess={handleRatingSuccess}
        />
      )}
    </UserLayout>
  );
};

export default UserMyEvents;
