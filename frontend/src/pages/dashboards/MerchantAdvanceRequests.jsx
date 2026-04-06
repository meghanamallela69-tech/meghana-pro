import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";
import MerchantLayout from "../../components/merchant/MerchantLayout";
import { FaClock, FaCheckCircle, FaTimesCircle, FaRupeeSign, FaInfoCircle, FaUser, FaCalendar } from "react-icons/fa";
import toast from "react-hot-toast";

const MerchantAdvanceRequests = () => {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [processingId, setProcessingId] = useState(null);

  const loadAdvanceRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/bookings/merchant/advance-requests`, {
        headers: authHeaders(token),
      });
      
      if (response.data.success) {
        setBookings(response.data.bookings || []);
      }
    } catch (error) {
      console.error("Failed to load advance requests:", error);
      toast.error("Failed to load advance requests");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAdvanceRequests();
  }, [loadAdvanceRequests]);

  const handleRequestAdvance = async (bookingId) => {
    if (!window.confirm("Request 30% advance payment from customer?")) return;

    setProcessingId(bookingId);
    try {
      const response = await axios.post(
        `${API_BASE}/bookings/merchant/${bookingId}/request-advance`,
        { advancePercentage: 30 },
        { headers: authHeaders(token) }
      );

      if (response.data.success) {
        toast.success("Advance payment request sent to customer!");
        loadAdvanceRequests();
      } else {
        throw new Error(response.data.message || "Request failed");
      }
    } catch (error) {
      console.error('Error requesting advance:', error);
      let errorMessage = "Failed to request advance";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      toast.error(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAcceptReject = async (bookingId, accepted) => {
    const message = accepted 
      ? "Accept this booking and confirm for customer?"
      : "Reject this booking? Advance will be refunded.";
    
    if (!window.confirm(message)) return;

    setProcessingId(bookingId);
    try {
      const response = await axios.post(
        `${API_BASE}/bookings/merchant/${bookingId}/accept-reject`,
        { accepted },
        { headers: authHeaders(token) }
      );

      if (response.data.success) {
        toast.success(`Booking ${accepted ? 'accepted' : 'rejected'} successfully!`);
        loadAdvanceRequests();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to process booking");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1"><FaClock size={12} /> Pending</span>;
      case "awaiting_advance":
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 flex items-center gap-1"><FaRupeeSign size={12} /> Awaiting Advance</span>;
      case "advance_paid":
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1"><FaCheckCircle size={12} /> Advance Paid</span>;
      default:
        return <span className="text-gray-600">{status}</span>;
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === "all") return true;
    return booking.status === filter;
  });

  return (
    <MerchantLayout>
      <section className="mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold">Advance Payment Requests</h2>
        <p className="text-gray-600 mt-1">Manage advance payments and booking confirmations</p>
      </section>

      {/* Filter Tabs */}
      <section className="bg-white rounded-xl shadow-sm p-2 mb-6">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "all", label: "All", count: bookings.length },
            { value: "pending", label: "Pending", count: bookings.filter(b => b.status === "pending").length },
            { value: "awaiting_advance", label: "Awaiting Advance", count: bookings.filter(b => b.status === "awaiting_advance").length },
            { value: "advance_paid", label: "Advance Paid", count: bookings.filter(b => b.status === "advance_paid").length },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                filter === tab.value
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                filter === tab.value ? "bg-white/20" : "bg-gray-200"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <FaClock className="mx-auto text-4xl text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">No advance requests found</p>
          <p className="text-gray-400 mt-2">
            {filter === "all" 
              ? "New booking requests will appear here"
              : `No bookings in "${filter}" status`}
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          {filteredBookings.map((booking) => (
            <article
              key={booking._id}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{booking.serviceTitle}</h3>
                  <p className="text-sm text-gray-500">{booking.serviceCategory}</p>
                </div>
                <div>{getStatusBadge(booking.status)}</div>
              </div>

              {/* Customer Info */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <FaUser size={14} className="text-gray-400" />
                  <span className="font-medium">{booking.user?.name || "Unknown"}</span>
                  {booking.user?.email && (
                    <span className="text-gray-500">• {booking.user.email}</span>
                  )}
                </div>
                {booking.eventDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 mt-2">
                    <FaCalendar size={14} className="text-gray-400" />
                    <span>{formatDate(booking.eventDate)}</span>
                  </div>
                )}
              </div>

              {/* Pricing Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Price</p>
                  <p className="text-xl font-bold text-gray-900">{formatPrice(booking.totalPrice || 0)}</p>
                </div>
                {booking.advanceRequired && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Advance Amount ({booking.advancePercentage}%)</p>
                      <p className="text-lg font-semibold text-blue-600">{formatPrice(booking.advanceAmount || 0)}</p>
                      {booking.advancePaid && (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <FaCheckCircle size={10} /> Paid
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Remaining Amount</p>
                      <p className="text-lg font-semibold text-gray-700">{formatPrice(booking.remainingAmount || 0)}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons based on status */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                {booking.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleRequestAdvance(booking._id)}
                      disabled={processingId === booking._id}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2"
                    >
                      {processingId === booking._id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <FaRupeeSign /> Request Advance (30%)
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleAcceptReject(booking._id, false)}
                      disabled={processingId === booking._id}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:opacity-50 transition text-sm font-medium"
                    >
                      Reject Booking
                    </button>
                  </>
                )}

                {booking.status === "awaiting_advance" && (
                  <div className="text-sm text-gray-600 italic flex items-center gap-2">
                    <FaClock size={14} className="text-blue-500" />
                    Waiting for customer to pay advance...
                  </div>
                )}

                {booking.status === "advance_paid" && (
                  <>
                    <button
                      onClick={() => handleAcceptReject(booking._id, true)}
                      disabled={processingId === booking._id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2"
                    >
                      {processingId === booking._id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <FaCheckCircle /> Accept & Confirm Booking
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleAcceptReject(booking._id, false)}
                      disabled={processingId === booking._id}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:opacity-50 transition text-sm font-medium"
                    >
                      Reject & Refund
                    </button>
                  </>
                )}
              </div>

              {/* Show merchant message if rejected */}
              {booking.merchantResponse?.message && !booking.merchantResponse.accepted && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
                  <strong>Rejection Reason:</strong> {booking.merchantResponse.message}
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </MerchantLayout>
  );
};

export default MerchantAdvanceRequests;
