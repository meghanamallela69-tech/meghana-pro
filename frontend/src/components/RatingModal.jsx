import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { FaTimes, FaStar } from "react-icons/fa";
import { API_BASE, authHeaders } from "../lib/http";
import useAuth from "../context/useAuth";

const RatingModal = ({ booking, isOpen, onClose, onSuccess }) => {
  const { token } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { toast.error("Please select a rating"); return; }

    setLoading(true);
    try {
      // Submit rating via booking endpoint — this saves rating.score on the booking
      // AND updates the event's average rating in the DB
      await axios.post(
        `${API_BASE}/event-bookings/${booking._id}/rating`,
        { rating, review: review.trim() },
        { headers: authHeaders(token) }
      );

      toast.success("Thank you for your feedback!");
      setRating(0);
      setReview("");
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      console.error("Rating submission error:", error);
      toast.error(error.response?.data?.message || "Failed to submit rating");
    } finally {
      setLoading(false);
    }
  };

  const labels = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent" };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 16, maxWidth: 450, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1f2937" }}>Rate Your Experience</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, borderRadius: 8 }}>
            <FaTimes style={{ fontSize: 20, color: "#6b7280" }} />
          </button>
        </div>

        {/* Event info */}
        <div style={{ padding: "16px 24px", background: "#fef3e6", borderBottom: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#a2783a", margin: 0 }}>{booking.serviceTitle}</h3>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Share your experience to help others</p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {/* Stars */}
          <div style={{ marginBottom: 24, textAlign: "center" }}>
            <label style={{ fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 12, display: "block" }}>Your Rating *</label>
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, transform: (hoverRating || rating) >= star ? "scale(1.2)" : "scale(1)", transition: "transform 0.15s" }}
                >
                  <FaStar style={{ fontSize: 32, color: (hoverRating || rating) >= star ? "#fbbf24" : "#e5e7eb", transition: "color 0.15s" }} />
                </button>
              ))}
            </div>
            {rating > 0 && <p style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }}>{labels[rating]}</p>}
          </div>

          {/* Review text */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 14, fontWeight: 500, color: "#374151", marginBottom: 8, display: "block" }}>Your Review (Optional)</label>
            <textarea
              value={review}
              onChange={e => setReview(e.target.value)}
              placeholder="Share your experience with others..."
              rows={4}
              maxLength={500}
              style={{ width: "100%", padding: "12px 16px", fontSize: 14, border: "1px solid #e5e7eb", borderRadius: 8, outline: "none", resize: "vertical", boxSizing: "border-box" }}
            />
            <div style={{ textAlign: "right", fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{review.length}/500</div>
          </div>

          <button
            type="submit"
            disabled={loading || rating === 0}
            style={{ width: "100%", padding: "14px 24px", background: loading || rating === 0 ? "#9ca3af" : "#a2783a", color: "#fff", fontSize: 16, fontWeight: 600, border: "none", borderRadius: 8, cursor: loading || rating === 0 ? "not-allowed" : "pointer" }}
          >
            {loading ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RatingModal;
