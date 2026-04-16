import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiStar, FiCalendar, FiMapPin } from "react-icons/fi";
import { API_BASE } from "../lib/http";
import toast from "react-hot-toast";

const Reviews = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState("all");

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/reviews/latest`);
      
      if (response.data.success) {
        setReviews(response.data.reviews || []);
      } else {
        toast.error(response.data.message || "Failed to load reviews");
      }
    } catch (error) {
      console.error("Fetch reviews error:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
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

  const filteredReviews = filterRating === "all" 
    ? reviews 
    : reviews.filter(r => r.rating === parseInt(filterRating));

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Header */}
      <section style={{ background: "#fff", padding: "30px 16px", textAlign: "center", borderBottom: "1px solid #e5e7eb" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#1f2937", marginBottom: "8px" }}>
          Customer Reviews
        </h1>
        <p style={{ fontSize: "15px", color: "#6b7280", maxWidth: "600px", margin: "0 auto" }}>
          See what our customers say about their event experiences
        </p>
      </section>

      {/* Stats */}
      <section style={{ padding: "20px 16px", maxWidth: "1200px", margin: "0 auto" }}>
        <div className="reviews-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}>Total Reviews</p>
            <p style={{ fontSize: "32px", fontWeight: "bold", color: "#1f2937" }}>{reviews.length}</p>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}>Average Rating</p>
            <p style={{ fontSize: "32px", fontWeight: "bold", color: "#f59e0b" }}>
              {reviews.length > 0 
                ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
                : "N/A"}
            </p>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "8px" }}>5-Star Reviews</p>
            <p style={{ fontSize: "32px", fontWeight: "bold", color: "#10b981" }}>
              {reviews.filter(r => r.rating === 5).length}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div style={{ marginBottom: "32px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => setFilterRating("all")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: filterRating === "all" ? "#2563eb" : "#e5e7eb",
              color: filterRating === "all" ? "#fff" : "#374151",
              fontWeight: 500,
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            All Reviews
          </button>
          {[5, 4, 3, 2, 1].map(rating => (
            <button
              key={rating}
              onClick={() => setFilterRating(rating.toString())}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: filterRating === rating.toString() ? "#2563eb" : "#e5e7eb",
                color: filterRating === rating.toString() ? "#fff" : "#374151",
                fontWeight: 500,
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              {rating} ⭐
            </button>
          ))}
        </div>

        {/* Reviews List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ display: "inline-block", width: "48px", height: "48px", border: "4px solid #e5e7eb", borderTopColor: "#2563eb", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", background: "#fff", borderRadius: "12px" }}>
            <FiStar style={{ fontSize: "48px", color: "#d1d5db", margin: "0 auto 16px" }} />
            <p style={{ fontSize: "18px", color: "#6b7280" }}>No reviews found</p>
          </div>
        ) : (
          <div className="reviews-list-grid" style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(2, 1fr)" }}>
            {filteredReviews.map((review) => (
              <article
                key={review._id}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "16px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  border: "1px solid #e5e7eb",
                }}
              >
                {/* Header */}
                <div style={{ marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", marginBottom: "4px" }}>
                    {review.event?.title || "Event"}
                  </h3>
                  <p style={{ fontSize: "14px", color: "#6b7280" }}>
                    {review.user?.name || "Anonymous"}
                  </p>
                </div>

                {/* Rating */}
                <div style={{ marginBottom: "16px" }}>
                  {renderStars(review.rating || 0)}
                </div>

                {/* Review Text */}
                {review.reviewText && (
                  <div style={{ marginBottom: "16px", padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
                    <p style={{ color: "#374151", fontSize: "14px", lineHeight: "1.6" }}>
                      {review.reviewText}
                    </p>
                  </div>
                )}

                {/* Meta Info */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: "#9ca3af" }}>
                  <span>Reviewed on {formatDate(review.createdAt)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section style={{ background: "#2563eb", color: "#fff", padding: "60px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "16px" }}>
          Have you attended an event?
        </h2>
        <p style={{ fontSize: "16px", marginBottom: "24px", opacity: 0.9 }}>
          Share your experience and help others find great events
        </p>
        <button
          onClick={() => navigate("/login")}
          style={{
            padding: "12px 32px",
            background: "#fff",
            color: "#2563eb",
            border: "none",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "16px",
            cursor: "pointer",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
          onMouseLeave={e => e.currentTarget.style.background = "#fff"}
        >
          Login to Write a Review
        </button>
      </section>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 767px) {
          .reviews-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .reviews-list-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .reviews-list-grid article {
            padding: 12px !important;
          }
          .reviews-list-grid h3 {
            font-size: 13px !important;
          }
          .reviews-list-grid p {
            font-size: 11px !important;
          }
        }
        @media (min-width: 768px) {
          .reviews-list-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Reviews;
