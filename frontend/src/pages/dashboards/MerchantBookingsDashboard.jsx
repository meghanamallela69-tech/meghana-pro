import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { FiFilter, FiRefreshCw, FiTrendingUp, FiDollarSign } from "react-icons/fi";
import { API_BASE } from "../../lib/http";
import useAuth from "../../context/useAuth";
import MerchantBookingCard from "../../components/MerchantBookingCard";

const MerchantBookingsDashboard = () => {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, sortBy]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("sortBy", sortBy);

      const response = await axios.get(
        `${API_BASE}/full-service-bookings/merchant/my-bookings?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setBookings(response.data.bookings);
      }
    } catch (error) {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const getBookingStats = () => {
    const stats = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === "pending").length,
      awaitingAdvance: bookings.filter(b => b.status === "advance_requested").length,
      active: bookings.filter(b => ["advance_paid", "accepted", "processing"].includes(b.status)).length,
      completed: bookings.filter(b => b.status === "completed").length,
      totalRevenue: bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
      advancePending: bookings.filter(b => b.status === "advance_requested").reduce((sum, b) => sum + (b.advanceAmount || 0), 0),
      remainingPending: bookings.filter(b => b.status === "completed" && b.paymentStatus !== "paid").reduce((sum, b) => sum + (b.remainingAmount || 0), 0)
    };
    return stats;
  };

  const stats = getBookingStats();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Management</h1>
          <p className="text-gray-600">Manage customer bookings and track payments</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total Bookings</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Pending Action</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending + stats.awaitingAdvance}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Active Events</p>
            <p className="text-3xl font-bold text-purple-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total Revenue</p>
            <p className="text-3xl font-bold text-green-600">₹{stats.totalRevenue}</p>
          </div>
        </div>

        {/* Payment Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-semibold">Advance Payments Pending</p>
                <p className="text-2xl font-bold text-blue-700">₹{stats.advancePending}</p>
                <p className="text-xs text-blue-600 mt-1">{stats.awaitingAdvance} bookings awaiting payment</p>
              </div>
              <FiDollarSign className="w-12 h-12 text-blue-300" />
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-semibold">Remaining Payments Pending</p>
                <p className="text-2xl font-bold text-green-700">₹{stats.remainingPending}</p>
                <p className="text-xs text-green-600 mt-1">After event completion</p>
              </div>
              <FiTrendingUp className="w-12 h-12 text-green-300" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-600" />
              <span className="text-sm font-semibold">Filter by Status:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {["all", "pending", "advance_requested", "advance_paid", "accepted", "processing", "completed"].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    statusFilter === status
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {status === "all" ? "All" : status.replace(/_/g, " ")}
                </button>
              ))}
            </div>
            <button
              onClick={fetchBookings}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">
              <FiRefreshCw className="w-8 h-8 text-blue-600" />
            </div>
            <p className="mt-4 text-gray-600">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FiTrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bookings Found</h3>
            <p className="text-gray-600">You don't have any bookings matching this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookings.map(booking => (
              <MerchantBookingCard
                key={booking._id}
                booking={booking}
                onStatusChange={fetchBookings}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantBookingsDashboard;
