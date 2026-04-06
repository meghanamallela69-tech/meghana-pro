import { useState, useEffect } from "react";
import axios from "axios";
import UserLayout from "../../components/user/UserLayout";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";
import { FiStar, FiCalendar, FiMapPin, FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";

const UserReviews = () => {
  const { token } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/reviews/my-reviews`, {
        headers: authHeaders(token),
      });
      
      if (response.data.success) {
        setReviews(response.data.reviews || []);
      } else {
        toast.error(response.data.message || "Failed to load reviews");
      }
    } catch (error) {
      console.error("Fetch reviews error:", error);
      toast.error(error.response?.data?.message || "Failed to load your reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    setDeletingId(reviewId);
    try {
      const response = await axios.delete(`${API_BASE}/reviews/${reviewId}`, {
        headers: authHeaders(token),
      });

      if (response.data.success) {
        toast.success("Review deleted successfully");
        fetchReviews();
      } else {
        toast.error(response.data.message || "Failed to delete review");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete review");
    } finally {
      setDeletingId(null);
    }
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

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <FiStar
            key={i}
            size={16}
            className={i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
          />
        ))}
        <span className="ml-2 text-sm font-medium text-gray-700">({rating}/5)</span>
      </div>
    );
  };

  return (
    <UserLayout>
      <section className="mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold">My Reviews</h2>
        <p className="text-gray-600 mt-1">View and manage all your event reviews and ratings</p>
      </section>

      {/* Stats */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Total Reviews</p>
          <p className="text-2xl font-bold text-gray-900">{reviews.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">Average Rating</p>
          <p className="text-2xl font-bold text-yellow-500">
            {reviews.length > 0 
              ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
              : "N/A"}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-gray-500 text-sm">5-Star Reviews</p>
          <p className="text-2xl font-bold text-green-600">
            {reviews.filter(r => r.rating === 5).length}
          </p>
        </div>
      </section>

      {/* Reviews List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <FiStar className="mx-auto text-4xl text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">No reviews yet</p>
          <p className="text-gray-400 mt-2">You haven't written any reviews yet</p>
        </div>
      ) : (
        <section className="space-y-4">
          {reviews.map((review) => (
            <article
              key={review._id}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {review.eventTitle || review.event?.title || "Event"}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {review.eventCategory || review.event?.category || "Event"}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteReview(review._id)}
                  disabled={deletingId === review._id}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                  title="Delete review"
                >
                  <FiTrash2 size={18} />
                </button>
              </div>

              {/* Rating */}
              <div className="mb-4">
                {renderStars(review.rating || 0)}
              </div>

              {/* Review Text */}
              {review.comment && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
                </div>
              )}

              {/* Event Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                {review.eventDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <FiCalendar className="text-blue-600" />
                    <span>{formatDate(review.eventDate)}</span>
                  </div>
                )}
                {review.eventLocation && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <FiMapPin className="text-blue-600" />
                    <span>{review.eventLocation}</span>
                  </div>
                )}
              </div>

              {/* Meta Info */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Reviewed on {formatDate(review.createdAt)}</span>
                {review.updatedAt && review.updatedAt !== review.createdAt && (
                  <span>Updated on {formatDate(review.updatedAt)}</span>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </UserLayout>
  );
};

export default UserReviews;
