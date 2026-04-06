import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { FiFilter, FiRefreshCw, FiCalendar, FiDollarSign } from "react-icons/fi";
import { API_BASE } from "../../lib/http";
import useAuth from "../../context/useAuth";
import UserBookingCard from "../../components/UserBookingCard";
import BookingStatusTimeline from "../../components/BookingStatusTimeline";

const UserBookingsDashboard = () => {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
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
        `${API_BASE}/full-service-bookings/user/my-bookings?${params}`,
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

  const getStatusStats = () => {
    const stats = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === "pending").length,
      active: bookings.filter(b => ["advance_requested", "advance_paid", "accepted", "processing"].includes(b.status)).length,
      completed: bookings.filter(b => b.status === "completed").length,
      totalSpent: bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0)
    };
    return stats;
  };

  const stats = getStatusStats();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-600">Manage and track all your event bookings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total Bookings</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Active</p>
            <p className="text-3xl font-bold text-purple-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Completed</p>
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total Spent</p>
            <p className="text-3xl font-bold text-blue-600">₹{stats.totalSpent}</p>
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bookings List */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin">
                  <FiRefreshCw className="w-8 h-8 text-blue-600" />
                </div>
                <p className="mt-4 text-gray-600">Loading bookings...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <FiCalendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bookings Found</h3>
                <p className="text-gray-600">You haven't made any bookings yet. Start exploring events!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map(booking => (
                  <div
                    key={booking._id}
                    onClick={() => setSelectedBooking(booking)}
                    className="cursor-pointer"
                  >
                    <UserBookingCard
                      booking={booking}
                      onPaymentSuccess={fetchBookings}
                      onStatusChange={fetchBookings}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Booking Details Sidebar */}
          <div className="lg:col-span-1">
            {selectedBooking ? (
              <div className="sticky top-6">
                <BookingStatusTimeline booking={selectedBooking} />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-gray-600">Select a booking to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserBookingsDashboard;
