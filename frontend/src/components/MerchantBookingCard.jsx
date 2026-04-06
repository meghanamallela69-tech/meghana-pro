import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { FiCheck, FiX, FiClock, FiDollarSign, FiUsers, FiCalendar } from "react-icons/fi";
import { API_BASE } from "../lib/http";
import useAuth from "../context/useAuth";

const MerchantBookingCard = ({ booking, onStatusChange }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleRequestAdvance = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${API_BASE}/bookings/merchant/${booking._id}/request-advance`,
        { message: "Please pay 30% advance to confirm your booking" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Advance payment requested");
        onStatusChange?.();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to request advance");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBooking = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${API_BASE}/bookings/merchant/${booking._id}/accept-reject`,
        { action: "accept", message: "Booking accepted! We'll see you soon." },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Booking accepted");
        onStatusChange?.();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to accept booking");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      setLoading(true);
      const response = await axios.put(
        `${API_BASE}/bookings/merchant/${booking._id}/status`,
        { newStatus, message: `Event status updated to ${newStatus}` },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(`Status updated to ${newStatus}`);
        onStatusChange?.();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
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
    switch (booking.status) {
      case "pending":
        return { label: "Request Advance", action: handleRequestAdvance, icon: FiDollarSign };
      case "advance_paid":
        return { label: "Accept Booking", action: handleAcceptBooking, icon: FiCheck };
      case "accepted":
        return { label: "Mark as Processing", action: () => handleUpdateStatus("processing"), icon: FiClock };
      case "processing":
        return { label: "Mark as Completed", action: () => handleUpdateStatus("completed"), icon: FiCheck };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-4 border-l-4 border-blue-600">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold">{booking.serviceTitle}</h3>
          <p className="text-sm text-gray-600">
            Booking ID: {booking._id.substring(0, 8)}...
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeColor(booking.status)}`}>
          {booking.status.replace(/_/g, " ")}
        </span>
      </div>

      {/* User Info */}
      <div className="bg-gray-50 rounded p-3 mb-4">
        <p className="text-sm font-semibold">{booking.user?.name}</p>
        <p className="text-sm text-gray-600">{booking.user?.email}</p>
        <p className="text-sm text-gray-600">{booking.user?.phone}</p>
      </div>

      {/* Booking Details */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <FiCalendar className="text-blue-600" />
          <div>
            <p className="text-gray-600">Date</p>
            <p className="font-semibold">{new Date(booking.eventDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FiUsers className="text-blue-600" />
          <div>
            <p className="text-gray-600">Guests</p>
            <p className="font-semibold">{booking.guestCount}</p>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div className="bg-blue-50 rounded p-3 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold">Total Amount</span>
          <span className="text-lg font-bold text-blue-600">₹{booking.totalPrice}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-gray-600">Advance (30%)</p>
            <p className={booking.advancePaid ? "text-green-600 font-semibold" : "text-yellow-600"}>
              {booking.advancePaid ? "✓ Paid" : "Pending"}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Remaining (70%)</p>
            <p className={booking.paymentStatus === "paid" ? "text-green-600 font-semibold" : "text-gray-600"}>
              {booking.paymentStatus === "paid" ? "✓ Paid" : "Pending"}
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
        <div className="bg-yellow-50 rounded p-3 mb-4">
          <p className="text-sm font-semibold mb-1">Notes:</p>
          <p className="text-sm text-gray-700">{booking.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {nextAction && (
          <button
            onClick={nextAction.action}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <nextAction.icon className="w-4 h-4" />
            {nextAction.label}
          </button>
        )}
        <button
          onClick={() => setShowActions(!showActions)}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          More
        </button>
      </div>

      {/* Additional Actions */}
      {showActions && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <button
            onClick={() => handleUpdateStatus("cancelled")}
            className="w-full bg-red-100 text-red-700 py-2 rounded-lg hover:bg-red-200 text-sm"
          >
            Cancel Booking
          </button>
          <button
            onClick={() => window.location.href = `/dashboard/merchant/bookings/${booking._id}`}
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 text-sm"
          >
            View Details
          </button>
        </div>
      )}
    </div>
  );
};

export default MerchantBookingCard;
