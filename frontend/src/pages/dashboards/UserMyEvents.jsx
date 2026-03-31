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
      console.log('📥 Fetching user bookings...');
      console.log('Token:', token ? 'Present' : 'Missing');
      
      const response = await axios.get(`${API_BASE}/bookings/my-bookings`, {
        headers: authHeaders(token),
      });
      
      console.log('✅ Response received:', response.data);
      
      if (response.data.success) {
        // Sanitize bookings to prevent raw object display
        const sanitizedBookings = (response.data.bookings || []).map(booking => ({
          _id: String(booking._id || ''),
          serviceTitle: String(booking.serviceTitle || booking.service?.title || 'Untitled Event'),
          serviceCategory: String(booking.serviceCategory || booking.service?.category || 'General'),
          servicePrice: Number(booking.servicePrice || 0),
          eventType: String(booking.eventType || 'full-service'),
          eventDate: String(booking.eventDate || 'TBD'),
          eventTime: String(booking.eventTime || 'TBD'),
          location: String(booking.location || 'Location TBD'),
          status: String(booking.status || 'pending'),
          totalPrice: Number(booking.totalPrice || 0),
          finalAmount: Number(booking.finalAmount || 0),
          guestCount: Number(booking.guestCount || 1),
          // Advance payment fields - CRITICAL for showing Pay Advance button
          advanceRequired: Boolean(booking.advanceRequired || false),
          advancePercentage: Number(booking.advancePercentage || 0),
          advanceAmount: Number(booking.advanceAmount || 0),
          advancePaid: Boolean(booking.advancePaid || false),
          remainingAmount: Number(booking.remainingAmount || 0),
          ticket: booking.ticket ? {
            ticketNumber: String(booking.ticket.ticketNumber || ''),
            ticketType: String(booking.ticket.ticketType || 'Standard'),
            quantity: Number(booking.ticket.quantity || 1),
            isUsed: Boolean(booking.ticket.isUsed || false),
            usedAt: booking.ticket.usedAt || null
          } : null,
          selectedTickets: (() => {
            // Safely convert selectedTickets to plain object
            if (!booking.selectedTickets) return {};
            
            // If it's a Map, convert to entries first
            if (booking.selectedTickets instanceof Map) {
              return Object.fromEntries(Array.from(booking.selectedTickets.entries()));
            }
            
            // If it's already a plain object, return as-is
            if (typeof booking.selectedTickets === 'object' && !Array.isArray(booking.selectedTickets)) {
              return booking.selectedTickets;
            }
            
            // Fallback: return empty object
            return {};
          })(),
          addons: Array.isArray(booking.addons) ? booking.addons : [],
          rating: booking.rating ? {
            score: Number(booking.rating.score || 0),
            review: String(booking.rating.review || '')
          } : null,
          merchantResponse: booking.merchantResponse ? {
            message: String(booking.merchantResponse.message || ''),
            accepted: Boolean(booking.merchantResponse.accepted || false)
          } : null,
          payment: booking.payment ? {
            paid: Boolean(booking.payment.paid || false),
            paymentId: String(booking.payment.paymentId || ''),
            paymentDate: booking.payment.paymentDate || null,
            amount: Number(booking.payment.amount || 0)
          } : null,
          createdAt: String(booking.createdAt || ''),
          updatedAt: String(booking.updatedAt || '')
        }));
        console.log(`📊 Loaded ${sanitizedBookings.length} bookings`);
        setBookings(sanitizedBookings);
      } else {
        console.error('❌ Response success is false:', response.data);
        toast.error(response.data.message || "Failed to load bookings");
      }
    } catch (error) {
      console.error("Fetch bookings error:", error);
      console.error("Error response:", error.response?.data);
      console.error("Status:", error.response?.status);
      
      let errorMsg = "Failed to load your bookings";
      if (error.response?.status === 401) {
        errorMsg = "Authentication failed. Please login again.";
      } else if (error.response?.status === 500) {
        errorMsg = "Server error. Please try again later.";
      }
      
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) return;
    
    try {
      const response = await axios.put(`${API_BASE}/event-bookings/${bookingId}/cancel`, {}, {
        headers: authHeaders(token),
      });
      
      if (response.data.success) {
        toast.success("Booking cancelled successfully");
        fetchMyBookings(); // Refresh the bookings list
      } else {
        toast.error(response.data.message || "Failed to cancel booking");
      }
    } catch (error) {
      console.error("Cancel booking error:", error);
      toast.error(error.response?.data?.message || "Failed to cancel booking");
    }
  };

  const handlePayNow = (booking) => {
    setSelectedBooking(booking);
    setPaymentModalOpen(true);
  };

  const handlePayAdvance = async (booking) => {
    // Show confirmation before proceeding
    if (!window.confirm(`Do you want to pay the advance amount of ${formatPrice(booking.advanceAmount || 0)}? This will secure your booking and the merchant will then review your request.`)) {
      return;
    }

    setSelectedBooking(booking);
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
    // Clean the booking data to remove MongoDB objects and convert Maps
    const cleanedBooking = {
      ...booking,
      _id: booking._id?.toString() || booking._id,
      selectedTickets: booking.selectedTickets instanceof Map 
        ? Object.fromEntries(booking.selectedTickets) 
        : booking.selectedTickets || {},
      // Ensure all nested objects are plain objects
      ticket: booking.ticket ? { ...booking.ticket } : null,
      payment: booking.payment ? { ...booking.payment } : null,
      merchantResponse: booking.merchantResponse ? { ...booking.merchantResponse } : null
    };
    
    setSelectedBooking(cleanedBooking);
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

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
      case "completed":
        return { icon: <FiCheckCircle />, color: "bg-green-100 text-green-700", label: "Confirmed" };
      case "pending":
        return { icon: <FiClock />, color: "bg-amber-100 text-amber-700", label: "Pending Approval" };
      case "awaiting_advance":
        return { icon: <FaRupeeSign />, color: "bg-blue-100 text-blue-700", label: "Awaiting Advance Payment" };
      case "advance_paid":
        return { icon: <FiCheckCircle />, color: "bg-green-100 text-green-700", label: "Advance Paid - Awaiting Confirmation" };
      case "approved":
      case "accepted":
        return { icon: <FiCheckCircle />, color: "bg-blue-100 text-blue-700", label: "Approved - Pay Now" };
      case "paid":
        return { icon: <FiCreditCard />, color: "bg-purple-100 text-purple-700", label: "Paid - Confirming" };
      case "processing":
        return { icon: <FiClock />, color: "bg-indigo-100 text-indigo-700", label: "Processing" };
      case "rejected":
        return { icon: <FiXCircle />, color: "bg-red-100 text-red-700", label: "Rejected" };
      case "cancelled":
        return { icon: <FiXCircle />, color: "bg-gray-100 text-gray-700", label: "Cancelled" };
      case "expired":
        return { icon: <FiXCircle />, color: "bg-orange-100 text-orange-700", label: "Expired" };
      default:
        return { icon: <FiClock />, color: "bg-amber-100 text-amber-700", label: status || "Pending" };
    }
  };

  const getActionButtons = (booking) => {
    const status = booking.status?.toLowerCase();
    const eventDate = new Date(booking.eventDate);
    const isPast = eventDate < new Date();

    console.log('🔍 Checking buttons for booking:', {
      _id: booking._id,
      serviceTitle: booking.serviceTitle,
      status,
      advanceRequired: booking.advanceRequired,
      advancePaid: booking.advancePaid,
      advanceAmount: booking.advanceAmount,
      remainingAmount: booking.remainingAmount
    });

    const buttons = [];

    // Pay Advance button for awaiting_advance status
    if (status === "awaiting_advance" && booking.advanceRequired && !booking.advancePaid) {
      console.log('✅ Showing Pay Advance button');
      buttons.push(
        <button
          key="pay-advance"
          onClick={() => handlePayAdvance(booking)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2"
        >
          <FaRupeeSign size={14} />
          Pay Advance ({formatPrice(booking.advanceAmount || 0)})
        </button>
      );
    } else if (status === "awaiting_advance") {
      console.log('⚠️ Not showing Pay Advance button. Conditions:', {
        isAwaitingAdvance: status === "awaiting_advance",
        hasAdvanceRequired: booking.advanceRequired,
        isAdvanceNotPaid: !booking.advancePaid
      });
    }

    // Pay Remaining Amount button for confirmed bookings with advance paid
    if (status === "advance_paid" || (status === "confirmed" && booking.advancePaid && booking.remainingAmount > 0)) {
      buttons.push(
        <button
          key="pay-remaining"
          onClick={() => handlePayRemaining(booking)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center gap-2"
        >
          <FaRupeeSign size={14} />
          Pay Remaining ({formatPrice(booking.remainingAmount || 0)})
        </button>
      );
    }

    // Pay Now button for approved bookings (old flow without advance)
    if (["approved", "accepted"].includes(status) && !booking.advanceRequired) {
      buttons.push(
        <button
          key="pay"
          onClick={() => handlePayNow(booking)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
        >
          Pay Now
        </button>
      );
    }

    // View Ticket button for paid bookings (both confirmed/completed and paid status)
    if ((["confirmed", "completed", "paid"].includes(status) || booking.payment?.paid) && 
        (booking.ticket?.ticketNumber || booking.ticketId || booking.paymentId)) {
      buttons.push(
        <button
          key="ticket"
          onClick={() => handleViewTicket(booking)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2"
        >
          <FiDownload size={14} />
          View Ticket
        </button>
      );
    }

    // Cancel button for pending/approved bookings (but not paid ones)
    if (["pending", "approved", "accepted", "awaiting_advance"].includes(status) && !booking.payment?.paid) {
      buttons.push(
        <button
          key="cancel"
          onClick={() => handleCancelBooking(booking._id)}
          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition text-sm font-medium"
        >
          Cancel
        </button>
      );
    }

    // Rate button for completed/paid bookings without rating
    // Show for ticketed events when paid, for full-service when completed
    const canRate = (booking.eventType === "ticketed" && ["paid", "confirmed", "completed"].includes(status)) ||
                    (booking.eventType === "full-service" && status === "completed");
    
    if (canRate && !booking.rating?.score) {
      buttons.push(
        <button
          key="rate"
          onClick={() => handleRateEvent(booking)}
          className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition text-sm font-medium flex items-center gap-2"
        >
          <FiStar size={14} />
          Rate Event
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
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Date TBD";
    }
  };

  const formatTime = (timeString) => {
    if (!timeString || timeString === "TBD" || timeString === "") return "Time TBD";
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

  // Calculate total price based on event type
  const calculateTotalPrice = (booking) => {
    // Always prioritize totalPrice if available
    if (booking.totalPrice) {
      return booking.totalPrice;
    }
    
    // For ticketed events
    if (booking.eventType === "ticketed") {
      if (booking.ticket?.pricePerTicket && booking.ticket?.quantity) {
        return booking.ticket.pricePerTicket * booking.ticket.quantity;
      }
      // If multiple ticket types selected
      if (booking.selectedTickets && Object.keys(booking.selectedTickets).length > 0) {
        let total = 0;
        // Note: selectedTickets is a Map, we need to handle it properly
        Object.entries(booking.selectedTickets).forEach(([ticketType, quantity]) => {
          // You might need to adjust this based on how ticket prices are stored
          total += quantity * 100; // Default price if not available
        });
        return total;
      }
      return booking.servicePrice || 0;
    }
    
    // For full-service events
    if (booking.eventType === "full-service") {
      let total = booking.servicePrice || 0;
      // Add addons price if exists
      if (booking.addons && Array.isArray(booking.addons)) {
        booking.addons.forEach(addon => {
          total += addon.price || 0;
        });
      }
      return total;
    }
    
    // Fallback to servicePrice
    return booking.servicePrice || 0;
  };

  // Get ticket quantity based on booking type
  const getTicketQuantity = (booking) => {
    if (booking.eventType === "ticketed") {
      // For multiple ticket types - check this FIRST
      if (booking.selectedTickets && Object.keys(booking.selectedTickets).length > 0) {
        console.log('🔢 Calculating quantity from selectedTickets:', booking.selectedTickets);
        // Handle plain object (backend converts Map to object)
        const values = Object.values(booking.selectedTickets);
        console.log('Object values:', values);
        const total = values.reduce((sum, qty) => sum + qty, 0);
        console.log('Object total:', total);
        return total;
      }
      // For single ticket type - fallback
      if (booking.ticket?.quantity) {
        return booking.ticket.quantity;
      }
      // Fallback to guestCount
      return booking.guestCount || 1;
    }
    // For full-service events, show guest count
    return booking.guestCount || 1;
  };

  // Format selected tickets for display
  const formatSelectedTickets = (booking) => {
    if (!booking.selectedTickets) return null;
    
    let ticketsArray = [];
    
    try {
      // Handle Map object
      if (booking.selectedTickets instanceof Map) {
        ticketsArray = Array.from(booking.selectedTickets.entries());
      } 
      // Handle plain object - this is most common case
      else if (typeof booking.selectedTickets === 'object' && !Array.isArray(booking.selectedTickets)) {
        // Object entries like: { "Regular": 1, "VIP": 1 }
        ticketsArray = Object.entries(booking.selectedTickets);
      }
      // Handle array fallback (shouldn't happen but just in case)
      else if (Array.isArray(booking.selectedTickets)) {
        return booking.selectedTickets.map(item => ({
          type: item.type || 'Unknown',
          quantity: item.quantity || 1
        }));
      }
      
      if (ticketsArray.length === 0) return null;
      
      // Convert to standardized format with proper type formatting
      return ticketsArray.map(([type, quantity]) => {
        // Ensure type is a string and format it nicely
        const formattedType = typeof type === 'string' ? type.trim() : String(type);
        return {
          type: formattedType,
          quantity: Number(quantity) || 1
        };
      });
    } catch (error) {
      console.error('Error formatting selected tickets:', error);
      return null;
    }
  };

  // Safely convert value to string for display
  const safeToString = (value, defaultValue = '-') => {
    if (value === null || value === undefined) return defaultValue;
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    // For objects/arrays/Maps, return default to avoid showing raw data
    return defaultValue;
  };

  // Safely get ticket number
  const getTicketNumber = (booking) => {
    if (!booking.ticket?.ticketNumber) return null;
    return safeToString(booking.ticket.ticketNumber, null);
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
        <p className="text-gray-600 mt-1">Manage your event bookings and tickets</p>
      </section>

      {/* Stats Summary */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Pending</p>
          <p className="text-2xl font-bold text-amber-600">
            {bookings.filter((b) => ["pending", "accepted"].includes(b.status)).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Confirmed</p>
          <p className="text-2xl font-bold text-green-600">
            {bookings.filter((b) => ["confirmed", "completed"].includes(b.status)).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">To Rate</p>
          <p className="text-2xl font-bold text-blue-600">
            {bookings.filter((b) => b.status === "completed" && !b.rating?.score).length}
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
            const statusConfig = getStatusConfig(booking.status);
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

                    {/* Price and Quantity Section */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      {booking.eventType === "ticketed" ? (
                        // Ticketed Event Display
                        <div className="space-y-2">
                          {/* Debug logging */}
                          {console.log('🎫 Rendering tickets for booking:', booking._id, {
                            selectedTickets: booking.selectedTickets,
                            ticket: booking.ticket,
                            formattedTickets: formatSelectedTickets(booking)
                          })}
                          
                          {/* Show individual ticket types if available */}
                          {formatSelectedTickets(booking) && formatSelectedTickets(booking).length > 0 ? (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-gray-700 mb-1">Tickets Booked:</div>
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                {formatSelectedTickets(booking).map((ticket, index) => (
                                  <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded border border-gray-200">
                                    <span className="font-medium text-gray-700 capitalize">
                                      {(() => {
                                        const type = String(ticket.type || '').toLowerCase();
                                        // Abbreviate common ticket types
                                        if (type === 'regular') return 'Reg';
                                        if (type === 'vip') return 'Vip';
                                        return type.charAt(0).toUpperCase() + type.slice(1);
                                      })()}
                                    </span>
                                    <span className="text-gray-500">-</span>
                                    <span className="font-semibold text-blue-600">{ticket.quantity}</span>
                                  </span>
                                ))}
                              </div>
                              <div className="text-xs text-gray-600 pt-2 border-t border-gray-200">
                                <span className="font-medium">Total: </span>
                                <span className="font-semibold text-gray-900">{getTicketQuantity(booking)}</span>
                                <span> {getTicketQuantity(booking) !== 1 ? 'tickets' : 'ticket'}</span>
                              </div>
                            </div>
                          ) : booking.ticket?.quantity ? (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Ticket Type:</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {(() => {
                                    const type = String(booking.ticket.ticketType || 'Standard').toLowerCase();
                                    if (type === 'regular') return 'Reg';
                                    if (type === 'vip') return 'Vip';
                                    return type.charAt(0).toUpperCase() + type.slice(1);
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Quantity:</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {booking.ticket.quantity} {booking.ticket.quantity !== 1 ? 'tickets' : 'ticket'}
                                </span>
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-gray-500">No ticket details available</div>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <span className="text-sm font-semibold text-gray-700">Total Paid:</span>
                            <span className="text-lg font-bold text-blue-600">
                              {formatPrice(calculateTotalPrice(booking))}
                            </span>
                          </div>
                        </div>
                      ) : (
                        // Full-Service Event Display
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Service Price:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatPrice(booking.servicePrice || 0)}
                            </span>
                          </div>
                          {booking.addons && booking.addons.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500 font-medium">Add-ons:</div>
                              {booking.addons.map((addon, index) => (
                                <div key={index} className="flex items-center justify-between text-sm pl-2">
                                  <span className="text-gray-600">{addon.name || `Addon ${index + 1}`}</span>
                                  <span className="text-gray-900">{formatPrice(addon.price || 0)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <span className="text-sm font-semibold text-gray-700">Total Paid:</span>
                            <span className="text-lg font-bold text-blue-600">
                              {formatPrice(calculateTotalPrice(booking))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Advance Payment Information (for full-service events) */}
                    {booking.eventType === "full-service" && booking.advanceRequired && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                          <FaRupeeSign size={14} />
                          Advance Payment Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">Total Amount</p>
                            <p className="font-semibold text-gray-900">{formatPrice(booking.totalPrice || 0)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Advance Paid ({booking.advancePercentage}%)</p>
                            <p className={`font-semibold ${booking.advancePaid ? 'text-green-700' : 'text-blue-700'}`}>
                              {booking.advancePaid ? '✓' : 'Pending'} {formatPrice(booking.advanceAmount || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Remaining Amount</p>
                            <p className="font-semibold text-gray-900">{formatPrice(booking.remainingAmount || 0)}</p>
                          </div>
                        </div>
                        {booking.status === "awaiting_advance" && !booking.advancePaid && (
                          <p className="mt-3 text-xs text-blue-700 italic flex items-center gap-1">
                            <FaRupeeSign size={10} />
                            Please pay the advance amount to proceed with your booking confirmation
                          </p>
                        )}
                        {booking.status === "advance_paid" && booking.advancePaid && (
                          <p className="mt-3 text-xs text-green-700 italic flex items-center gap-1">
                            ✓ Advance payment received. Merchant will confirm your booking soon.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Show merchant response message if rejected */}
                    {booking.status === "rejected" && booking.merchantResponse?.message && (
                      <div className="mb-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                        <strong>Merchant message:</strong> {booking.merchantResponse.message}
                      </div>
                    )}

                    {/* Show rating if exists */}
                    {booking.rating?.score && (
                      <div className="mb-4 flex items-center gap-2">
                        <span className="text-amber-500">{"⭐".repeat(booking.rating.score)}</span>
                        <span className="text-sm text-gray-600">{booking.rating.review}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Booked on {formatDate(booking.createdAt)}
                        {getTicketNumber(booking) && (
                          <span className="ml-2 text-blue-600">• Ticket: {getTicketNumber(booking)}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {actionButtons}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && selectedBooking && (
        <PaymentModal
          booking={selectedBooking}
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Ticket Modal */}
      {ticketModalOpen && selectedBooking && (
        <TicketModal
          booking={selectedBooking}
          isOpen={ticketModalOpen}
          onClose={() => setTicketModalOpen(false)}
        />
      )}

      {/* Rating Modal */}
      {ratingModalOpen && selectedBooking && (
        <RatingModal
          booking={selectedBooking}
          isOpen={ratingModalOpen}
          onClose={() => setRatingModalOpen(false)}
          onSuccess={handleRatingSuccess}
        />
      )}
    </UserLayout>
  );
};

export default UserMyEvents;
