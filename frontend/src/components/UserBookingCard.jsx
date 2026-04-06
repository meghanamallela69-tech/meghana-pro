import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { FiDollarSign, FiCalendar, FiUsers, FiMapPin, FiClock } from "react-icons/fi";
import { API_BASE } from "../lib/http";
import useAuth from "../context/useAuth";

const UserBookingCard = ({ booking, onPaymentSuccess, onStatusChange }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState(null); // "advance" or "remaining"

  const handlePayAdvance = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${API_BASE}/bookings/${booking._id}/pay-advance`,
        { paymentMethod: "Card" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Advance payment successful!");
        onPaymentSuccess?.();
        setShowPaymentModal(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePayRemaining = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${API_BASE}/bookings/${booking._id}/pay-remaining`,
        { paymentMethod: "Card" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Remaining payment successful!");
        onPaymentSuccess?.();
        setShowPaymentModal(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      advance_requested: "bg-blue-100 text-blue-800",
      advance_paid: "bg-green-100 text-green-800",
      accepted: "bg-purple-100 text-purple-800",
      processing: "bg-orange-100 text-orange-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getNextAction = () => {
    if (booking.status === "advance_requested" && !booking.advancePaid) {
      return { label: "Pay Advance", type: "advance", amount: booking.advanceAmount };
    }
    if (booking.status === "completed" && booking.paymentStatus !== "paid") {
      return { label: "Pay Remaining", type: "remaining", amount: booking.remainingAmount };
    }
    return null;
  };

  const nextAction = getNextAction();

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-4 border-l-4 border-purple-600">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold">{booking.serviceTitle}</h3>
          <p className="text-sm text-gray-600">
            Merchant: {booking.merchant?.name || "Unknown"}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeColor(booking.status)}`}>
          {booking.status.replace(/_/g, " ")}
        </span>
      </div>

      {/* Event Details */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <FiCalendar className="text-purple-600" />
          <div>
            <p className="text-gray-600">Date</p>
            <p className="font-semibold">{new Date(booking.eventDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FiClock className="text-purple-600" />
          <div>
            <p className="text-gray-600">Time</p>
            <p className="font-semibold">{booking.eventTime || "TBD"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FiUsers className="text-purple-600" />
          <div>
            <p className="text-gray-600">Guests</p>
            <p className="font-semibold">{booking.guestCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FiMapPin className="text-purple-600" />
          <div>
            <p className="text-gray-600">Location</p>
            <p className="font-semibold text-xs">{booking.location?.substring(0, 20)}...</p>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="bg-purple-50 rounded p-3 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold">Total Amount</span>
          <span className="text-lg font-bold text-purple-600">₹{booking.totalPrice}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-gray-600">Advance (30%)</p>
            <p className={booking.advancePaid ? "text-green-600 font-semibold" : "text-yellow-600"}>
              {booking.advancePaid ? `✓ ₹${booking.advanceAmount}` : "Pending"}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Remaining (70%)</p>
            <p className={booking.paymentStatus === "paid" ? "text-green-600 font-semibold" : "text-gray-600"}>
              {booking.paymentStatus === "paid" ? `✓ ₹${booking.remainingAmount}` : "Pending"}
            </p>
          </div>
        </div>
      </div>

      {/* Add-ons */}
      {booking.addons && booking.addons.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold mb-2">Add-ons:</p>
          <div className="space-y-1">
            {booking.addons.map((addon, idx) => (
              <p key={idx} className="text-sm text-gray-600">
                • {addon.name} × {addon.quantity} = ₹{addon.total}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {booking.notes && (
        <div className="bg-blue-50 rounded p-3 mb-4">
          <p className="text-sm font-semibold mb-1">Your Notes:</p>
          <p className="text-sm text-gray-700">{booking.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {nextAction && (
          <button
            onClick={() => {
              setPaymentType(nextAction.type);
              setShowPaymentModal(true);
            }}
            className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
          >
            <FiDollarSign className="w-4 h-4" />
            {nextAction.label}
          </button>
        )}
        <button
          onClick={() => window.location.href = `/dashboard/user/bookings/${booking._id}`}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          Details
        </button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Confirm Payment</h3>

            <div className="bg-gray-50 rounded p-4 mb-4">
              <p className="text-sm text-gray-600">
                {paymentType === "advance" ? "Advance Payment (30%)" : "Remaining Payment (70%)"}
              </p>
              <p className="text-2xl font-bold text-purple-600">
                ₹{paymentType === "advance" ? booking.advanceAmount : booking.remainingAmount}
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600">Payment Method</p>
              <select className="w-full border rounded-lg p-2">
                <option>Credit Card</option>
                <option>Debit Card</option>
                <option>UPI</option>
                <option>Net Banking</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 border rounded-lg py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={paymentType === "advance" ? handlePayAdvance : handlePayRemaining}
                disabled={loading}
                className="flex-1 bg-purple-600 text-white rounded-lg py-2 hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Pay Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBookingCard;
